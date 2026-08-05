import type { FastifyInstance } from 'fastify';
import { ApiFailure } from '../errors.js';

/** Replaced by the real pipeline in milestone 4. */
export async function registerRenderRoutes(app: FastifyInstance): Promise<void> {
  app.post('/render', async () => {
    throw new ApiFailure('internal', 'The render pipeline is not wired up yet.', 501);
  });
}
