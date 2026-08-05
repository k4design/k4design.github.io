import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { ApiFailure } from '../errors.js';

/**
 * Phase 2. The warp model is deliberately per-frame stateless, so video is a
 * loop over the same code path the still renderer uses. See docs/VIDEO.md for
 * the ffmpeg pipeline plan. Gated behind MF_VIDEO=1.
 */
export async function registerVideoRoutes(app: FastifyInstance): Promise<void> {
  app.post('/render/video', async () => {
    if (!config.MF_VIDEO) {
      throw new ApiFailure(
        'bad_request',
        'Video rendering is not enabled on this server (set MF_VIDEO=1).',
        501,
      );
    }
    throw new ApiFailure('internal', 'Video rendering is scaffolded but not implemented.', 501);
  });
}
