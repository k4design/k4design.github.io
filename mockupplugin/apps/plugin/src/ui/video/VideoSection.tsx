import { useEffect, useRef, useState } from 'react';
import type { RenderTarget } from '@mf/shared';
import { post } from '../bridge.js';
import { VIDEO_FPS_CHOICES, MAX_VIDEO_SECONDS, type VideoFps } from './decode.js';
import { useVideoRender } from './useVideoRender.js';
import { clipGallery } from './gallery.js';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the encoded clip.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * The video slot for one selected mockup: pick a clip, watch the warped result
 * play, download the MP4, and optionally pin the first frame onto the canvas.
 *
 * Figma cannot play video on canvas, so playback lives here in the UI; the
 * canvas gets a still poster via the same apply-render path stills use.
 */
export function VideoSection({
  target,
  apiBase,
  outputWidth,
}: {
  target: RenderTarget;
  apiBase: string;
  outputWidth: number | null;
}) {
  const { phase, run, reset } = useVideoRender();
  const [surfaceId, setSurfaceId] = useState(target.surfaces[0]?.surfaceId ?? '');
  const [fps, setFps] = useState<VideoFps>(24);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const [posterApplied, setPosterApplied] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const surface = target.surfaces.find((s) => s.surfaceId === surfaceId) ?? target.surfaces[0];

  // A finished clip goes straight into the gallery and is offered to
  // clientStorage — that is what keeps it alive after this card unmounts.
  const registered = useRef<string | null>(null);
  useEffect(() => {
    if (phase.kind !== 'ready' || registered.current === phase.id || !surface) return;
    registered.current = phase.id;
    const meta = {
      id: phase.id,
      name: `${target.itemName} · ${surface.surfaceId}`,
      itemId: target.itemId,
      surfaceId: surface.surfaceId,
      seconds: phase.seconds,
      fps: phase.fps,
      width: phase.width,
      height: phase.height,
      bytes: phase.bytes,
      createdAt: Date.now(),
    };
    clipGallery.addSession(meta, phase.blob);
    void blobToBase64(phase.blob).then((mp4) => post({ type: 'clip-save', meta, mp4 }));
  }, [phase, surface, target.itemId, target.itemName]);

  if (!surface) return null;

  const busy = phase.kind === 'working';

  function pickFile(file: File | null) {
    if (!file || !surface) return;
    setPosterApplied(false);
    void run(apiBase, {
      file,
      fps,
      fit,
      itemId: target.itemId,
      surface,
      colorize: target.colorize,
      outputWidth,
    });
  }

  function applyPoster() {
    if (phase.kind !== 'ready') return;
    post({
      type: 'apply-render',
      instanceGuid: target.instanceGuid,
      png: phase.posterPng,
      width: phase.posterWidth,
      height: phase.posterHeight,
      renderId: `video-poster-${Date.now()}`,
    });
    setPosterApplied(true);
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row">
        <span className="muted">Video</span>
        {target.surfaces.length > 1 ? (
          <select
            value={surface.surfaceId}
            disabled={busy}
            onChange={(e) => setSurfaceId(e.target.value)}
          >
            {target.surfaces.map((s) => (
              <option key={s.surfaceId} value={s.surfaceId}>
                {s.surfaceId}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={fps}
          disabled={busy}
          onChange={(e) => setFps(Number(e.target.value) as VideoFps)}
          title="Frames per second"
        >
          {VIDEO_FPS_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice} fps
            </option>
          ))}
        </select>
        <select
          value={fit}
          disabled={busy}
          onChange={(e) => setFit(e.target.value as 'cover' | 'contain')}
          title="How the clip fills the surface"
        >
          <option value="cover">Fill (crop)</option>
          <option value="contain">Fit (letterbox)</option>
        </select>
        <span className="spacer" />
        <button
          className="secondary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {phase.kind === 'ready' ? 'Replace clip…' : 'Choose clip…'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={(e) => {
            pickFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </div>

      <span className="muted">
        Up to {MAX_VIDEO_SECONDS}s. The clip never leaves this machine except as frames sent to
        your render service.
      </span>

      {phase.kind === 'working' ? (
        <>
          {/* The bar tracks encoded frames — the only counter that means
              "done done". The caption shows the pipeline's three stages, which
              run concurrently. */}
          <div className="progress">
            <span style={{ width: `${Math.round((phase.encoded / phase.total) * 100)}%` }} />
          </div>
          <div className="row">
            <span className="muted">
              reading {phase.decoded} · warping {phase.rendered} · encoding {phase.encoded} /{' '}
              {phase.total}
            </span>
            <span className="spacer" />
            <button className="secondary" onClick={reset}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {phase.kind === 'failed' ? <div className="notice error">{phase.message}</div> : null}

      {phase.kind === 'ready' ? (
        <>
          {/* The preview IS the export: one MP4 blob, played here, saved as-is. */}
          <video
            src={phase.url}
            controls
            loop
            autoPlay
            muted
            playsInline
            style={{ width: '100%', borderRadius: 6, background: '#000' }}
          />
          <div className="row">
            <a
              className="mono"
              href={phase.url}
              download={`${target.itemId}-${surface.surfaceId}.mp4`}
            >
              <button className="primary">Download MP4</button>
            </a>
            <button className="secondary" disabled={posterApplied} onClick={applyPoster}>
              {posterApplied ? 'Poster applied' : 'Apply poster to canvas'}
            </button>
            <span className="spacer" />
            <span className="muted">
              {phase.width}×{phase.height} · {phase.seconds.toFixed(1)}s ·{' '}
              {(phase.bytes / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          {phase.warnings.map((message) => (
            <div key={message} className="notice warn">
              {message}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
