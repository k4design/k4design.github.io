// UI side: settings, video file intake, compositing, and MP4 encoding.
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
let exporting = false;

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
    if (!exporting) mergeFrames(msg.frames as FrameInfo[]);
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

// ---------- export pipeline ----------

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

function setProgress(pct: number, label: string) {
  ($('progress-bar') as HTMLElement).style.width = `${Math.round(pct * 100)}%`;
  $('progress-label').textContent = label;
  $('progress-wrap').style.display = 'block';
}

function fail(message: string) {
  exporting = false;
  ($('export-btn') as HTMLButtonElement).disabled = false;
  $('progress-label').textContent = `Error: ${message}`;
  $('progress-wrap').style.display = 'block';
  notify(`Export failed: ${message}`, true);
}

// Mux audio from the source video files into the encoded MP4 without
// re-encoding: copy the encoded audio packets, shifted to each video
// segment's position on the timeline.
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

  // Probe audio tracks; all segments must share the first one's codec
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

async function runExport() {
  const included = frames.filter((f) => f.include);
  if (included.length === 0) { fail('No frames selected.'); return; }
  const missing = included.filter((f) => f.videoLayer && !f.videoFile);
  if (missing.length > 0) {
    fail(`“${missing[0].name}” has a video layer — choose its source file first.`);
    return;
  }
  if (typeof WebAssembly === 'undefined') {
    fail('WebAssembly is not available in this environment.');
    return;
  }

  exporting = true;
  ($('export-btn') as HTMLButtonElement).disabled = true;

  const fps = Number(($('fps') as HTMLSelectElement).value);
  const scale = Number(($('scale') as HTMLSelectElement).value);
  const fade = Number(($('fade') as HTMLSelectElement).value);

  try {
    // Output dimensions: first frame, rounded down to even (H.264 requirement)
    let W = Math.floor(included[0].width * scale);
    let H = Math.floor(included[0].height * scale);
    W -= W % 2;
    H -= H % 2;

    // 1) Gather assets per segment
    const segments: Segment[] = [];
    for (let i = 0; i < included.length; i++) {
      const f = included[i];
      setProgress((i / included.length) * 0.2, `Exporting “${f.name}” from Figma…`);
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

    // 2) Set up the WASM encoder
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const encoder = await createH264MP4Encoder();
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

      let vDraw: { dx: number; dy: number; dw: number; dh: number; r: number; cover: boolean } | null = null;
      if (seg.video && seg.frame.videoLayer) {
        const vl = seg.frame.videoLayer;
        vDraw = {
          dx: vl.x * scale,
          dy: vl.y * scale,
          dw: Math.max(2, vl.width * scale),
          dh: Math.max(2, vl.height * scale),
          r: vl.cornerRadius * scale,
          cover: vl.scaleMode !== 'FIT',
        };
        audioSegs.push({ file: seg.file!, offset: elapsed, duration: seg.duration });
      }

      for (let fi = 0; fi < segFrames; fi++) {
        const local = fi * frameDur;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (seg.flat) {
          drawContain(ctx, seg.flat, W, H);
        } else if (seg.below && seg.video && vDraw) {
          drawContain(ctx, seg.below, W, H);
          await seekTo(seg.video, local);
          const vw = seg.video.videoWidth || 1;
          const vh = seg.video.videoHeight || 1;
          const s = vDraw.cover
            ? Math.max(vDraw.dw / vw, vDraw.dh / vh)
            : Math.min(vDraw.dw / vw, vDraw.dh / vh);
          const sw = vw * s;
          const sh = vh * s;
          ctx.save();
          if (vDraw.r > 0) roundRectPath(ctx, vDraw.dx, vDraw.dy, vDraw.dw, vDraw.dh, vDraw.r);
          else { ctx.beginPath(); ctx.rect(vDraw.dx, vDraw.dy, vDraw.dw, vDraw.dh); }
          ctx.clip();
          ctx.drawImage(
            seg.video,
            vDraw.dx + (vDraw.dw - sw) / 2,
            vDraw.dy + (vDraw.dh - sh) / 2,
            sw,
            sh
          );
          ctx.restore();
          if (seg.above) drawContain(ctx, seg.above, W, H);
        }

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

      seg.flat?.close();
      seg.below?.close();
      seg.above?.close();
      if (seg.video) URL.revokeObjectURL(seg.video.src);
    }

    prevSnapshot?.close();

    setProgress(0.92, 'Finalizing video…');
    await new Promise((r) => setTimeout(r, 0));
    encoder.finalize();
    let mp4 = encoder.FS.readFile(encoder.outputFilename) as Uint8Array;
    encoder.delete();

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

    // 5) Download
    const blob = new Blob([mp4.buffer as ArrayBuffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figma-export.mp4';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setProgress(1, `Done — ${(blob.size / 1e6).toFixed(1)} MB, ${totalDur.toFixed(1)}s`);
    notify('MP4 exported ✔');
  } catch (err: any) {
    console.error(err);
    fail(err?.message || String(err));
    return;
  }
  exporting = false;
  ($('export-btn') as HTMLButtonElement).disabled = false;
}

// ---------- boot ----------

$('export-btn').onclick = () => { if (!exporting) runExport(); };
$('refresh-btn').onclick = () => parent.postMessage({ pluginMessage: { type: 'get-frames' } }, '*');
parent.postMessage({ pluginMessage: { type: 'get-frames' } }, '*');
