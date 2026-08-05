// UI side: settings, video file intake, live preview, compositing, and MP4
// encoding.
//
// IMPORTANT: Figma plugin iframes are not "secure contexts", so the WebCodecs
// API is unavailable. Everything here avoids it:
//   - H.264 encoding: h264-mp4-encoder (pure WebAssembly)
//   - source video decoding: <video> element seek + drawImage
//   - audio: passthrough of the source file's encoded packets (no re-encode),
//     muxed with Mediabunny's packet API (parse-only, no WebCodecs)

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  BufferSource,
  Input,
  ALL_FORMATS,
  BlobSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  EncodedAudioPacketSource,
  type AudioCodec,
} from 'mediabunny';
import type { H264MP4Encoder } from 'h264-mp4-encoder';

// h264-mp4-encoder's web build is a plain script that defines a global `HME`;
// the build script prepends it to this bundle.
declare const HME: { createH264MP4Encoder(): Promise<H264MP4Encoder> };
const { createH264MP4Encoder } = HME;

interface VideoLayerInfo {
  nodeId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  scaleMode: string;
}

interface FrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  videoLayer: VideoLayerInfo | null;
  extraVideoCount: number;
}

interface FrameState extends FrameInfo {
  include: boolean;
  holdSeconds: number;
  videoFile: File | null;
}

const $ = (id: string) => document.getElementById(id)!;

let frames: FrameState[] = [];
let busy = false; // an export or preview is running
let cancelRequested = false;

// ---------- messaging with the sandbox ----------

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };
const pending = new Map<string, Pending>();

function request<T>(key: string, msg: object): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending.set(key, { resolve, reject });
    parent.postMessage({ pluginMessage: msg }, '*');
  });
}

window.onmessage = (event: MessageEvent) => {
  const msg = event.data && event.data.pluginMessage;
  if (!msg) return;
  if (msg.type === 'frames') {
    if (!busy) mergeFrames(msg.frames as FrameInfo[]);
  } else if (msg.type === 'frame-png') {
    pending.get(`png:${msg.frameId}`)?.resolve(msg.png);
    pending.delete(`png:${msg.frameId}`);
  } else if (msg.type === 'frame-layers') {
    pending.get(`layers:${msg.frameId}`)?.resolve({ below: msg.below, above: msg.above });
    pending.delete(`layers:${msg.frameId}`);
  } else if (msg.type === 'error') {
    for (const [, p] of pending) p.reject(new Error(msg.message));
    pending.clear();
    fail(msg.message);
  }
};

function notify(message: string, error = false) {
  parent.postMessage({ pluginMessage: { type: 'notify', message, error } }, '*');
}

// ---------- frame list UI ----------

function mergeFrames(fresh: FrameInfo[]) {
  const old = new Map(frames.map((f) => [f.id, f]));
  frames = fresh.map((f) => {
    const prev = old.get(f.id);
    return {
      ...f,
      include: prev ? prev.include : true,
      holdSeconds: prev ? prev.holdSeconds : 3,
      videoFile: prev ? prev.videoFile : null,
    };
  });
  renderFrameList();
}

function renderFrameList() {
  const list = $('frame-list');
  list.innerHTML = '';
  if (frames.length === 0) {
    list.innerHTML = '<div class="empty">Select frames on the canvas (or leave nothing selected to use every frame on the page).</div>';
    return;
  }
  frames.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'frame-row' + (f.include ? '' : ' excluded');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = f.include;
    check.onchange = () => { f.include = check.checked; renderFrameList(); };

    const info = document.createElement('div');
    info.className = 'frame-info';
    const title = document.createElement('div');
    title.className = 'frame-name';
    title.textContent = `${i + 1}. ${f.name}`;
    const meta = document.createElement('div');
    meta.className = 'frame-meta';
    meta.textContent = `${Math.round(f.width)}×${Math.round(f.height)}`;
    info.append(title, meta);

    const controls = document.createElement('div');
    controls.className = 'frame-controls';

    if (f.videoLayer) {
      const badge = document.createElement('div');
      badge.className = 'video-badge' + (f.videoFile ? ' ok' : '');
      badge.textContent = f.videoFile
        ? `🎬 ${f.videoFile.name}`
        : `🎬 video layer “${f.videoLayer.name}” — drop the source file`;
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/mp4,video/quicktime,video/webm';
      fileInput.onchange = () => {
        f.videoFile = fileInput.files?.[0] ?? null;
        renderFrameList();
      };
      const pickBtn = document.createElement('button');
      pickBtn.className = 'small';
      pickBtn.textContent = f.videoFile ? 'Change file' : 'Choose video file';
      pickBtn.onclick = () => fileInput.click();
      controls.append(badge, pickBtn);
      if (f.extraVideoCount > 0) {
        const warn = document.createElement('div');
        warn.className = 'warn';
        warn.textContent = `⚠ ${f.extraVideoCount} more video layer(s) in this frame will export as static images.`;
        controls.append(warn);
      }
    } else {
      const hold = document.createElement('label');
      hold.className = 'hold';
      hold.textContent = 'Hold ';
      const holdInput = document.createElement('input');
      holdInput.type = 'number';
      holdInput.min = '0.1';
      holdInput.step = '0.5';
      holdInput.value = String(f.holdSeconds);
      holdInput.onchange = () => { f.holdSeconds = Math.max(0.1, Number(holdInput.value) || 3); };
      hold.append(holdInput, document.createTextNode(' s'));
      controls.append(hold);
    }

    row.append(check, info, controls);
    list.append(row);
  });
}

// ---------- compositing helpers ----------

async function bitmapFromPng(bytes: Uint8Array): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' }));
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawContain(ctx: CanvasRenderingContext2D, img: ImageBitmap, W: number, H: number) {
  const s = Math.min(W / img.width, H / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error(`Can't decode “${file.name}” — is it an MP4/MOV/WebM?`));
  });
}

function seekTo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.min(t, Math.max(0, v.duration - 0.001));
    if (Math.abs(v.currentTime - target) < 0.0001 && v.readyState >= 2) { resolve(); return; }
    const done = () => { v.removeEventListener('seeked', done); resolve(); };
    v.addEventListener('seeked', done);
    v.currentTime = target;
  });
}

// ---------- shared segment gathering ----------

interface Segment {
  frame: FrameState;
  duration: number;
  // static frames
  flat?: ImageBitmap;
  // video frames
  below?: ImageBitmap;
  above?: ImageBitmap | null;
  video?: HTMLVideoElement;
  file?: File;
}

// Pull the pixel layers for every included frame out of Figma at the given
// scale. Used by both the pre-render preview and the actual export.
async function gatherSegments(
  included: FrameState[],
  scale: number,
  progress: (pct: number, label: string) => void
): Promise<Segment[]> {
  const segments: Segment[] = [];
  for (let i = 0; i < included.length; i++) {
    if (cancelRequested) throw new Error('Cancelled');
    const f = included[i];
    progress(i / included.length, `Exporting “${f.name}” from Figma…`);
    if (f.videoLayer && f.videoFile) {
      const layers = await request<{ below: Uint8Array; above: Uint8Array | null }>(
        `layers:${f.id}`,
        { type: 'export-frame-layers', frameId: f.id, videoNodeId: f.videoLayer.nodeId, scale }
      );
      const below = await bitmapFromPng(layers.below);
      const above = layers.above ? await bitmapFromPng(layers.above) : null;
      const video = await loadVideo(f.videoFile);
      segments.push({ frame: f, duration: video.duration, below, above, video, file: f.videoFile });
    } else {
      const png = await request<Uint8Array>(`png:${f.id}`, {
        type: 'export-frame', frameId: f.id, scale,
      });
      segments.push({ frame: f, duration: f.holdSeconds, flat: await bitmapFromPng(png) });
    }
  }
  return segments;
}

function disposeSegments(segments: Segment[]) {
  for (const seg of segments) {
    seg.flat?.close();
    seg.below?.close();
    seg.above?.close();
    if (seg.video) {
      seg.video.pause();
      URL.revokeObjectURL(seg.video.src);
    }
  }
}

// Draw one segment's content at a local time into ctx. `videoReady` tells us
// the video element is already positioned (seeked or playing) at that time.
function drawSegment(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  scale: number,
  W: number,
  H: number
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (seg.flat) {
    drawContain(ctx, seg.flat, W, H);
    return;
  }
  if (!seg.below || !seg.video || !seg.frame.videoLayer) return;
  drawContain(ctx, seg.below, W, H);
  const vl = seg.frame.videoLayer;
  const dx = vl.x * scale;
  const dy = vl.y * scale;
  const dw = Math.max(2, vl.width * scale);
  const dh = Math.max(2, vl.height * scale);
  const r = vl.cornerRadius * scale;
  const cover = vl.scaleMode !== 'FIT';
  const vw = seg.video.videoWidth || 1;
  const vh = seg.video.videoHeight || 1;
  const s = cover ? Math.max(dw / vw, dh / vh) : Math.min(dw / vw, dh / vh);
  const sw = vw * s;
  const sh = vh * s;
  ctx.save();
  if (r > 0) roundRectPath(ctx, dx, dy, dw, dh, r);
  else { ctx.beginPath(); ctx.rect(dx, dy, dw, dh); }
  ctx.clip();
  ctx.drawImage(seg.video, dx + (dw - sw) / 2, dy + (dh - sh) / 2, sw, sh);
  ctx.restore();
  if (seg.above) drawContain(ctx, seg.above, W, H);
}

// ---------- progress / status UI ----------

function setProgress(pct: number, label: string) {
  ($('progress-bar') as HTMLElement).style.width = `${Math.round(pct * 100)}%`;
  $('progress-label').textContent = label;
  $('progress-wrap').style.display = 'block';
}

function setBusy(on: boolean) {
  busy = on;
  ($('export-btn') as HTMLButtonElement).disabled = on;
  ($('preview-btn') as HTMLButtonElement).disabled = on;
  ($('cancel-btn') as HTMLButtonElement).style.display = on ? 'inline-block' : 'none';
  if (!on) cancelRequested = false;
}

function fail(message: string) {
  setBusy(false);
  $('progress-label').textContent = `Error: ${message}`;
  $('progress-wrap').style.display = 'block';
  notify(`Export failed: ${message}`, true);
}

function validateSelection(): FrameState[] | null {
  const included = frames.filter((f) => f.include);
  if (included.length === 0) { fail('No frames selected.'); return null; }
  const missing = included.filter((f) => f.videoLayer && !f.videoFile);
  if (missing.length > 0) {
    fail(`“${missing[0].name}” has a video layer — choose its source file first.`);
    return null;
  }
  return included;
}

// ---------- pre-render preview (play/pause + scrubbable timeline) ----------

const PREVIEW_WIDTH = 388;
const SCRUB_MAX = 1000; // slider resolution

interface PreviewSession {
  segments: Segment[];
  starts: number[]; // cumulative start time of each segment
  total: number;
  scale: number;
  W: number;
  H: number;
  ctx: CanvasRenderingContext2D;
  fade: number;
  endFrames: (ImageBitmap | null)[]; // cached last frame per segment, for crossfades
  t: number;
  playing: boolean;
  raf: number;
  tStart: number;
  clockStart: number;
  activeSeg: number;
  rendering: boolean;
}

let preview: PreviewSession | null = null;

function segAt(p: PreviewSession, t: number): { si: number; local: number } {
  for (let si = 0; si < p.segments.length; si++) {
    const end = p.starts[si] + p.segments[si].duration;
    if (t < end || si === p.segments.length - 1) {
      return { si, local: Math.min(Math.max(0, t - p.starts[si]), p.segments[si].duration) };
    }
  }
  return { si: 0, local: 0 };
}

// Last rendered frame of a segment, cached — needed to draw crossfades when
// scrubbing to an arbitrary time.
async function segmentEndFrame(p: PreviewSession, si: number): Promise<ImageBitmap | null> {
  if (p.endFrames[si]) return p.endFrames[si];
  const seg = p.segments[si];
  const off = document.createElement('canvas');
  off.width = p.W;
  off.height = p.H;
  const octx = off.getContext('2d')!;
  if (seg.video) await seekTo(seg.video, seg.duration);
  drawSegment(octx, seg, p.scale, p.W, p.H);
  p.endFrames[si] = await createImageBitmap(off);
  return p.endFrames[si];
}

async function drawPreviewAt(t: number, seekVideo: boolean) {
  const p = preview;
  if (!p || p.rendering) return;
  p.rendering = true;
  try {
    const { si, local } = segAt(p, t);
    const seg = p.segments[si];
    if (seg.video && seekVideo) await seekTo(seg.video, local);
    drawSegment(p.ctx, seg, p.scale, p.W, p.H);
    if (si > 0 && p.fade > 0 && local < p.fade) {
      const prevEnd = await segmentEndFrame(p, si - 1);
      if (prevEnd) {
        p.ctx.save();
        p.ctx.globalAlpha = 1 - local / p.fade;
        p.ctx.drawImage(prevEnd, 0, 0, p.W, p.H);
        p.ctx.restore();
      }
    }
  } finally {
    p.rendering = false;
  }
}

function updatePreviewClock(t: number) {
  const p = preview!;
  ($('preview-scrub') as HTMLInputElement).value = String(Math.round((t / p.total) * SCRUB_MAX));
  $('preview-time').textContent = `${t.toFixed(1)} / ${p.total.toFixed(1)}s`;
}

function previewPause() {
  const p = preview;
  if (!p) return;
  p.playing = false;
  cancelAnimationFrame(p.raf);
  for (const s of p.segments) s.video?.pause();
  ($('preview-play') as HTMLButtonElement).textContent = '▶';
}

async function previewPlay() {
  const p = preview;
  if (!p) return;
  if (p.t >= p.total - 0.02) p.t = 0; // replay from the start
  p.playing = true;
  ($('preview-play') as HTMLButtonElement).textContent = '⏸';
  p.tStart = p.t;
  p.clockStart = performance.now();
  p.activeSeg = -1;

  const tick = async () => {
    if (!preview || !p.playing) return;
    p.t = p.tStart + (performance.now() - p.clockStart) / 1000;
    if (p.t >= p.total) {
      p.t = p.total;
      updatePreviewClock(p.t);
      await drawPreviewAt(p.t, true);
      previewPause();
      return;
    }
    const { si, local } = segAt(p, p.t);
    if (si !== p.activeSeg) {
      // entering a new segment: line its video up with the clock and play it
      if (p.activeSeg >= 0) p.segments[p.activeSeg].video?.pause();
      const v = p.segments[si].video;
      if (v) {
        v.currentTime = local;
        v.play().catch(() => { /* stills if playback is blocked */ });
      }
      p.activeSeg = si;
      void segmentEndFrame(p, si); // warm the crossfade cache for the next boundary
    }
    // while playing, the video element advances on its own — no seeking
    await drawPreviewAt(p.t, false);
    updatePreviewClock(p.t);
    p.raf = requestAnimationFrame(() => { void tick(); });
  };
  p.raf = requestAnimationFrame(() => { void tick(); });
}

function closePreview() {
  if (!preview) return;
  previewPause();
  disposeSegments(preview.segments);
  for (const b of preview.endFrames) b?.close();
  preview = null;
  $('preview-controls').style.display = 'none';
}

// Gathers the frames at preview scale and opens the scrubbable player.
async function runPreview() {
  const included = validateSelection();
  if (!included) return;
  closePreview();
  setBusy(true);

  const canvas = $('preview-canvas') as HTMLCanvasElement;
  const video = $('preview-video') as HTMLVideoElement;
  let segments: Segment[] = [];
  try {
    // Small render scale: enough for the preview box, cheap to export
    const scale = Math.min(1, PREVIEW_WIDTH / included[0].width);
    segments = await gatherSegments(included, scale, (p, l) => setProgress(p, l));

    const W = Math.round(included[0].width * scale);
    const H = Math.round(included[0].height * scale);
    $('preview-wrap').classList.add('open');
    video.style.display = 'none';
    video.pause();
    canvas.style.display = 'block';
    canvas.width = W;
    canvas.height = H;
    $('preview-label').textContent = 'Preview';
    $('preview-controls').style.display = 'flex';

    const starts: number[] = [];
    let acc = 0;
    for (const s of segments) { starts.push(acc); acc += s.duration; }

    preview = {
      segments,
      starts,
      total: acc,
      scale,
      W,
      H,
      ctx: canvas.getContext('2d')!,
      fade: Number(($('fade') as HTMLSelectElement).value),
      endFrames: segments.map(() => null),
      t: 0,
      playing: false,
      raf: 0,
      tStart: 0,
      clockStart: 0,
      activeSeg: -1,
      rendering: false,
    };
    setProgress(1, `Preview ready — ${acc.toFixed(1)}s. Scrub the timeline or press play.`);
    setBusy(false);
    await drawPreviewAt(0, true);
    updatePreviewClock(0);
    void previewPlay();
  } catch (err: any) {
    disposeSegments(segments);
    preview = null;
    if (err?.message === 'Cancelled') {
      setBusy(false);
      setProgress(0, 'Preview cancelled.');
    } else {
      fail(err?.message || String(err));
    }
  }
}

// ---------- audio mux (passthrough, no re-encode) ----------

async function muxAudio(
  videoMp4: Uint8Array,
  audioSegs: { file: File; offset: number; duration: number }[],
  fps: number
): Promise<Uint8Array | null> {
  const videoInput = new Input({
    formats: ALL_FORMATS,
    source: new BufferSource(videoMp4.buffer as ArrayBuffer),
  });
  const vTrack = await videoInput.getPrimaryVideoTrack();
  if (!vTrack) return null;

  const inputs: { input: Input; offset: number; duration: number }[] = [];
  let codec: AudioCodec | null = null;
  for (const seg of audioSegs) {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(seg.file) });
    const aTrack = await input.getPrimaryAudioTrack();
    if (!aTrack || !aTrack.codec) continue;
    if (codec === null) codec = aTrack.codec;
    if (aTrack.codec !== codec) continue; // mixed codecs: keep first codec only
    inputs.push({ input, offset: seg.offset, duration: seg.duration });
  }
  if (codec === null || inputs.length === 0) return null;

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const vSource = new EncodedVideoPacketSource('avc');
  output.addVideoTrack(vSource, { frameRate: fps });
  const aSource = new EncodedAudioPacketSource(codec);
  output.addAudioTrack(aSource);
  await output.start();

  const vConfig = await vTrack.getDecoderConfig();
  let firstV = true;
  for await (const packet of new EncodedPacketSink(vTrack).packets()) {
    await vSource.add(packet, firstV && vConfig ? { decoderConfig: vConfig } : undefined);
    firstV = false;
  }

  let firstA = true;
  for (const { input, offset, duration } of inputs) {
    const aTrack = (await input.getPrimaryAudioTrack())!;
    const aConfig = await aTrack.getDecoderConfig();
    for await (const packet of new EncodedPacketSink(aTrack).packets()) {
      if (packet.timestamp >= duration) break;
      const shifted = packet.clone({ timestamp: packet.timestamp + offset });
      await aSource.add(shifted, firstA && aConfig ? { decoderConfig: aConfig } : undefined);
      firstA = false;
    }
  }

  vSource.close();
  aSource.close();
  await output.finalize();
  return new Uint8Array((output.target as BufferTarget).buffer!);
}

// ---------- export ----------

let lastExportUrl: string | null = null;

async function runExport() {
  const included = validateSelection();
  if (!included) return;
  if (typeof WebAssembly === 'undefined') {
    fail('WebAssembly is not available in this environment.');
    return;
  }
  closePreview();
  setBusy(true);

  const fps = Number(($('fps') as HTMLSelectElement).value);
  const scale = Number(($('scale') as HTMLSelectElement).value);
  const fade = Number(($('fade') as HTMLSelectElement).value);

  let segments: Segment[] = [];
  let encoder: H264MP4Encoder | null = null;
  try {
    // Output dimensions: first frame, rounded down to even (H.264 requirement)
    let W = Math.floor(included[0].width * scale);
    let H = Math.floor(included[0].height * scale);
    W -= W % 2;
    H -= H % 2;

    // 1) Gather assets per segment
    segments = await gatherSegments(included, scale, (p, l) => setProgress(p * 0.2, l));

    // 2) Set up the WASM encoder
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    encoder = await createH264MP4Encoder();
    encoder.width = W;
    encoder.height = H;
    encoder.frameRate = fps;
    encoder.speed = 5;
    encoder.quantizationParameter = 26; // lower = better quality; 26 ≈ visually clean
    encoder.initialize();

    // 3) Render every output frame
    const frameDur = 1 / fps;
    const totalDur = segments.reduce((a, s) => a + s.duration, 0);
    const totalFrames = Math.max(1, Math.round(totalDur * fps));
    let framesDone = 0;
    let elapsed = 0;
    let prevSnapshot: ImageBitmap | null = null;
    const audioSegs: { file: File; offset: number; duration: number }[] = [];

    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      const segFrames = Math.max(1, Math.round(seg.duration * fps));
      const fadeFrames = si > 0 && fade > 0 ? Math.min(Math.round(fade * fps), segFrames) : 0;

      if (seg.video && seg.frame.videoLayer) {
        audioSegs.push({ file: seg.file!, offset: elapsed, duration: seg.duration });
      }

      for (let fi = 0; fi < segFrames; fi++) {
        if (cancelRequested) throw new Error('Cancelled');
        const local = fi * frameDur;
        if (seg.video) await seekTo(seg.video, local);
        drawSegment(ctx, seg, scale, W, H);

        if (fadeFrames > 0 && fi < fadeFrames && prevSnapshot) {
          ctx.save();
          ctx.globalAlpha = 1 - (fi + 1) / (fadeFrames + 1);
          ctx.drawImage(prevSnapshot, 0, 0, W, H);
          ctx.restore();
        }

        encoder.addFrameRgba(ctx.getImageData(0, 0, W, H).data);
        framesDone++;
        if (framesDone % 10 === 0) {
          setProgress(0.2 + (framesDone / totalFrames) * 0.7, `Encoding frame ${framesDone}/${totalFrames}…`);
          await new Promise((r) => setTimeout(r, 0)); // keep UI alive
        }
      }
      elapsed += segFrames * frameDur;

      prevSnapshot?.close();
      prevSnapshot = await createImageBitmap(canvas);
    }

    prevSnapshot?.close();

    setProgress(0.92, 'Finalizing video…');
    await new Promise((r) => setTimeout(r, 0));
    encoder.finalize();
    let mp4 = encoder.FS.readFile(encoder.outputFilename) as Uint8Array;
    encoder.delete();
    encoder = null;

    // 4) Mux in audio from the source video(s), if any
    if (audioSegs.length > 0) {
      setProgress(0.96, 'Adding audio…');
      try {
        const withAudio = await muxAudio(mp4, audioSegs, fps);
        if (withAudio) mp4 = withAudio;
      } catch (e) {
        console.warn('Audio mux failed, exporting silent video:', e);
        notify('Audio could not be carried over — exported silent video.', true);
      }
    }

    // 5) Download + load into the preview player
    const blob = new Blob([mp4.buffer as ArrayBuffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figma-export.mp4';
    a.click();
    if (lastExportUrl) URL.revokeObjectURL(lastExportUrl);
    lastExportUrl = url;
    const canvasEl = $('preview-canvas') as HTMLCanvasElement;
    const videoEl = $('preview-video') as HTMLVideoElement;
    $('preview-wrap').classList.add('open');
    canvasEl.style.display = 'none';
    videoEl.style.display = 'block';
    videoEl.src = url;
    $('preview-label').textContent = 'Exported video';

    setProgress(1, `Done — ${(blob.size / 1e6).toFixed(1)} MB, ${totalDur.toFixed(1)}s`);
    notify('MP4 exported ✔');
  } catch (err: any) {
    try { encoder?.delete(); } catch { /* already gone */ }
    disposeSegments(segments);
    if (err?.message === 'Cancelled') {
      setBusy(false);
      setProgress(0, 'Export cancelled.');
      notify('Export cancelled');
    } else {
      console.error(err);
      fail(err?.message || String(err));
    }
    return;
  }
  disposeSegments(segments);
  setBusy(false);
}

// ---------- boot ----------

$('export-btn').onclick = () => { if (!busy) runExport(); };
$('preview-btn').onclick = () => { if (!busy) runPreview(); };
$('cancel-btn').onclick = () => { cancelRequested = true; };
$('preview-play').onclick = () => {
  if (!preview) return;
  if (preview.playing) previewPause();
  else void previewPlay();
};
$('preview-scrub').oninput = () => {
  if (!preview) return;
  previewPause();
  const frac = Number(($('preview-scrub') as HTMLInputElement).value) / SCRUB_MAX;
  preview.t = frac * preview.total;
  $('preview-time').textContent = `${preview.t.toFixed(1)} / ${preview.total.toFixed(1)}s`;
  void drawPreviewAt(preview.t, true);
};
$('refresh-btn').onclick = () => parent.postMessage({ pluginMessage: { type: 'get-frames' } }, '*');

// Drag the grip at the bottom of the panel to resize the plugin window
{
  const handle = $('resize-handle');
  let startY = 0;
  let startH = 0;
  let raf = 0;
  const onMove = (e: PointerEvent) => {
    const h = startH + (e.screenY - startY);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      parent.postMessage({ pluginMessage: { type: 'resize', height: h } }, '*');
    });
  };
  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    startY = e.screenY;
    startH = window.innerHeight;
    handle.setPointerCapture(e.pointerId);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener(
      'pointerup',
      () => handle.removeEventListener('pointermove', onMove),
      { once: true }
    );
  });
}

parent.postMessage({ pluginMessage: { type: 'get-frames' } }, '*');
