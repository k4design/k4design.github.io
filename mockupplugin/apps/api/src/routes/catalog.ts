import type { FastifyInstance } from 'fastify';
import { CatalogQuerySchema } from '@mf/shared';
import { catalog } from '../catalog/store.js';

export async function registerCatalogRoutes(app: FastifyInstance): Promise<void> {
  // The catalog is immutable per deploy, so short public caching costs
  // nothing and lets the platform proxy absorb repeated browsing traffic.
  const CACHE = 'public, max-age=300';

  app.get('/catalog', async (req, reply) => {
    const query = CatalogQuerySchema.parse(req.query);
    void reply.header('cache-control', CACHE);
    return catalog.query(query);
  });

  app.get<{ Params: { id: string } }>('/items/:id', async (req, reply) => {
    // `entry` throws a 404 ApiFailure for unknown ids.
    void reply.header('cache-control', CACHE);
    return catalog.toItemDetail(catalog.entry(req.params.id));
  });
}
