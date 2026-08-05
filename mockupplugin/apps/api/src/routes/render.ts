import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { MAX_DESIGN_BYTES, RenderRequestSchema, type RenderResponse } from '@mf/shared';
import { config } from '../config.js';
import { ApiFailure } from '../errors.js';
import { catalog } from '../catalog/store.js';
import { renderItem } from '../render/pipeline.js';

export async function registerRenderRoutes(app: FastifyInstance): Promise<void> {
  // Anonymous, per-IP. There are no accounts in this system, so the only
  // available signal is the address — enough to stop a runaway script without
  // getting in a designer's way.
  await app.register(
    async (scope) => {
      await scope.register(rateLimit, {
        max: config.RATE_LIMIT_RENDERS,
        timeWindow: config.RATE_LIMIT_WINDOW,
        // Renders are the only expensive endpoint; the catalog is not limited.
        keyGenerator: (req) => req.ip,
      });

      scope.post('/render', async (req): Promise<RenderResponse> => {
        const body = RenderRequestSchema.parse(req.body);

        if (!catalog.has(body.itemId)) {
          throw new ApiFailure('not_found', `No mockup item with id "${body.itemId}".`);
        }

        for (const design of body.designs) {
          // base64 inflates by 4/3; check the decoded size against the limit.
          const bytes = Math.floor((design.design.length * 3) / 4);
          if (bytes > MAX_DESIGN_BYTES) {
            throw new ApiFailure(
              'payload_too_large',
              `The design for "${design.surfaceId}" is ${(bytes / 1024 / 1024).toFixed(
                1,
              )} MB. The limit is ${MAX_DESIGN_BYTES / 1024 / 1024} MB — export at a smaller width.`,
            );
          }
        }

        const outcome = await withTimeout(renderItem(body), config.RENDER_TIMEOUT_MS);

        req.log.info(
          {
            renderId: outcome.renderId,
            itemId: body.itemId,
            surfaces: body.designs.map((d) => d.surfaceId),
            width: outcome.width,
            ms: outcome.ms,
            warnings: outcome.warnings.length,
          },
          'render complete',
        );

        return {
          renderId: outcome.renderId,
          itemId: body.itemId,
          width: outcome.width,
          height: outcome.height,
          png: outcome.png.toString('base64'),
          ms: outcome.ms,
          warnings: outcome.warnings,
        };
      });
    },
    { prefix: '' },
  );
}

/**
 * Renders are CPU-bound and synchronous once started, so this bounds the
 * *reported* wait rather than killing the work. It exists so a pathological item
 * cannot hold a client connection open indefinitely.
 */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new ApiFailure(
                'render_timeout',
                `The render took longer than ${Math.round(
                  ms / 1000,
                )}s. Try a lower render width in Settings.`,
              ),
            ),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
