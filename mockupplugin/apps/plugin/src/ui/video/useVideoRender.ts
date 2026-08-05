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

/** Thrown internally when the user cancels; never surfaces as a failure. */
class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export type VideoPhase =
  | { kind: 'idle' }
  | {
      kind: 'working';
      /** Per-stage frame counters — the stages run concurrently. */
      decoded: number;
      rendered: number;
      encoded: number;
      total: number;
      /** Set while waiting out a server rate limit, so a pause has a reason. */
      notice?: string;
    }
  | {
      kind: 'ready';
      /** Stable id shared with the clip gallery and clientStorage. */
      id: string;
      url: string;
      blob: Blob;
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
    // A holder rather than a plain let: the session is assigned inside the
    // encode closure, and TS flow analysis would otherwise pin a let to null.
    const session: { current: Mp4EncoderSession | null } = { current: null };
    let source: Awaited<ReturnType<typeof openVideo>> | null = null;

    try {
      // Design frames at the surface's export size, like a still render.
      const designWidth = Math.min(1280, input.surface.exportWidth);
      const designHeight = Math.max(2, Math.round(designWidth / input.surface.expectedAspect));

      /**
       * Video defaults to 1280px output rather than the item's full canvas:
       * every downstream pixel is paid for three times (server warp, PNG
       * decode, H.264 encode), and 1280 is already beyond most screens for a
       * looping preview. The Settings render-width override still wins when
       * set.
       */
      const outputWidth = input.outputWidth ?? 1280;

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

      let posterPng: string | null = null;
      let posterSize = { width: 0, height: 0 };
      let encoded = 0;

      /**
       * The three stages run PIPELINED, not serially: while batch N renders
       * on the server, the client decodes batch N+1 and encodes batch N-1.
       * Decode and encode share the main thread but both are async-
       * cooperative (seeked events / periodic yields), so they interleave
       * inside each other's waits. Wall time collapses toward the slowest
       * single stage instead of the sum of all three.
       */
      const progress = { decoded: 0, rendered: 0, encoded: 0 };
      const stageMs = { decode: 0, render: 0, encode: 0 };
      let notice: string | undefined;
      // Guarded: with three stages in flight, a straggler can publish after
      // Cancel has reset the phase, resurrecting the progress bar.
      const publish = () => {
        if (!cancelled.current) {
          setPhase({ kind: 'working', ...progress, total, ...(notice ? { notice } : {}) });
        }
      };
      publish();

      /**
       * Batches are bounded by BYTES as well as frame count: photographic
       * frames vary hugely in compressed size, and the server enforces a hard
       * body limit. 12MB of base64 (~9MB decoded) leaves generous headroom
       * under it regardless of content.
       */
      const BATCH_BYTE_BUDGET = 12 * 1024 * 1024;

      const decodeBatch = async (start: number): Promise<string[]> => {
        const t0 = performance.now();
        const designs: string[] = [];
        let batchBytes = 0;
        while (
          start + designs.length < total &&
          designs.length < MAX_FRAMES_PER_BATCH &&
          (designs.length === 0 || batchBytes < BATCH_BYTE_BUDGET)
        ) {
          if (cancelled.current) throw new Cancelled();
          const frame = await source!.frame(start + designs.length);
          designs.push(frame);
          batchBytes += frame.length;
          progress.decoded = start + designs.length;
          publish();
        }
        stageMs.decode += performance.now() - t0;
        return designs;
      };

      const submitBatch = (designs: string[]) =>
        renderBatch(
          apiBase,
          {
            itemId: input.itemId,
            surfaceId: input.surface.surfaceId,
            frames: designs,
            width: designWidth,
            height: designHeight,
            colorize: input.colorize,
            outputWidth,
          },
          {
            // A clip is many batches; losing one to a rate limit would discard
            // everything rendered so far, so wait it out and say why.
            onRateLimited: (seconds) => {
              notice = `Render service is busy — retrying in ${Math.ceil(seconds)}s.`;
              publish();
            },
            shouldAbort: () => cancelled.current,
          },
        ).then((batch) => {
          notice = undefined;
          return batch;
        });

      const encodeBatch = async (batch: Awaited<ReturnType<typeof submitBatch>>) => {
        const t0 = performance.now();
        for (const warning of batch.warnings) {
          if (!warnings.includes(warning.message)) warnings.push(warning.message);
        }
        if (!session.current) {
          session.current = await createMp4Session({
            width: batch.width,
            height: batch.height,
            fps: input.fps,
          });
        }
        for (const frame of batch.frames) {
          if (cancelled.current) throw new Cancelled();
          if (!posterPng) {
            posterPng = frame;
            posterSize = { width: batch.width, height: batch.height };
          }
          await session.current.addFrame(frame);
          encoded += 1;
          progress.encoded = encoded;
          publish();
        }
        stageMs.encode += performance.now() - t0;
      };

      let renderInFlight: Promise<Awaited<ReturnType<typeof submitBatch>>> | null = null;
      let renderStarted = 0;
      let renderedCount = 0;
      // Encode order is frame order: batch N's encode is chained after N-1's,
      // and only ever appended from this loop, so frames cannot reorder.
      let encodeChain: Promise<void> = Promise.resolve();

      const collectRender = async () => {
        const batch = await renderInFlight!;
        stageMs.render += performance.now() - renderStarted;
        renderedCount += batch.frames.length;
        progress.rendered = renderedCount;
        publish();
        return batch;
      };

      try {
        let start = 0;
        while (start < total) {
          // Decoding the next batch happens while the previous one is on the
          // server — this await does not block the in-flight render.
          const designs = await decodeBatch(start);

          if (renderInFlight) {
            const batch = await collectRender();
            if (cancelled.current) throw new Cancelled();
            // Chain, don't await: encoding runs while the next batch renders.
            encodeChain = encodeChain.then(() => encodeBatch(batch));
            // Surface an encode failure promptly rather than at drain time.
            void encodeChain.catch(() => {});
          }

          renderStarted = performance.now();
          renderInFlight = submitBatch(designs);
          start += designs.length;
        }

        const lastBatch = await collectRender();
        if (cancelled.current) throw new Cancelled();
        await encodeChain;
        await encodeBatch(lastBatch);
      } finally {
        // Drain the chain before leaving so a thrown render error cannot race
        // a still-running encode against session teardown below.
        await encodeChain.catch(() => {});
      }

      console.info(
        `[MF] video pipeline: decode ${Math.round(stageMs.decode)}ms, ` +
          `render ${Math.round(stageMs.render)}ms (server-side wait), ` +
          `encode ${Math.round(stageMs.encode)}ms, frames ${encoded}`,
      );

      const finishedSession = session.current;
      if (!finishedSession || !posterPng || encoded === 0) {
        throw new Error('No frames could be decoded from that video.');
      }

      const mp4 = await finishedSession.finish();
      session.current = null;
      // The Uint8Array's underlying buffer belongs to the (deleted) WASM heap
      // view; copy it into the blob.
      const blob = new Blob([new Uint8Array(mp4)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;

      setPhase({
        kind: 'ready',
        id: `clip-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`,
        url,
        blob,
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
      session.current?.abort();
      if (!cancelled.current && !(err instanceof Cancelled)) {
        setPhase({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      source?.dispose();
    }
  }, []);

  return { phase, run, reset };
}
