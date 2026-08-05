import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  MockupItemSchema,
  denormalize,
  svgPoints,
  warpGeometry,
  type Layer,
  type MockupItem,
  type Point,
} from '@mf/shared';
import { ITEMS_DIR } from '../config.js';
import {
  highlightMapSvg,
  polygonMaskSvg,
  shadowMapSvg,
  svg,
  svgToOpaquePng,
  svgToPng,
  thumbnail,
  wrinklePng,
  type Size,
} from './raster.js';
import { SEED_SPECS, surfacePolygon, type SeedSpec } from './specs.js';

/**
 * Builds the seed catalog: ten items covering every warp type, written as
 * self-contained packages under assets/items/<id>/.
 *
 * Masks, lighting maps and displacement maps are all derived from each spec's
 * warp geometry, so an item's alpha mask always matches the region its warp
 * actually writes to.
 */

function px(points: Point[], size: Size): Point[] {
  return denormalize(points, size.width, size.height);
}

async function buildItem(spec: SeedSpec): Promise<{ item: MockupItem; files: Map<string, Buffer> }> {
  const files = new Map<string, Buffer>();
  const canvas = spec.canvas;
  const layers: Layer[] = [];

  // --- base photography -------------------------------------------------
  const basePng = await svgToOpaquePng(svg(canvas, spec.baseSvg));
  files.set('base.png', basePng);
  layers.push({ type: 'base', src: 'base.png' });

  // --- colorize layers (composited over the base, beneath the design) ----
  for (const colour of spec.colorize ?? []) {
    const maskName = `mask-color-${colour.id}.png`;
    files.set(
      maskName,
      await svgToPng(
        polygonMaskSvg(
          canvas,
          colour.regions.map((region) => px(region, canvas)),
          colour.feather ?? 2,
          colour.extraMaskSvg ?? '',
        ),
      ),
    );
    layers.push({
      type: 'colorize',
      id: colour.id,
      label: colour.label,
      mask: maskName,
      default: colour.default,
    });
  }

  // --- surfaces ---------------------------------------------------------
  for (const surface of spec.surfaces) {
    const polygon = px(surfacePolygon(surface.warp), canvas);

    const maskName = `mask-${surface.id}.png`;
    files.set(maskName, await svgToPng(polygonMaskSvg(canvas, [polygon], surface.feather ?? 2)));

    let lighting: { multiply?: string; multiplyOpacity: number; screen?: string; screenOpacity: number } | undefined;
    if (surface.shadow || surface.highlight) {
      lighting = { multiplyOpacity: 1, screenOpacity: 1 };
      if (surface.shadow) {
        const name = `shadow-${surface.id}.png`;
        files.set(name, await svgToPng(shadowMapSvg(canvas, [polygon], surface.shadow)));
        lighting.multiply = name;
      }
      if (surface.highlight) {
        const name = `highlight-${surface.id}.png`;
        files.set(name, await svgToPng(highlightMapSvg(canvas, [polygon], surface.highlight)));
        lighting.screen = name;
      }
    }

    // Displacement maps are authored at half canvas width — wrinkle detail is
    // low frequency, and the renderer samples the map in normalized space.
    if (surface.warp.kind === 'displacement') {
      const mapSize: Size = surface.wrinkle?.size ?? {
        width: Math.round(canvas.width / 2),
        height: Math.round(canvas.height / 2),
      };
      files.set(surface.warp.map, await wrinklePng(mapSize, surface.wrinkle ?? {}));
    }

    layers.push({
      type: 'surface',
      id: surface.id,
      label: surface.label,
      placeholder: {
        aspect: surface.aspect,
        recommendedWidth: surface.recommendedWidth,
        recommendedHeight: surface.recommendedHeight,
        hint: 'Place your design here, then click Render',
      },
      warp: surface.warp,
      ...(lighting ? { lighting } : {}),
      mask: maskName,
      opacity: 1,
      blend: 'normal',
    });
  }

  // --- overlays ---------------------------------------------------------
  for (const overlay of spec.overlays ?? []) {
    files.set(overlay.name, await svgToPng(svg(canvas, overlay.svg)));
    layers.push({
      type: 'overlay',
      src: overlay.name,
      blend: overlay.blend,
      opacity: overlay.opacity ?? 1,
    });
  }

  // --- preview + thumbnail ---------------------------------------------
  // The preview is what lands on canvas at import time: the product with its
  // print areas blocked in flat, so an un-rendered mockup still reads clearly.
  const emptyRegions = spec.surfaces
    .map((s) => `<polygon points="${svgPoints(px(surfacePolygon(s.warp), canvas))}" fill="${
      spec.emptyFill ?? '#e8e8e8'
    }"/>`)
    .join('');

  const previewLayers: sharp.OverlayOptions[] = [
    { input: await svgToPng(svg(canvas, emptyRegions)), blend: 'over' },
  ];
  for (const overlay of spec.overlays ?? []) {
    const buffer = files.get(overlay.name);
    if (!buffer) continue;
    previewLayers.push({
      input: buffer,
      blend: overlay.blend === 'multiply' ? 'multiply' : overlay.blend === 'screen' ? 'screen' : 'over',
    });
  }

  const previewPng = await sharp(basePng).composite(previewLayers).png({ compressionLevel: 9 }).toBuffer();
  files.set('preview.png', previewPng);
  files.set('thumbnail.png', await thumbnail(previewPng, 480));

  const item = MockupItemSchema.parse({
    id: spec.id,
    name: spec.name,
    category: spec.category,
    viewpoint: spec.viewpoint,
    tags: spec.tags,
    canvas,
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  } satisfies Record<string, unknown>);

  return { item, files };
}

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const specs = only.length ? SEED_SPECS.filter((s) => only.includes(s.id)) : SEED_SPECS;
  if (specs.length === 0) {
    console.error(`No matching seed items. Known ids:\n  ${SEED_SPECS.map((s) => s.id).join('\n  ')}`);
    process.exit(1);
  }

  await fs.mkdir(ITEMS_DIR, { recursive: true });

  for (const spec of specs) {
    const started = Date.now();
    const { item, files } = await buildItem(spec);
    const dir = path.join(ITEMS_DIR, item.id);
    await fs.mkdir(dir, { recursive: true });

    for (const [name, buffer] of files) {
      await fs.writeFile(path.join(dir, name), buffer);
    }
    await fs.writeFile(path.join(dir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

    const warps = item.layers
      .filter((l) => l.type === 'surface')
      .map((l) => (l.type === 'surface' ? warpGeometry(l.warp).kind + (l.warp.kind === 'displacement' ? '+displacement' : '') : ''))
      .join(', ');
    console.log(
      `${item.id.padEnd(28)} ${String(files.size + 1).padStart(2)} files  ${warps.padEnd(22)} ${
        Date.now() - started
      }ms`,
    );
  }

  console.log(`\nWrote ${specs.length} item${specs.length === 1 ? '' : 's'} to ${ITEMS_DIR}`);
}

await main();
