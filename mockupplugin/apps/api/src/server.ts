import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import { MF_VERSION } from '@mf/shared';
import { config } from './config.js';
import { ApiFailure } from './errors.js';
import { catalog } from './catalog/store.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerRenderRoutes } from './routes/render.js';
import { registerVideoRoutes } from './routes/video.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    // Renders arrive as base64 JSON; the per-field cap lives in the Zod
    // schema, this is the outer envelope guard.
    bodyLimit: 32 * 1024 * 1024,
  });

  // The plugin iframe has a null origin, so it cannot be allow-listed by
  // name. Every endpoint is public and unauthenticated by design, and no
  // cookies are involved, so a permissive CORS policy grants nothing that a
  // plain HTTP client did not already have.
  await app.register(cors, { origin: true, credentials: false });

  await app.register(fastifyStatic, {
    root: config.ASSET_DIR,
    prefix: '/assets/',
    // Item assets are immutable per deploy.
    maxAge: config.NODE_ENV === 'production' ? '7d' : 0,
    index: false,
    list: false,
  });

  app.setErrorHandler((err: unknown, req, reply) => {
    const statusCode =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;

    if (err instanceof ApiFailure) {
      if (err.status >= 500) req.log.error({ err }, 'api failure');
      return reply.status(err.status).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'bad_request',
          message: 'Request failed validation',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    if (statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'rate_limited', message: 'Too many requests — slow down and retry shortly.' },
      });
    }
    if (statusCode === 413) {
      return reply.status(413).send({
        error: { code: 'payload_too_large', message: 'Upload exceeds the maximum size.' },
      });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({
      error: { code: 'internal', message: 'Something went wrong rendering that request.' },
    });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'No such route.' } }),
  );

  const { loaded, errors } = await catalog.reload();
  app.log.info({ loaded }, 'catalog loaded');
  for (const message of errors) app.log.warn({ message }, 'catalog item skipped');

  app.get('/health', async () => ({
    ok: true as const,
    version: MF_VERSION,
    items: catalog.size,
    features: { video: config.MF_VIDEO },
  }));

  await registerCatalogRoutes(app);
  await registerRenderRoutes(app);
  await registerVideoRoutes(app);

  return app;
}
