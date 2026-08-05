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
            throw new ApiFailure(
              'aspect_mismatch',
              drift.message,
              undefined,
              { surfaceId: layer.id },
            );
          }
          warnings.push(drift);
        }

        const decoded = await decodeDesign(Buffer.from(design.design, 'base64'), {
          maxPixels: MAX_DESIGN_PIXELS,
        });

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
