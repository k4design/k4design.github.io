// UI side: settings, video file intake, compositing, and MP4 encoding
// (WebCodecs via Mediabunny) — all in the plugin iframe, no network.

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  Input,
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
} from 'mediabunny';

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
  const msg = event.data.pluginMessage;
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

// Draw a bitmap contain-fit into the output canvas
function drawContain(ctx: CanvasRenderingContext2D, img: ImageBitmap, W: number, H: number) {
  const s = Math.min(W / img.width, H / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
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
  videoInput?: Input;
  audio?: AudioBuffer | null;
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
  notify(`Export failed: ${message}`, true);
}

async function runExport() {
  const included = frames.filter((f) => f.include);
  if (included.length === 0) { fail('No frames selected.'); return; }
  const missing = included.filter((f) => f.videoLayer && !f.videoFile);
  if (missing.length > 0) {
    fail(`“${missing[0].name}” has a video layer — choose its source file first.`);
    return;
  }
  if (typeof VideoEncoder === 'undefined') {
    fail('WebCodecs unavailable — this page must be served over HTTPS (is GitHub Pages up to date?).');
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
      setProgress((i / included.length) * 0.3, `Exporting “${f.name}” from Figma…`);
      if (f.videoLayer && f.videoFile) {
        const layers = await request<{ below: Uint8Array; above: Uint8Array | null }>(
          `layers:${f.id}`,
          { type: 'export-frame-layers', frameId: f.id, videoNodeId: f.videoLayer.nodeId, scale }
        );
        const below = await bitmapFromPng(layers.below);
        const above = layers.above ? await bitmapFromPng(layers.above) : null;
        const videoInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(f.videoFile) });
        const duration = await videoInput.computeDuration();
        let audio: AudioBuffer | null = null;
        try {
          const ac = new AudioContext();
          audio = await ac.decodeAudioData(await f.videoFile.arrayBuffer());
          await ac.close();
        } catch {
          audio = null; // silent video, or codec WebAudio can't decode
        }
        segments.push({ frame: f, duration, below, above, videoInput, audio });
      } else {
        const png = await request<Uint8Array>(`png:${f.id}`, {
          type: 'export-frame', frameId: f.id, scale,
        });
        segments.push({ frame: f, duration: f.holdSeconds, flat: await bitmapFromPng(png) });
      }
    }

    // 2) Set up encoder
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const videoSource = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: fps });

    const hasAudio = segments.some((s) => s.audio);
    const sampleRate = hasAudio ? segments.find((s) => s.audio)!.audio!.sampleRate : 48000;
    let audioSource: AudioBufferSource | null = null;
    if (hasAudio) {
      audioSource = new AudioBufferSource({ codec: 'aac', bitrate: QUALITY_MEDIUM });
      output.addAudioTrack(audioSource);
    }

    await output.start();

    // 3) Render every output frame
    const frameDur = 1 / fps;
    const totalDur = segments.reduce((a, s) => a + s.duration, 0);
    const totalFrames = Math.max(1, Math.round(totalDur * fps));
    let t = 0; // global timestamp
    let framesDone = 0;
    let prevSnapshot: ImageBitmap | null = null; // last frame of previous segment, for crossfade

    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      const segFrames = Math.max(1, Math.round(seg.duration * fps));
      const fadeFrames = si > 0 && fade > 0 ? Math.min(Math.round(fade * fps), segFrames) : 0;

      // Video segment setup: iterate decoded canvases in display order
      let vIter: AsyncIterator<{ canvas: HTMLCanvasElement | OffscreenCanvas; timestamp: number } | any> | null = null;
      let vCur: any = null;
      let vNext: any = null;
      let vDraw: { dx: number; dy: number; dw: number; dh: number; r: number } | null = null;

      if (seg.videoInput && seg.frame.videoLayer) {
        const vl = seg.frame.videoLayer;
        const dx = vl.x * scale, dy = vl.y * scale;
        const dw = Math.max(2, Math.round(vl.width * scale));
        const dh = Math.max(2, Math.round(vl.height * scale));
        vDraw = { dx, dy, dw, dh, r: vl.cornerRadius * scale };
        const track = await seg.videoInput.getPrimaryVideoTrack();
        if (!track) throw new Error(`No video track in file for “${seg.frame.name}”.`);
        const fit = vl.scaleMode === 'FIT' ? 'contain' : 'cover';
        const sink = new CanvasSink(track, { width: dw, height: dh, fit, poolSize: 2 });
        vIter = sink.canvases()[Symbol.asyncIterator]();
        vCur = await vIter.next();
        vNext = await vIter.next();
      }

      for (let fi = 0; fi < segFrames; fi++) {
        const local = fi * frameDur;

        // draw current segment content
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (seg.flat) {
          drawContain(ctx, seg.flat, W, H);
        } else if (seg.below && vDraw) {
          drawContain(ctx, seg.below, W, H);
          if (vIter && !vCur.done) {
            while (vNext && !vNext.done && vNext.value.timestamp <= local) {
              vCur = vNext;
              vNext = await vIter.next();
            }
            ctx.save();
            if (vDraw.r > 0) { roundRectPath(ctx, vDraw.dx, vDraw.dy, vDraw.dw, vDraw.dh, vDraw.r); ctx.clip(); }
            else { ctx.beginPath(); ctx.rect(vDraw.dx, vDraw.dy, vDraw.dw, vDraw.dh); ctx.clip(); }
            ctx.drawImage(vCur.value.canvas, vDraw.dx, vDraw.dy, vDraw.dw, vDraw.dh);
            ctx.restore();
          }
          if (seg.above) drawContain(ctx, seg.above, W, H);
        }

        // crossfade from previous segment
        if (fadeFrames > 0 && fi < fadeFrames && prevSnapshot) {
          ctx.save();
          ctx.globalAlpha = 1 - (fi + 1) / (fadeFrames + 1);
          ctx.drawImage(prevSnapshot, 0, 0, W, H);
          ctx.restore();
        }

        await videoSource.add(t, frameDur);
        t += frameDur;
        framesDone++;
        if (framesDone % 15 === 0) {
          setProgress(0.3 + (framesDone / totalFrames) * 0.65, `Encoding frame ${framesDone}/${totalFrames}…`);
          await new Promise((r) => setTimeout(r, 0)); // keep UI alive
        }
      }

      // snapshot last rendered frame for the next segment's crossfade
      prevSnapshot?.close();
      prevSnapshot = await createImageBitmap(canvas);

      // audio for this segment: decoded audio (trim/pad) or silence
      if (audioSource) {
        const segSamples = Math.max(1, Math.round(seg.duration * sampleRate));
        const channels = seg.audio ? seg.audio.numberOfChannels : 2;
        const buf = new AudioBuffer({ length: segSamples, numberOfChannels: channels, sampleRate });
        if (seg.audio) {
          const src = seg.audio;
          for (let ch = 0; ch < channels; ch++) {
            const dst = buf.getChannelData(ch);
            const srcData = src.getChannelData(Math.min(ch, src.numberOfChannels - 1));
            if (src.sampleRate === sampleRate) {
              dst.set(srcData.subarray(0, Math.min(srcData.length, segSamples)));
            } else {
              const ratio = src.sampleRate / sampleRate;
              const n = Math.min(segSamples, Math.floor(srcData.length / ratio));
              for (let s = 0; s < n; s++) dst[s] = srcData[Math.floor(s * ratio)];
            }
          }
        }
        await audioSource.add(buf);
      }

      seg.flat?.close();
      seg.below?.close();
      seg.above?.close();
      if (seg.videoInput) seg.videoInput.dispose?.();
    }

    prevSnapshot?.close();
    videoSource.close();
    audioSource?.close();

    setProgress(0.97, 'Finalizing MP4…');
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer!;

    // 4) Download
    const blob = new Blob([buffer], { type: 'video/mp4' });
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
