import { describe, expect, it } from 'vitest';
import {
  aspectDrift,
  aspectMatches,
  ASPECT_TOLERANCE,
  cylinderMesh,
  designFrameName,
  fabricMesh,
  meshFromQuad,
  meshOutline,
  meshPointCountError,
  MockupItemSchema,
  pt,
  quadLerp,
  rectQuad,
  SandboxToUiSchema,
  titleize,
  UiToSandboxSchema,
  warpGeometry,
} from './index.js';

/** A minimal valid item, cloned and broken in individual tests. */
function validItem(): unknown {
  return {
    id: 'test-item-01',
    name: 'Test Item',
    category: 'print',
    viewpoint: 'front',
    canvas: { width: 1000, height: 800 },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers: [
      { type: 'base', src: 'base.png' },
      {
        type: 'surface',
        id: 'art',
        placeholder: { aspect: 1.5, recommendedWidth: 1200, recommendedHeight: 800 },
        warp: {
          kind: 'homography',
          corners: {
            tl: { x: 0.1, y: 0.1 },
            tr: { x: 0.9, y: 0.1 },
            br: { x: 0.9, y: 0.9 },
            bl: { x: 0.1, y: 0.9 },
          },
        },
      },
    ],
  };
}

describe('MockupItemSchema', () => {
  it('accepts a minimal valid item and applies defaults', () => {
    const item = MockupItemSchema.parse(validItem());
    expect(item.tags).toEqual([]);
    const surface = item.layers[1];
    if (surface?.type !== 'surface') throw new Error('expected a surface layer');
    expect(surface.opacity).toBe(1);
    expect(surface.blend).toBe('normal');
    expect(surface.placeholder.hint).toMatch(/Place your design/);
  });

  it('rejects an id that is not kebab-case', () => {
    const broken = { ...(validItem() as Record<string, unknown>), id: 'Test Item' };
    expect(MockupItemSchema.safeParse(broken).success).toBe(false);
  });

  it('requires exactly one base layer', () => {
    const item = validItem() as { layers: unknown[] };
    item.layers = [item.layers[1]];
    expect(MockupItemSchema.safeParse(item).success).toBe(false);

    const two = validItem() as { layers: unknown[] };
    two.layers.push({ type: 'base', src: 'other.png' });
    expect(MockupItemSchema.safeParse(two).success).toBe(false);
  });

  it('requires at least one surface', () => {
    const item = validItem() as { layers: unknown[] };
    item.layers = [{ type: 'base', src: 'base.png' }];
    expect(MockupItemSchema.safeParse(item).success).toBe(false);
  });

  it('rejects duplicate surface ids', () => {
    const item = validItem() as { layers: Record<string, unknown>[] };
    item.layers.push({ ...item.layers[1]! });
    const result = MockupItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toMatch(/unique/);
    }
  });

  it('rejects a placeholder whose aspect disagrees with its pixel size', () => {
    const item = validItem() as { layers: Record<string, unknown>[] };
    item.layers[1]!.placeholder = { aspect: 3, recommendedWidth: 1200, recommendedHeight: 800 };
    expect(MockupItemSchema.safeParse(item).success).toBe(false);
  });

  it('rejects a mesh whose point count disagrees with its grid', () => {
    const item = validItem() as { layers: Record<string, unknown>[] };
    item.layers[1]!.warp = {
      kind: 'mesh',
      rows: 2,
      cols: 2,
      // A 2x2 grid needs 9 points, not 4.
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    };
    const result = MockupItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) expect(JSON.stringify(result.error.issues)).toMatch(/requires 9/);
  });

  it('rejects a colorize default that is not a hex colour', () => {
    const item = validItem() as { layers: Record<string, unknown>[] };
    item.layers.push({ type: 'colorize', id: 'body', mask: 'm.png', default: 'red' });
    expect(MockupItemSchema.safeParse(item).success).toBe(false);
  });
});

describe('meshPointCountError', () => {
  it('passes a well-formed mesh and names the shortfall otherwise', () => {
    const mesh = meshFromQuad(rectQuad(0, 0, 1, 1), { cols: 3, rows: 2 });
    expect(mesh.points).toHaveLength(12);
    expect(meshPointCountError(mesh)).toBeNull();
    expect(meshPointCountError({ ...mesh, points: mesh.points.slice(1) })).toMatch(/requires 12/);
  });
});

describe('geometry builders', () => {
  it('samples a quad bilinearly', () => {
    const q = rectQuad(0, 0, 10, 20);
    expect(quadLerp(q, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(quadLerp(q, 1, 1)).toEqual({ x: 10, y: 20 });
    expect(quadLerp(q, 0.5, 0.5)).toEqual({ x: 5, y: 10 });
  });

  it('compresses a cylinder wrap toward its silhouette edges', () => {
    const mesh = cylinderMesh(rectQuad(0, 0, 1, 1), { cols: 8, rows: 2, wrap: 0.7 });
    const topRow = mesh.points.slice(0, mesh.cols + 1);
    const gaps = topRow.slice(1).map((p, i) => p.x - topRow[i]!.x);
    // Every gap positive (monotonic), and the outermost gaps smaller than the
    // middle ones — that is what foreshortening means here.
    expect(gaps.every((gap) => gap > 0)).toBe(true);
    expect(gaps[0]!).toBeLessThan(gaps[Math.floor(gaps.length / 2)]!);
    expect(gaps.at(-1)!).toBeLessThan(gaps[Math.floor(gaps.length / 2)]!);
  });

  it('keeps a cylinder mesh within its quad horizontally', () => {
    const mesh = cylinderMesh(rectQuad(0.2, 0.3, 0.5, 0.4), { cols: 10, rows: 4 });
    for (const point of mesh.points) {
      expect(point.x).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(point.x).toBeLessThanOrEqual(0.7 + 1e-9);
    }
  });

  it('sags fabric downward in the middle', () => {
    const mesh = fabricMesh(rectQuad(0, 0, 1, 1), { cols: 4, rows: 4, sag: 0.1, drift: 0 });
    const bottomRow = mesh.points.slice(-(mesh.cols + 1));
    const middle = bottomRow[Math.floor(bottomRow.length / 2)]!;
    expect(middle.y).toBeGreaterThan(bottomRow[0]!.y);
  });

  it('walks a mesh outline once around the border', () => {
    const mesh = meshFromQuad(rectQuad(0, 0, 1, 1), { cols: 3, rows: 3 });
    const outline = meshOutline(mesh);
    // 4 corners + 2 interior points per edge, with no duplicated corner.
    expect(outline).toHaveLength(3 * 4);
    expect(outline[0]).toEqual({ x: 0, y: 0 });
    expect(new Set(outline.map((p) => `${p.x},${p.y}`)).size).toBe(outline.length);
  });
});

describe('warpGeometry', () => {
  it('unwraps a displacement warp to the geometry underneath', () => {
    const mesh = meshFromQuad(rectQuad(0, 0, 1, 1), { cols: 2, rows: 2 });
    expect(warpGeometry({ kind: 'displacement', geometry: mesh, map: 'm.png', scale: 4, vector: false })).toBe(
      mesh,
    );
    const homography = {
      kind: 'homography' as const,
      corners: rectQuad(0, 0, 1, 1),
    };
    expect(warpGeometry(homography)).toBe(homography);
  });
});

describe('aspect helpers', () => {
  it('treats an exact match as no drift', () => {
    expect(aspectDrift(1.5, 1.5)).toBe(0);
    expect(aspectMatches(1.5, 1.5)).toBe(true);
  });

  it('accepts drift inside the tolerance and rejects it outside', () => {
    const inside = 1.5 * (1 + ASPECT_TOLERANCE * 0.5);
    const outside = 1.5 * (1 + ASPECT_TOLERANCE * 2);
    expect(aspectMatches(inside, 1.5)).toBe(true);
    expect(aspectMatches(outside, 1.5)).toBe(false);
  });

  it('is symmetric in direction', () => {
    expect(aspectDrift(1.6, 1.5)).toBeCloseTo(aspectDrift(1.4, 1.5), 12);
  });

  it('reports infinite drift for degenerate ratios rather than NaN', () => {
    expect(aspectDrift(0, 1.5)).toBe(Infinity);
    expect(aspectMatches(0, 1.5)).toBe(false);
  });
});

describe('naming', () => {
  it('titleizes an item id, leaving numbers alone', () => {
    expect(titleize('mug-ceramic-front-01')).toBe('Mug Ceramic Front 01');
  });

  it('builds a design frame name that names both item and surface', () => {
    expect(designFrameName('mug-ceramic-front-01', 'design')).toBe(
      '[MF] Design → mug-ceramic-front-01 / design',
    );
  });
});

describe('message protocol', () => {
  it('accepts a well-formed UI message', () => {
    expect(UiToSandboxSchema.safeParse({ type: 'ui-ready' }).success).toBe(true);
    expect(
      UiToSandboxSchema.safeParse({ type: 'resize-ui', width: 400, height: 600 }).success,
    ).toBe(true);
  });

  it('rejects an unknown message type', () => {
    expect(UiToSandboxSchema.safeParse({ type: 'drop-database' }).success).toBe(false);
  });

  it('rejects a message missing required fields', () => {
    expect(UiToSandboxSchema.safeParse({ type: 'apply-render' }).success).toBe(false);
    expect(
      UiToSandboxSchema.safeParse({ type: 'export-designs', jobId: 'j', instanceGuids: [] })
        .success,
    ).toBe(false);
  });

  it('rejects a config with a non-URL API base', () => {
    expect(
      UiToSandboxSchema.safeParse({ type: 'set-config', config: { apiBase: 'not a url' } }).success,
    ).toBe(false);
  });

  it('validates sandbox messages in the other direction', () => {
    expect(
      SandboxToUiSchema.safeParse({ type: 'selection-changed', targets: [], foreignCount: 0 })
        .success,
    ).toBe(true);
    expect(SandboxToUiSchema.safeParse({ type: 'selection-changed' }).success).toBe(false);
  });
});
