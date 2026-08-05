import { z } from 'zod';

/**
 * The mockup item data model.
 *
 * Every geometric coordinate in this file is **normalized** to the item's
 * canvas (0..1 on both axes) so an item can be re-rendered at any output
 * resolution without re-authoring. Pixel values only ever appear in
 * `canvas` and in `placeholder.recommendedWidth/Height`.
 */

export const CATEGORIES = ['devices', 'apparel', 'packaging', 'print', 'branding'] as const;
export const VIEWPOINTS = ['front', 'angled', 'flat-lay', 'in-hand', 'floating', 'scene'] as const;

export const CategorySchema = z.enum(CATEGORIES);
export const ViewpointSchema = z.enum(VIEWPOINTS);

export type Category = z.infer<typeof CategorySchema>;
export type Viewpoint = z.infer<typeof ViewpointSchema>;

/** A normalized point on the item canvas. */
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

/**
 * Four destination corners for a perspective transform, in the order the
 * user's design maps onto them: top-left, top-right, bottom-right,
 * bottom-left of the *design*.
 */
export const QuadSchema = z.object({
  tl: PointSchema,
  tr: PointSchema,
  br: PointSchema,
  bl: PointSchema,
});
export type Quad = z.infer<typeof QuadSchema>;

export const HomographyGeometrySchema = z.object({
  kind: z.literal('homography'),
  corners: QuadSchema,
});
export type HomographyGeometry = z.infer<typeof HomographyGeometrySchema>;

/**
 * An (cols+1) x (rows+1) grid of destination control points, row-major from
 * the top-left of the design. Source positions are implicitly the uniform
 * grid over the design image, so the warp is a piecewise affine map over the
 * triangulated grid.
 */
export const MeshGeometrySchema = z.object({
  kind: z.literal('mesh'),
  rows: z.number().int().min(1).max(64),
  cols: z.number().int().min(1).max(64),
  points: z.array(PointSchema).min(4),
});
export type MeshGeometry = z.infer<typeof MeshGeometrySchema>;

/**
 * The grid/point-count agreement cannot live in a `.refine()` here: Zod 3's
 * discriminated unions only accept plain object schemas as members, and a
 * refined schema is a ZodEffects. It is enforced in `MockupItemSchema` instead,
 * and exposed for the authoring tool.
 */
export function meshPointCountError(mesh: MeshGeometry): string | null {
  const expected = (mesh.rows + 1) * (mesh.cols + 1);
  return mesh.points.length === expected
    ? null
    : `mesh has ${mesh.points.length} points but rows=${mesh.rows}, cols=${mesh.cols} requires ${expected}`;
}

export const GeometrySchema = z.discriminatedUnion('kind', [
  HomographyGeometrySchema,
  MeshGeometrySchema,
]);
export type Geometry = z.infer<typeof GeometrySchema>;

/**
 * Geometry plus a grayscale displacement map. Mid-gray (128) is neutral;
 * darker pushes the sampled source one way, lighter the other. `scale` is
 * the maximum displacement in canvas pixels at full black/white.
 */
export const DisplacementWarpSchema = z.object({
  kind: z.literal('displacement'),
  geometry: GeometrySchema,
  map: z.string().min(1),
  scale: z.number().min(0).max(512).default(12),
  /** When true the map's green channel drives Y and red drives X. */
  vector: z.boolean().default(false),
});
export type DisplacementWarp = z.infer<typeof DisplacementWarpSchema>;

export const WarpSchema = z.discriminatedUnion('kind', [
  HomographyGeometrySchema,
  MeshGeometrySchema,
  DisplacementWarpSchema,
]);
export type Warp = z.infer<typeof WarpSchema>;

/** Extract the underlying geometry from any warp. */
export function warpGeometry(warp: Warp): Geometry {
  return warp.kind === 'displacement' ? warp.geometry : warp;
}

export const BlendModeSchema = z.enum(['normal', 'multiply', 'screen', 'overlay', 'soft-light']);
export type BlendMode = z.infer<typeof BlendModeSchema>;

/**
 * The shape and size of the design frame the plugin creates for this
 * surface. `aspect` is width / height and is the single source of truth —
 * the recommended pixel size is derived guidance for export resolution.
 */
export const PlaceholderSchema = z
  .object({
    aspect: z.number().positive(),
    recommendedWidth: z.number().int().positive().max(8192),
    recommendedHeight: z.number().int().positive().max(8192),
    hint: z.string().default('Place your design here, then click Render'),
  })
  .refine((p) => Math.abs(p.recommendedWidth / p.recommendedHeight - p.aspect) < 0.02, {
    message: 'placeholder.aspect must match recommendedWidth / recommendedHeight',
    path: ['aspect'],
  });
export type Placeholder = z.infer<typeof PlaceholderSchema>;

/**
 * Shadow/highlight maps applied to the warped design only, so the artwork
 * inherits the base photograph's lighting.
 */
export const LightingSchema = z.object({
  multiply: z.string().min(1).optional(),
  multiplyOpacity: z.number().min(0).max(1).default(1),
  screen: z.string().min(1).optional(),
  screenOpacity: z.number().min(0).max(1).default(1),
});
export type Lighting = z.infer<typeof LightingSchema>;

export const BaseLayerSchema = z.object({
  type: z.literal('base'),
  src: z.string().min(1),
});

export const SurfaceLayerSchema = z.object({
  type: z.literal('surface'),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'surface id must be kebab-case'),
  label: z.string().optional(),
  placeholder: PlaceholderSchema,
  warp: WarpSchema,
  lighting: LightingSchema.optional(),
  /** Alpha mask clipping the warped design to the visible surface. */
  mask: z.string().min(1).optional(),
  opacity: z.number().min(0).max(1).default(1),
  blend: BlendModeSchema.default('normal'),
});
export type SurfaceLayer = z.infer<typeof SurfaceLayerSchema>;

export const ColorizeLayerSchema = z.object({
  type: z.literal('colorize'),
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-]+$/),
  label: z.string().optional(),
  mask: z.string().min(1),
  default: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'default must be a #rrggbb hex colour'),
});
export type ColorizeLayer = z.infer<typeof ColorizeLayerSchema>;

export const OverlayLayerSchema = z.object({
  type: z.literal('overlay'),
  src: z.string().min(1),
  blend: BlendModeSchema.default('normal'),
  opacity: z.number().min(0).max(1).default(1),
});
export type OverlayLayer = z.infer<typeof OverlayLayerSchema>;

export const LayerSchema = z.discriminatedUnion('type', [
  BaseLayerSchema,
  SurfaceLayerSchema,
  ColorizeLayerSchema,
  OverlayLayerSchema,
]);
export type Layer = z.infer<typeof LayerSchema>;

export const MockupItemSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'item id must be kebab-case'),
    name: z.string().min(1),
    category: CategorySchema,
    viewpoint: ViewpointSchema,
    tags: z.array(z.string()).default([]),
    canvas: z.object({
      width: z.number().int().positive().max(8192),
      height: z.number().int().positive().max(8192),
    }),
    /** Flattened thumbnail for the library grid. */
    thumbnail: z.string().min(1),
    /**
     * Flattened preview at working resolution, placed on canvas at import
     * time before the first render.
     */
    preview: z.string().min(1),
    layers: z.array(LayerSchema).min(1),
  })
  .superRefine((item, ctx) => {
    const bases = item.layers.filter((l) => l.type === 'base');
    if (bases.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'an item must have exactly one base layer',
        path: ['layers'],
      });
    }
    const surfaces = item.layers.filter((l) => l.type === 'surface');
    if (surfaces.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'an item must have at least one surface layer',
        path: ['layers'],
      });
    }
    const dupe = <T extends { id: string }>(xs: T[]) =>
      xs.length !== new Set(xs.map((x) => x.id)).size;
    if (dupe(surfaces as { id: string }[])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'surface ids must be unique within an item',
        path: ['layers'],
      });
    }
    for (const [index, layer] of item.layers.entries()) {
      if (layer.type !== 'surface') continue;
      const geometry = warpGeometry(layer.warp);
      if (geometry.kind !== 'mesh') continue;
      const problem = meshPointCountError(geometry);
      if (problem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `surface "${layer.id}": ${problem}`,
          path: ['layers', index, 'warp'],
        });
      }
    }

    const colorize = item.layers.filter((l) => l.type === 'colorize');
    if (dupe(colorize as { id: string }[])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'colorize ids must be unique within an item',
        path: ['layers'],
      });
    }
  });
export type MockupItem = z.infer<typeof MockupItemSchema>;

export function surfacesOf(item: MockupItem): SurfaceLayer[] {
  return item.layers.filter((l): l is SurfaceLayer => l.type === 'surface');
}

export function colorizeOf(item: MockupItem): ColorizeLayer[] {
  return item.layers.filter((l): l is ColorizeLayer => l.type === 'colorize');
}

export function baseOf(item: MockupItem): z.infer<typeof BaseLayerSchema> {
  const base = item.layers.find((l) => l.type === 'base');
  if (!base || base.type !== 'base') throw new Error(`item ${item.id} has no base layer`);
  return base;
}
