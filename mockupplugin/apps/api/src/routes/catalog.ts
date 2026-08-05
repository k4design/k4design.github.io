import type { FastifyInstance } from 'fastify';
import { CatalogQuerySchema } from '@mf/shared';
import { catalog } from '../catalog/store.js';

export async function registerCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/catalog', async (req) => {
    const query = CatalogQuerySchema.parse(req.query);
    return catalog.query(query);
  });

  app.get<{ Params: { id: string } }>('/items/:id', async (req) => {
    // `entry` throws a 404 ApiFailure for unknown ids.
    return catalog.toItemDetail(catalog.entry(req.params.id));
  });
}
