import type { FastifyInstance } from 'fastify';
import { VideoRenderRequestSchema, type VideoRenderResponse } from '@mf/shared';
import { catalog } from '../catalog/store.js';
import { ApiFailure } from '../errors.js';
import { assertVideoEnabled, ffmpegAvailable, getJob } from '../render/video.js';

/**
 * Phase 2. The warp model is per-frame stateless, so video reuses the still
 * pipeline frame by frame — see apps/api/src/render/video.ts and docs/VIDEO.md.
 *
 * The endpoint validates and reports honestly rather than pretending to work:
 * there is no upload route and no object storage yet, so a finished MP4 has
 * nowhere to live.
 */
export async function registerVideoRoutes(app: FastifyInstance): Promise<void> {
  app.post('/render/video', async (req): Promise<VideoRenderResponse> => {
    assertVideoEnabled();

    const body = VideoRenderRequestSchema.parse(req.body);
    if (!catalog.has(body.itemId)) {
      throw new ApiFailure('not_found', `No mockup item with id "${body.itemId}".`);
    }

    if (!(await ffmpegAvailable())) {
      throw new ApiFailure(
        'internal',
        'Video rendering needs ffmpeg and ffprobe on PATH; neither was found.',
        501,
      );
    }

    // Everything up to here is real. What is missing is the upload endpoint that
    // turns `uploadId` into a local file, and the object storage that a finished
    // render is written to.
    throw new ApiFailure(
      'internal',
      'Video rendering is scaffolded but not complete: uploads and result storage are not implemented yet. See docs/VIDEO.md.',
      501,
    );
  });

  app.get<{ Params: { jobId: string } }>('/render/video/:jobId', async (req) => {
    assertVideoEnabled();
    const job = getJob(req.params.jobId);
    if (!job) throw new ApiFailure('not_found', `No video job with id "${req.params.jobId}".`);
    return job;
  });
}
