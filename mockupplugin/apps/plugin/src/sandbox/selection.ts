import type { RenderTarget } from '@mf/shared';

export interface ResolvedSelection {
  targets: RenderTarget[];
  foreignCount: number;
}

/**
 * Resolves whatever the user has selected into renderable item instances.
 * Real implementation lands with the import mechanics in milestone 3.
 */
export async function resolveSelection(): Promise<ResolvedSelection> {
  return { targets: [], foreignCount: figma.currentPage.selection.length };
}
