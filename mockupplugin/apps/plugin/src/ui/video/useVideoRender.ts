import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_FRAMES_PER_BATCH,
  MAX_VIDEO_FRAMES,
  type RenderTargetSurface,
} from '@mf/shared';
import { renderBatch } from '../api.js';
import { openVideo, MAX_VIDEO_SECONDS, type VideoFps } from './decode.js';
import { createMp4Session, type Mp4EncoderSession } from './encoder.js';

/**
 * The video pipeline, interleaved per batch so memory stays bounded:
 *
 *   decode a batch of frames → POST /render/batch → feed the encoder → repeat
 *
 * At no point does the whole clip exist in memory as frames — only one batch
 * of design PNGs and one batch of warped PNGs are alive at a time. The result
 * is one MP4 blob that serves as both the realtime preview (played in a
 * <video> element) and the export (downloaded as-is).
 */

export type VideoPhase =
  | { kind: 'idle' }
  | { kind: 'working'; step: 'decoding' | 'rendering' | 'encoding'; done: number; total: number }
  | {
      kind: 'ready';
      url: string;
      bytes: number;
      seconds: number;
      fps: number;
      width: number;
      height: number;
      /** First warped frame, for applying to the canvas as a poster. */
      posterPng: string;
      posterWidth: number;
      posterHeight: number;
      warnings: string[];
    }
  | { kind: 'failed'; message: string };

export interface VideoJobInput {
  file: File;
  fps: VideoFps;
  fit: 'cover' | 'contain';
  itemId: string;
  surface: RenderTargetSurface;
  colorize: Record<string, string>;
  outputWidth: number | null;
}

export function useVideoRender() {
  const [phase, setPhase] = useState<VideoPhase>({ kind: 'idle' });
  const cancelled = useRef(false);
  const objectUrl = useRef<string | null>(null);

  // Revoke the previous blob URL when replaced or unmounted.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const reset = useCallback(() => {
    cancelled.current = true;
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setPhase({ kind: 'idle' });
  }, []);

  const run = useCallback(async (apiBase: string, input: VideoJobInput) => {
    cancelled.current = false;
    const warnings: string[] = [];
    let session: Mp4EncoderSession | null = null;
    let source: Awaited<ReturnType<typeof openVideo>> | null = null;

    try {
      // Design frames at the surface's export size, like a still render.
      const designWidth = Math.min(1280, input.surface.exportWidth);
      const designHeight = Math.max(2, Math.round(designWidth / input.surface.expectedAspect));

      source = await openVideo(input.file, {
        fps: input.fps,
        width: designWidth,
        height: designHeight,
        fit: input.fit,
      });

      if (source.info.truncated) {
        warnings.push(`The clip is longer than ${MAX_VIDEO_SECONDS}s and was truncated.`);
      }

      const total = Math.min(source.frameCount, MAX_VIDEO_FRAMES);
      setPhase({ kind: 'working', step: 'decoding', done: 0, total });

      let posterPng: string | null = null;
      let posterSize = { width: 0, height: 0 };
      let encoded = 0;

      for (let start = 0; start < total; start += MAX_FRAMES_PER_BATCH) {
        const count = Math.min(MAX_FRAMES_PER_BATCH, total - start);

        // --- decode this batch ------------------------------------------
        const designs: string[] = [];
        for (let i = 0; i < count; i += 1) {
          if (cancelled.current) return;
          designs.push(await source.frame(start + i));
          setPhase({ kind: 'working', step: 'decoding', done: start + i + 1, total });
        }

        // --- warp this batch --------------------------------------------
        setPhase({ kind: 'working', step: 'rendering', done: start, total });
        const batch = await renderBatch(apiBase, {
          itemId: input.itemId,
          surfaceId: input.surface.surfaceId,
          frames: designs,
          width: designWidth,
          height: designHeight,
          colorize: input.colorize,
          ...(input.outputWidth ? { outputWidth: input.outputWidth } : {}),
        });
        if (cancelled.current) return;

        for (const warning of batch.warnings) {
          if (!warnings.includes(warning.message)) warnings.push(warning.message);
        }

        // --- encode this batch ------------------------------------------
        if (!session) {
          session = await createMp4Session({
            width: batch.width,
            height: batch.height,
            fps: input.fps,
          });
        }
        for (const [i, frame] of batch.frames.entries()) {
          if (cancelled.current) return;
          if (!posterPng) {
            posterPng = frame;
            posterSize = { width: batch.width, height: batch.height };
          }
          await session.addFrame(frame);
          encoded += 1;
          setPhase({ kind: 'working', step: 'encoding', done: start + i + 1, total });
        }
      }

      if (!session || !posterPng || encoded === 0) {
        throw new Error('No frames could be decoded from that video.');
      }

      const mp4 = await session.finish();
      session = null;
      // The Uint8Array's underlying buffer belongs to the (deleted) WASM heap
      // view; copy it into the blob.
      const blob = new Blob([new Uint8Array(mp4)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;

      setPhase({
        kind: 'ready',
        url,
        bytes: blob.size,
        seconds: encoded / input.fps,
        fps: input.fps,
        width: posterSize.width,
        height: posterSize.height,
        posterPng,
        posterWidth: posterSize.width,
        posterHeight: posterSize.height,
        warnings,
      });
    } catch (err) {
      session?.abort();
      if (!cancelled.current) {
        setPhase({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      source?.dispose();
    }
  }, []);

  return { phase, run, reset };
}
