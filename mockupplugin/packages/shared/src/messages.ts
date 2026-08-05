import { z } from 'zod';
import { ItemDetailSchema, RenderWarningSchema } from './api.js';

/**
 * The postMessage protocol between the plugin UI (iframe) and the sandbox
 * (main thread). Both directions are Zod-validated at the boundary — an
 * unparseable message is dropped and logged rather than trusted.
 */

/** One surface of one imported item instance, resolved from pluginData. */
export const RenderTargetSurfaceSchema = z.object({
  surfaceId: z.string(),
  designNodeId: z.string(),
  /** Current pixel size of the user's design frame. */
  width: z.number(),
  height: z.number(),
  /** width / height as it stands now. */
  aspect: z.number(),
  /** The aspect the item's placeholder asked for. */
  expectedAspect: z.number(),
  /** Export width the sandbox will use. */
  exportWidth: z.number(),
  /** True when the frame is empty apart from the placeholder hint. */
  looksEmpty: z.boolean(),
});
export type RenderTargetSurface = z.infer<typeof RenderTargetSurfaceSchema>;

export const RenderTargetSchema = z.object({
  instanceGuid: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  itemNodeId: z.string(),
  surfaces: z.array(RenderTargetSurfaceSchema),
  colorize: z.record(z.string()),
});
export type RenderTarget = z.infer<typeof RenderTargetSchema>;

export const ExportedSurfaceSchema = RenderTargetSurfaceSchema.extend({
  /** Base64 PNG of the exported design frame. */
  design: z.string(),
});
export type ExportedSurface = z.infer<typeof ExportedSurfaceSchema>;

export const ExportedTargetSchema = RenderTargetSchema.extend({
  surfaces: z.array(ExportedSurfaceSchema),
});
export type ExportedTarget = z.infer<typeof ExportedTargetSchema>;

export const PluginConfigSchema = z.object({
  apiBase: z.string().url(),
  outputWidth: z.number().int().min(256).max(8192).nullable().default(null),
});
export type PluginConfig = z.infer<typeof PluginConfigSchema>;

/* ------------------------------------------------------------------ */
/* UI -> sandbox                                                       */
/* ------------------------------------------------------------------ */

export const UiToSandboxSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ui-ready') }),
  z.object({ type: z.literal('get-config') }),
  z.object({ type: z.literal('set-config'), config: PluginConfigSchema.partial() }),
  z.object({ type: z.literal('resize-ui'), width: z.number(), height: z.number() }),
  /** Place an item on canvas. The UI has already fetched the detail + preview. */
  z.object({
    type: z.literal('import-item'),
    detail: ItemDetailSchema,
    /** Base64 PNG of the flattened preview to use as the item frame's fill. */
    preview: z.string(),
  }),
  /** Re-resolve the current selection into render targets. */
  z.object({ type: z.literal('refresh-selection') }),
  /** Export design frames for the given instances so the UI can POST them. */
  z.object({
    type: z.literal('export-designs'),
    jobId: z.string(),
    instanceGuids: z.array(z.string()).min(1),
  }),
  /** Swap the item frame's fill with a finished render. */
  z.object({
    type: z.literal('apply-render'),
    instanceGuid: z.string(),
    png: z.string(),
    width: z.number(),
    height: z.number(),
    renderId: z.string(),
  }),
  z.object({
    type: z.literal('notify'),
    message: z.string(),
    error: z.boolean().default(false),
  }),
  z.object({ type: z.literal('focus-node'), nodeId: z.string() }),
]);
export type UiToSandbox = z.infer<typeof UiToSandboxSchema>;

/* ------------------------------------------------------------------ */
/* sandbox -> UI                                                       */
/* ------------------------------------------------------------------ */

export const SandboxToUiSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sandbox-ready'), config: PluginConfigSchema }),
  z.object({ type: z.literal('config'), config: PluginConfigSchema }),
  z.object({
    type: z.literal('selection-changed'),
    targets: z.array(RenderTargetSchema),
    /** Number of selected nodes that were not Mockup Forge nodes. */
    foreignCount: z.number(),
  }),
  z.object({
    type: z.literal('import-done'),
    instanceGuid: z.string(),
    itemId: z.string(),
    itemNodeId: z.string(),
  }),
  z.object({
    type: z.literal('designs-exported'),
    jobId: z.string(),
    targets: z.array(ExportedTargetSchema),
  }),
  z.object({
    type: z.literal('render-applied'),
    instanceGuid: z.string(),
    renderId: z.string(),
  }),
  z.object({
    type: z.literal('sandbox-error'),
    code: z.string(),
    message: z.string(),
    jobId: z.string().optional(),
  }),
  z.object({
    type: z.literal('warnings'),
    warnings: z.array(RenderWarningSchema),
  }),
]);
export type SandboxToUi = z.infer<typeof SandboxToUiSchema>;

/** Aspect ratios within this relative tolerance are treated as a match. */
export const ASPECT_TOLERANCE = 0.02;

/**
 * Relative aspect difference between an actual and expected ratio.
 * Symmetric, so a 2:1 vs 1:2 drift reads the same either way round.
 */
export function aspectDrift(actual: number, expected: number): number {
  if (!(actual > 0) || !(expected > 0)) return Infinity;
  return Math.abs(actual - expected) / expected;
}

export function aspectMatches(actual: number, expected: number, tol = ASPECT_TOLERANCE): boolean {
  return aspectDrift(actual, expected) <= tol;
}
