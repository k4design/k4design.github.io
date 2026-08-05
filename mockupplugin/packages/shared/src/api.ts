import { z } from 'zod';
import { CategorySchema, PlaceholderSchema, ViewpointSchema } from './item.js';

/**
 * Wire contracts for the catalog + render API.
 *
 * Nothing here exposes raw warp geometry or asset paths: warp definitions and
 * source photography stay server-side. The client only learns what it needs
 * to build the right design frame (placeholder aspect + recommended size).
 */

export const ERROR_CODES = [
  'bad_request',
  'not_found',
  'payload_too_large',
  'aspect_mismatch',
  'unsupported_media',
  'rate_limited',
  'render_failed',
  'render_timeout',
  'internal',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Client-safe surface descriptor. */
export const PublicSurfaceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  placeholder: PlaceholderSchema,
  /** Which warp family this surface uses — informational only. */
  warpKind: z.enum(['homography', 'mesh', 'displacement']),
});
export type PublicSurface = z.infer<typeof PublicSurfaceSchema>;

export const PublicColorizeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  default: z.string(),
});
export type PublicColorize = z.infer<typeof PublicColorizeSchema>;

/** Grid-tile shape returned by GET /catalog. */
export const CatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: CategorySchema,
  viewpoint: ViewpointSchema,
  tags: z.array(z.string()),
  canvas: z.object({ width: z.number(), height: z.number() }),
  thumbnailUrl: z.string(),
  surfaceCount: z.number().int().nonnegative(),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;

/** Full detail shape returned by GET /items/:id. */
export const ItemDetailSchema = CatalogItemSchema.extend({
  previewUrl: z.string(),
  surfaces: z.array(PublicSurfaceSchema),
  colorize: z.array(PublicColorizeSchema),
});
export type ItemDetail = z.infer<typeof ItemDetailSchema>;

export const CatalogQuerySchema = z.object({
  category: CategorySchema.optional(),
  viewpoint: ViewpointSchema.optional(),
  q: z.string().max(120).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

export const CatalogResponseSchema = z.object({
  items: z.array(CatalogItemSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

/** Max decoded size of a single uploaded design PNG. */
export const MAX_DESIGN_BYTES = 16 * 1024 * 1024;
/** Max number of surfaces rendered in one request. */
export const MAX_SURFACES_PER_RENDER = 8;

const HexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Rough guard: base64 inflates by 4/3, so cap the encoded string length. */
const Base64PngSchema = z
  .string()
  .min(24)
  .max(Math.ceil((MAX_DESIGN_BYTES * 4) / 3) + 1024)
  .regex(/^[A-Za-z0-9+/=]+$/, 'design must be unpadded-safe base64 (no data: prefix)');

export const SurfaceDesignSchema = z.object({
  surfaceId: z.string().min(1),
  /** Base64-encoded PNG of the user's exported design frame. */
  design: Base64PngSchema,
  /**
   * The exported frame's pixel dimensions, used to detect aspect drift
   * server-side as well as in the UI.
   */
  width: z.number().int().positive().max(8192).optional(),
  height: z.number().int().positive().max(8192).optional(),
});
export type SurfaceDesign = z.infer<typeof SurfaceDesignSchema>;

export const RenderRequestSchema = z.object({
  itemId: z.string().min(1),
  designs: z.array(SurfaceDesignSchema).min(1).max(MAX_SURFACES_PER_RENDER),
  /** Map of colorize layer id -> #rrggbb. Missing ids fall back to defaults. */
  colorize: z.record(HexSchema).default({}),
  /**
   * Longest-edge output width. Defaults to the item's full canvas width;
   * lower it for fast previews.
   */
  outputWidth: z.number().int().min(256).max(8192).optional(),
  /** When false, an aspect-ratio drift is a hard error instead of a warning. */
  allowAspectDrift: z.boolean().default(true),
});
export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export const RenderWarningSchema = z.object({
  code: z.enum(['aspect_drift', 'design_upscaled', 'colorize_unknown']),
  message: z.string(),
  surfaceId: z.string().optional(),
});
export type RenderWarning = z.infer<typeof RenderWarningSchema>;

export const RenderResponseSchema = z.object({
  renderId: z.string(),
  itemId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Base64 PNG of the finished composite. */
  png: z.string(),
  ms: z.number().nonnegative(),
  warnings: z.array(RenderWarningSchema).default([]),
});
export type RenderResponse = z.infer<typeof RenderResponseSchema>;

/* ------------------------------------------------------------------ */
/* Batch rendering — video frames                                      */
/* ------------------------------------------------------------------ */

/**
 * Frames per POST /render/batch request. Sized so one request stays a couple
 * of seconds of work: batching exists so a video does not fight the per-IP
 * rate limit frame by frame, and so the warp sampler is built once per batch
 * rather than once per frame.
 */
export const MAX_FRAMES_PER_BATCH = 30;
/** Total frames the client pipeline will feed one video job (30s @ 30fps). */
export const MAX_VIDEO_FRAMES = 900;

export const BatchRenderRequestSchema = z.object({
  itemId: z.string().min(1),
  /** Batch renders exactly one surface — a video plays on one screen. */
  surfaceId: z.string().min(1),
  /**
   * Base64-encoded images (PNG or JPEG), all the same pixel size (the decoder draws every frame onto
   * one fixed canvas, so this is free for the client to guarantee).
   */
  frames: z.array(Base64PngSchema).min(1).max(MAX_FRAMES_PER_BATCH),
  /** Pixel size of every frame; checked against the placeholder once. */
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  colorize: z.record(HexSchema).default({}),
  outputWidth: z.number().int().min(256).max(8192).optional(),
  /**
   * Wire format for the returned frames.
   *
   * Video frames are headed straight into a lossy H.264 encode, so PNG's
   * losslessness buys nothing and costs a great deal: a warped 1280px PNG is
   * ~700KB, and base64-decoding that in the plugin measured 62ms per frame —
   * 4.5s of a 72-frame clip. JPEG is ~6x smaller for the same visual result
   * once encoded.
   */
  frameFormat: z.enum(['png', 'jpeg']).default('png'),
});
export type BatchRenderRequest = z.infer<typeof BatchRenderRequestSchema>;

export const BatchRenderResponseSchema = z.object({
  renderId: z.string(),
  itemId: z.string(),
  surfaceId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Base64 images, same order as the request. */
  frames: z.array(z.string()),
  /** Format the frames were encoded as, so the client can decode them. */
  frameFormat: z.enum(['png', 'jpeg']).default('png'),
  ms: z.number().nonnegative(),
  /** Deduped — an aspect drift is reported once, not once per frame. */
  warnings: z.array(RenderWarningSchema).default([]),
});
export type BatchRenderResponse = z.infer<typeof BatchRenderResponseSchema>;

/** Phase 2 — see docs/VIDEO.md. Stubbed behind the MF_VIDEO feature flag. */
export const VideoRenderRequestSchema = z.object({
  itemId: z.string().min(1),
  surfaceId: z.string().min(1),
  colorize: z.record(HexSchema).default({}),
  format: z.enum(['mp4', 'webm']).default('mp4'),
  /** Upload handle returned by the (future) multipart upload endpoint. */
  uploadId: z.string().min(1),
});
export type VideoRenderRequest = z.infer<typeof VideoRenderRequestSchema>;

export const VideoRenderResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'processing', 'done', 'failed']),
  posterUrl: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  message: z.string().optional(),
});
export type VideoRenderResponse = z.infer<typeof VideoRenderResponseSchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
  items: z.number().int().nonnegative(),
  features: z.object({ video: z.boolean() }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
