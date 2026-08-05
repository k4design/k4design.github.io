import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { surfacesOf } from '@mf/shared';
import { catalog } from '../catalog/store.js';
import { config } from '../config.js';
import { ApiFailure } from '../errors.js';
import { renderItem } from './pipeline.js';

/**
 * Phase 2: video mockups.
 *
 * The still pipeline is per-frame stateless — a warp is a pure function of
 * (design pixels, item geometry) — so video is a loop over the same code path
 * rather than a second renderer. That is the whole reason the surface/warp model
 * was designed the way it is.
 *
 * This module is scaffolding: the ffmpeg orchestration below is real and
 * exercised by `renderVideo`, but it is gated behind MF_VIDEO and is not wired
 * to an upload endpoint yet. See docs/VIDEO.md for what remains.
 */

export interface VideoJob {
  jobId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  posterUrl: string | null;
  downloadUrl: string | null;
  message?: string;
}

/** In-memory job table. A real deployment needs a queue — see docs/VIDEO.md. */
const jobs = new Map<string, VideoJob>();

export function getJob(jobId: string): VideoJob | undefined {
  return jobs.get(jobId);
}

export function assertVideoEnabled(): void {
  if (!config.MF_VIDEO) {
    throw new ApiFailure(
      'bad_request',
      'Video rendering is not enabled on this server. Start it with MF_VIDEO=1.',
      501,
    );
  }
}

async function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) =>
      reject(new Error(`${command} could not be started: ${err.message}`)),
    );
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await run('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

interface ProbeResult {
  width: number;
  height: number;
  frameRate: number;
  durationSeconds: number;
}

export async function probe(file: string): Promise<ProbeResult> {
  const raw = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate:format=duration',
    '-of',
    'json',
    file,
  ]);

  const parsed = JSON.parse(raw) as {
    streams?: { width?: number; height?: number; r_frame_rate?: string }[];
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream.height) {
    throw new ApiFailure('unsupported_media', 'That file has no readable video stream.');
  }

  const [num, den] = (stream.r_frame_rate ?? '30/1').split('/').map(Number);
  return {
    width: stream.width,
    height: stream.height,
    frameRate: den && num ? num / den : 30,
    durationSeconds: Number(parsed.format?.duration ?? 0),
  };
}

export interface VideoRenderOptions {
  itemId: string;
  surfaceId: string;
  /** Local path to the uploaded source video. */
  source: string;
  colorize?: Record<string, string>;
  format?: 'mp4' | 'webm';
  outputWidth?: number;
  /** Hard ceiling so one upload cannot occupy a worker indefinitely. */
  maxFrames?: number;
}

/**
 * Renders a video by warping every frame through the still pipeline.
 *
 * Deliberately naive: decode all frames to PNG, warp each, encode the result.
 * That is correct and easy to reason about, and it is far too slow and too
 * disk-hungry for production — the streaming version is the main open item in
 * docs/VIDEO.md.
 */
export async function renderVideo(options: VideoRenderOptions): Promise<VideoJob> {
  assertVideoEnabled();

  const jobId = randomUUID();
  const job: VideoJob = { jobId, status: 'processing', posterUrl: null, downloadUrl: null };
  jobs.set(jobId, job);

  const { item } = catalog.entry(options.itemId);
  const surface = surfacesOf(item).find((s) => s.id === options.surfaceId);
  if (!surface) {
    job.status = 'failed';
    job.message = `"${options.itemId}" has no surface called "${options.surfaceId}".`;
    return job;
  }

  if (!(await ffmpegAvailable())) {
    job.status = 'failed';
    job.message = 'ffmpeg is not installed on this server.';
    return job;
  }

  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'mf-video-'));
  const framesDir = path.join(work, 'frames');
  const rendersDir = path.join(work, 'renders');
  await fs.mkdir(framesDir);
  await fs.mkdir(rendersDir);

  try {
    const info = await probe(options.source);
    const maxFrames = options.maxFrames ?? 900;

    // Decode to PNG frames at the surface's authored resolution: warping a
    // 4K frame onto a 600px surface is wasted work.
    await run('ffmpeg', [
      '-v',
      'error',
      '-i',
      options.source,
      '-vf',
      `scale=${surface.placeholder.recommendedWidth}:${surface.placeholder.recommendedHeight}:flags=lanczos`,
      '-frames:v',
      String(maxFrames),
      path.join(framesDir, 'frame-%06d.png'),
    ]);

    const frames = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();
    if (frames.length === 0) {
      throw new ApiFailure('unsupported_media', 'No frames could be decoded from that video.');
    }

    for (const [index, frame] of frames.entries()) {
      const design = await fs.readFile(path.join(framesDir, frame));
      const outcome = await renderItem({
        itemId: options.itemId,
        designs: [{ surfaceId: options.surfaceId, design: design.toString('base64') }],
        colorize: options.colorize ?? {},
        ...(options.outputWidth ? { outputWidth: options.outputWidth } : {}),
        allowAspectDrift: true,
      });
      await fs.writeFile(
        path.join(rendersDir, `out-${String(index + 1).padStart(6, '0')}.png`),
        outcome.png,
      );
    }

    const format = options.format ?? 'mp4';
    const outputFile = path.join(work, `render.${format}`);
    const encodeArgs =
      format === 'webm'
        ? ['-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-pix_fmt', 'yuv420p']
        : ['-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p'];

    await run('ffmpeg', [
      '-v',
      'error',
      '-framerate',
      String(info.frameRate),
      '-i',
      path.join(rendersDir, 'out-%06d.png'),
      ...encodeArgs,
      // Encoders reject odd dimensions; the render size is derived from the
      // item canvas and is not guaranteed even.
      '-vf',
      'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      outputFile,
    ]);

    const poster = path.join(work, 'poster.png');
    await sharp(path.join(rendersDir, `out-${String(1).padStart(6, '0')}.png`))
      .resize({ width: 640 })
      .png()
      .toFile(poster);

    // TODO(video): upload outputFile and poster to object storage and return
    // signed URLs. Until then the artefacts live in a temp directory that this
    // function is about to delete, which is why the endpoint stays stubbed.
    job.status = 'done';
    job.message = `Rendered ${frames.length} frames. Object-storage upload is not implemented — see docs/VIDEO.md.`;
    return job;
  } catch (err) {
    job.status = 'failed';
    job.message = err instanceof Error ? err.message : String(err);
    return job;
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}
