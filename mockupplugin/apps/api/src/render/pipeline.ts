import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  aspectDrift,
  ASPECT_TOLERANCE,
  denormalize,
  meshOutline,
  quadPoints,
  warpGeometry,
  type MockupItem,
  type Point,
  type RenderRequest,
  type RenderWarning,
  type SurfaceLayer,
  type Warp,
} from '@mf/shared';
import { catalog } from '../catalog/store.js';
import { config } from '../config.js';
import { ApiFailure } from '../errors.js';
import { decodeDesign, loadDisplacement, loadGray, loadRgba, type RawImage } from './assets.js';
import { Canvas, hexToRgb255 } from './compositor.js';
import {
  homographySampler,
  meshSampler,
  surfaceBounds,
  warpSurface,
  type DisplacementField,
  type Sampler,
} from './warp.js';

/**
 * The render pipeline.
 *
 * Layers are composited strictly in the order the item declares them, which for
 * the seed catalog is: base photograph, colorize layers, warped design
 * surfaces, then overlays. Declaration order *is* draw order — there is no
 * implicit reordering by layer type, so an item that needs an overlay beneath a
 * surface can simply say so.
 */

export interface RenderOutcome {
  renderId: string;
  png: Buffer;
  width: number;
  height: number;
  ms: number;
  warnings: RenderWarning[];
}

/** Decoded design pixels can be large; cap them well below the canvas budget. */
const MAX_DESIGN_PIXELS = 40_000_000;

export async function renderItem(request: RenderRequest): Promise<RenderOutcome> {
  const started = Date.now();
  const renderId = randomUUID();
  const { item } = catalog.entry(request.itemId);
  const warnings: RenderWarning[] = [];

  const { width, height, scale } = outputSize(item, request.outputWidth);

  const surfaces = new Map<string, SurfaceLayer>();
  for (const layer of item.layers) {
    if (layer.type === 'surface') surfaces.set(layer.id, layer);
  }

  // Validate every requested surface before doing any expensive work.
  for (const design of request.designs) {
    if (!surfaces.has(design.surfaceId)) {
      throw new ApiFailure(
        'bad_request',
        `"${request.itemId}" has no surface called "${design.surfaceId}". Available: ${[
          ...surfaces.keys(),
        ].join(', ')}.`,
      );
    }
  }
  for (const id of Object.keys(request.colorize)) {
    const known = item.layers.some((l) => l.type === 'colorize' && l.id === id);
    if (!known) {
      warnings.push({
        code: 'colorize_unknown',
        message: `Ignored unknown colour "${id}" for this mockup.`,
      });
    }
  }

  const base = await loadRgba(item.id, baseSrc(item), width, height);
  const canvas = new Canvas(width, height, base);

  for (const layer of item.layers) {
    switch (layer.type) {
      case 'base':
        // Already drawn as the canvas' starting state.
        break;

      case 'colorize': {
        const requested = request.colorize[layer.id];
        if (!requested || requested.toLowerCase() === layer.default.toLowerCase()) break;
        const mask = await loadGray(item.id, layer.mask, width, height);
        canvas.colorize(mask, hexToRgb255(layer.default), hexToRgb255(requested));
        break;
      }

      case 'surface': {
        const design = request.designs.find((d) => d.surfaceId === layer.id);
        if (!design) break;

        const drift = checkAspect(layer, design.width, design.height);
        if (drift) {
          if (!request.allowAspectDrift) {
            const name = layer.label ?? layer.id;
            throw new ApiFailure(
              'aspect_mismatch',
              `The design frame for "${name}" is ${ratio(
                design.width! / design.height!,
              )} but this surface expects ${ratio(
                layer.placeholder.aspect,
              )}. Resize the frame, or allow stretching to render anyway.`,
              undefined,
              { surfaceId: layer.id },
            );
          }
          warnings.push(drift);
        }

        // A corrupt or non-image upload is the caller's problem, not a server
        // fault — say so, and say what to do about it.
        let decoded;
        try {
          decoded = await decodeDesign(Buffer.from(design.design, 'base64'), {
            maxPixels: MAX_DESIGN_PIXELS,
          });
        } catch (err) {
          throw new ApiFailure(
            'unsupported_media',
            `The design sent for "${
              layer.label ?? layer.id
            }" could not be read as an image. Re-export the frame and try again.`,
            undefined,
            { surfaceId: layer.id, reason: (err as Error).message },
          );
        }

        if (
          decoded.width < layer.placeholder.recommendedWidth * 0.5 &&
          decoded.width < width * 0.25
        ) {
          warnings.push({
            code: 'design_upscaled',
            surfaceId: layer.id,
            message: `The design for "${
              layer.label ?? layer.id
            }" is ${decoded.width}px wide and will be upscaled. ${
              layer.placeholder.recommendedWidth
            }px gives a sharper result.`,
          });
        }

        const points = destinationPoints(layer.warp, width, height);
        const bounds = surfaceBounds(points, { width, height });
        const sampler = buildSampler(layer.warp, decoded, bounds, width, height);
        if (!sampler) {
          throw new ApiFailure(
            'render_failed',
            `The warp definition for surface "${layer.id}" is degenerate and cannot be solved.`,
          );
        }

        const displacement =
          layer.warp.kind === 'displacement'
            ? await loadDisplacementField(item.id, layer.warp, scale)
            : undefined;

        const warped = warpSurface({
          source: decoded.data,
          sourceWidth: decoded.width,
          sourceHeight: decoded.height,
          sampler,
          bounds,
          canvasWidth: width,
          canvasHeight: height,
          ...(displacement ? { displacement } : {}),
        });

        canvas.drawSurface(warped, {
          ...(layer.mask ? { mask: await loadGray(item.id, layer.mask, width, height) } : {}),
          ...(layer.lighting?.multiply
            ? {
                multiply: await loadGray(item.id, layer.lighting.multiply, width, height),
                multiplyOpacity: layer.lighting.multiplyOpacity,
              }
            : {}),
          ...(layer.lighting?.screen
            ? {
                screen: await loadGray(item.id, layer.lighting.screen, width, height),
                screenOpacity: layer.lighting.screenOpacity,
              }
            : {}),
          opacity: layer.opacity,
          blend: layer.blend,
        });
        break;
      }

      case 'overlay': {
        const overlay = await loadRgba(item.id, layer.src, width, height);
        canvas.drawOverlay(overlay, layer.blend, layer.opacity);
        break;
      }
    }
  }

  const png = await sharp(canvas.toBuffer(), { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return { renderId, png, width, height, ms: Date.now() - started, warnings };
}

export interface SequenceRequest {
  itemId: string;
  surfaceId: string;
  /** Decoded PNG bytes, one per frame, all the same pixel size. */
  frames: Buffer[];
  frameWidth: number;
  frameHeight: number;
  colorize: Record<string, string>;
  outputWidth?: number;
}

export interface SequenceOutcome {
  renderId: string;
  frames: Buffer[];
  width: number;
  height: number;
  ms: number;
  warnings: RenderWarning[];
}

/**
 * Renders many designs onto ONE surface of an item — the video path.
 *
 * `renderItem` is correct for this but wasteful: everything except the design
 * pixels is frame-invariant. This hoists all of it out of the loop —
 * the composited base + colorize canvas is baked once and copied per frame,
 * the warp sampler (including the mesh's triangulated index raster) is built
 * once, and masks, lighting maps, displacement fields and overlays are loaded
 * once. Per frame, only decode → warp → composite → encode remains.
 */
export async function renderSequence(request: SequenceRequest): Promise<SequenceOutcome> {
  const started = Date.now();
  const renderId = randomUUID();
  const { item } = catalog.entry(request.itemId);
  const warnings: RenderWarning[] = [];

  const { width, height, scale } = outputSize(item, request.outputWidth);

  const surfaceIndex = item.layers.findIndex(
    (l) => l.type === 'surface' && l.id === request.surfaceId,
  );
  const surface = item.layers[surfaceIndex];
  if (!surface || surface.type !== 'surface') {
    throw new ApiFailure(
      'bad_request',
      `"${request.itemId}" has no surface called "${request.surfaceId}". Available: ${item.layers
        .filter((l) => l.type === 'surface')
        .map((l) => (l.type === 'surface' ? l.id : ''))
        .join(', ')}.`,
    );
  }

  for (const id of Object.keys(request.colorize)) {
    if (!item.layers.some((l) => l.type === 'colorize' && l.id === id)) {
      warnings.push({
        code: 'colorize_unknown',
        message: `Ignored unknown colour "${id}" for this mockup.`,
      });
    }
  }

  const drift = checkAspect(surface, request.frameWidth, request.frameHeight);
  if (drift) warnings.push(drift);

  // --- bake everything before the surface: base photo + colorize ---------
  const base = await loadRgba(item.id, baseSrc(item), width, height);
  const baked = new Canvas(width, height, base);
  for (const layer of item.layers.slice(0, surfaceIndex)) {
    if (layer.type !== 'colorize') continue;
    const requested = request.colorize[layer.id];
    if (!requested || requested.toLowerCase() === layer.default.toLowerCase()) continue;
    baked.colorize(
      await loadGray(item.id, layer.mask, width, height),
      hexToRgb255(layer.default),
      hexToRgb255(requested),
    );
  }
  const bakedSnapshot: RawImage = { data: baked.data, width, height, channels: 4 };

  // --- frame-invariant surface machinery ---------------------------------
  const points = destinationPoints(surface.warp, width, height);
  const bounds = surfaceBounds(points, { width, height });

  const first = await decodeDesign(request.frames[0] ?? Buffer.alloc(0), {
    maxPixels: MAX_DESIGN_PIXELS,
  }).catch(() => {
    throw new ApiFailure('unsupported_media', 'The first frame could not be read as an image.');
  });

  const sampler = buildSampler(surface.warp, first, bounds, width, height);
  if (!sampler) {
    throw new ApiFailure(
      'render_failed',
      `The warp definition for surface "${surface.id}" is degenerate and cannot be solved.`,
    );
  }

  const displacement =
    surface.warp.kind === 'displacement'
      ? await loadDisplacementField(item.id, surface.warp, scale)
      : undefined;

  const mask = surface.mask ? await loadGray(item.id, surface.mask, width, height) : undefined;
  const multiply = surface.lighting?.multiply
    ? await loadGray(item.id, surface.lighting.multiply, width, height)
    : undefined;
  const screen = surface.lighting?.screen
    ? await loadGray(item.id, surface.lighting.screen, width, height)
    : undefined;

  // Layers above the surface (overlays) are loaded once, applied per frame.
  const after: { image: RawImage; blend: OverlayBlend; opacity: number }[] = [];
  for (const layer of item.layers.slice(surfaceIndex + 1)) {
    if (layer.type !== 'overlay') continue;
    after.push({
      image: await loadRgba(item.id, layer.src, width, height),
      blend: layer.blend,
      opacity: layer.opacity,
    });
  }

  // --- per-frame loop -----------------------------------------------------
  const out: Buffer[] = [];
  for (const [index, frame] of request.frames.entries()) {
    const decoded =
      index === 0
        ? first
        : await decodeDesign(frame, { maxPixels: MAX_DESIGN_PIXELS }).catch(() => {
            throw new ApiFailure('unsupported_media', `Frame ${index} could not be read as an image.`);
          });

    // The sampler was solved for the first frame's dimensions; a stray
    // different-sized frame would warp with the wrong scale silently.
    if (decoded.width !== first.width || decoded.height !== first.height) {
      throw new ApiFailure(
        'bad_request',
        `Frame ${index} is ${decoded.width}x${decoded.height} but the batch started at ${first.width}x${first.height}. All frames in a batch must match.`,
      );
    }

    const canvas = new Canvas(width, height, bakedSnapshot);

    const warped = warpSurface({
      source: decoded.data,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      sampler,
      bounds,
      canvasWidth: width,
      canvasHeight: height,
      ...(displacement ? { displacement } : {}),
    });

    canvas.drawSurface(warped, {
      ...(mask ? { mask } : {}),
      ...(multiply ? { multiply, multiplyOpacity: surface.lighting?.multiplyOpacity } : {}),
      ...(screen ? { screen, screenOpacity: surface.lighting?.screenOpacity } : {}),
      opacity: surface.opacity,
      blend: surface.blend,
    });

    for (const overlay of after) {
      canvas.drawOverlay(overlay.image, overlay.blend, overlay.opacity);
    }

    out.push(
      await sharp(canvas.toBuffer(), { raw: { width, height, channels: 4 } })
        .png({ compressionLevel: 6 })
        .toBuffer(),
    );
  }

  return { renderId, frames: out, width, height, ms: Date.now() - started, warnings };
}

type OverlayBlend = Parameters<Canvas['drawOverlay']>[1];

function baseSrc(item: MockupItem): string {
  const base = item.layers.find((l) => l.type === 'base');
  if (!base || base.type !== 'base') {
    throw new ApiFailure('render_failed', `Item "${item.id}" has no base layer.`);
  }
  return base.src;
}

function outputSize(
  item: MockupItem,
  requested: number | undefined,
): { width: number; height: number; scale: number } {
  const width = Math.min(item.canvas.width, requested ?? item.canvas.width);
  const scale = width / item.canvas.width;
  return { width, height: Math.max(1, Math.round(item.canvas.height * scale)), scale };
}

/** Destination geometry in output pixels. */
function destinationPoints(warp: Warp, width: number, height: number): Point[] {
  const geometry = warpGeometry(warp);
  const normalized =
    geometry.kind === 'homography' ? quadPoints(geometry.corners) : meshOutline(geometry);
  return denormalize(normalized, width, height);
}

function buildSampler(
  warp: Warp,
  source: { width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
): Sampler | null {
  const geometry = warpGeometry(warp);

  if (geometry.kind === 'homography') {
    return homographySampler(
      {
        tl: scalePoint(geometry.corners.tl, width, height),
        tr: scalePoint(geometry.corners.tr, width, height),
        br: scalePoint(geometry.corners.br, width, height),
        bl: scalePoint(geometry.corners.bl, width, height),
      },
      source,
    );
  }

  return meshSampler(
    {
      ...geometry,
      points: geometry.points.map((p) => scalePoint(p, width, height)),
    },
    source,
    bounds,
  );
}

function scalePoint(point: Point, width: number, height: number): Point {
  return { x: point.x * width, y: point.y * height };
}

async function loadDisplacementField(
  itemId: string,
  warp: Extract<Warp, { kind: 'displacement' }>,
  scale: number,
): Promise<DisplacementField> {
  const map: RawImage = await loadDisplacement(itemId, warp.map);
  return {
    data: map.data,
    width: map.width,
    height: map.height,
    channels: map.channels,
    // `scale` is authored in full-resolution canvas pixels, so a half-size
    // preview must displace by half as much or the wrinkles get twice as deep.
    scale: warp.scale * scale,
    vector: warp.vector,
  };
}

/**
 * Aspect drift check. Users scale design frames freely, so a small difference is
 * normal and only worth a warning; the render still proceeds and simply
 * stretches the artwork onto the surface.
 */
function checkAspect(
  layer: SurfaceLayer,
  width: number | undefined,
  height: number | undefined,
): RenderWarning | null {
  if (!width || !height) return null;
  const actual = width / height;
  const drift = aspectDrift(actual, layer.placeholder.aspect);
  if (drift <= ASPECT_TOLERANCE) return null;

  return {
    code: 'aspect_drift',
    surfaceId: layer.id,
    message: `The design frame for "${layer.label ?? layer.id}" is ${ratio(actual)} but this surface expects ${ratio(
      layer.placeholder.aspect,
    )}. The artwork will be stretched to fit.`,
  };
}

function ratio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

export const RENDER_TIMEOUT_MS = config.RENDER_TIMEOUT_MS;
