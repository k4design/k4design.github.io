/**
 * Authors tshirt-back-room-01 from a photograph plus the displacement/normal
 * maps exported alongside it (assets/sources/shirt-back*).
 *
 * This is the first item whose fabric distortion comes from the real garment
 * rather than procedural noise, so the artwork bends along the creases that are
 * actually in the photo. Two things had to be handled:
 *
 * 1. The map was exported with highPassRadius: 0, so it carries overall
 *    brightness rather than fold detail — measured mean 206 inside the shirt
 *    against 63 in the background. Fed in raw that is a near-constant offset,
 *    not a ripple. Subtracting a blurred copy and recentring on 128 turns it
 *    into true fold detail (measured mean 128, range 14-209 over the garment).
 *
 * 2. The same high-passed signal doubles as lighting. Where a crease sits below
 *    neutral it becomes a multiply shadow; where it catches light it becomes a
 *    screen highlight. So the print picks up the garment's own folds instead of
 *    the invented gradients the synthetic items use.
 *
 * The normal map is staged next to the source but not used: it is nearly flat
 * (R/G span 113-138 of 0-255) and the renderer has no relighting path yet, so
 * as vector displacement it would do less than the height map does.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  fabricMesh,
  MockupItemSchema,
  meshOutline,
  rectQuad,
  svgPoints,
  denormalize,
  type Layer,
} from '@mf/shared';
import { polygonMaskSvg, svg, svgToPng, thumbnail } from '../apps/api/src/seed/raster.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = path.join(ROOT, 'assets', 'sources');
const OUT_DIR = path.join(ROOT, 'assets', 'items', 'tshirt-back-room-01');

/** Print area on the upper back, normalized: x, y, width, height. */
const PRINT = { x: 0.3938, y: 0.4012, w: 0.2876, h: 0.2802 };
/** Radius of the blur subtracted to isolate fold detail from overall shading. */
const HIGH_PASS_RADIUS = 18;
/** How hard the folds shade the artwork. */
const SHADE_GAIN = 1.7;

async function main(): Promise<void> {
  const basePath = path.join(SOURCES, 'shirt-back.png');
  const dispPath = path.join(SOURCES, 'shirt-back_disp.png');
  const meta = JSON.parse(
    await fs.readFile(path.join(SOURCES, 'shirt-back_maps.json'), 'utf8'),
  ) as { displacementScalePx: number; neutral: number; mapSize: { width: number; height: number } };

  const info = await sharp(basePath).metadata();
  const width = info.width!;
  const height = info.height!;
  if (meta.mapSize.width !== width || meta.mapSize.height !== height) {
    console.warn(
      `note: maps are ${meta.mapSize.width}x${meta.mapSize.height} but the photo is ${width}x${height};` +
        ' displacement is sampled in normalized space so this still works, at reduced detail.',
    );
  }

  // --- high-pass the supplied height map -------------------------------
  const raw = await sharp(dispPath).greyscale().raw().toBuffer();
  const blurred = await sharp(dispPath).greyscale().blur(HIGH_PASS_RADIUS).raw().toBuffer();

  const detail = Buffer.alloc(width * height);
  const shadow = Buffer.alloc(width * height);
  const highlight = Buffer.alloc(width * height);

  for (let i = 0; i < detail.length; i += 1) {
    const hp = Math.max(0, Math.min(255, meta.neutral + (raw[i]! - blurred[i]!)));
    detail[i] = hp;
    // Below neutral is a crease: darken. Above neutral catches light: lift.
    const below = Math.max(0, meta.neutral - hp);
    const above = Math.max(0, hp - meta.neutral);
    shadow[i] = Math.max(0, Math.min(255, 255 - Math.round(below * SHADE_GAIN)));
    highlight[i] = Math.max(0, Math.min(255, Math.round(above * SHADE_GAIN)));
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = new Map<string, Buffer>();
  const grey = (buffer: Buffer) =>
    sharp(buffer, { raw: { width, height, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer();

  files.set(
    'base.png',
    await sharp(basePath).flatten({ background: '#ffffff' }).png({ compressionLevel: 9 }).toBuffer(),
  );
  files.set('displace-back.png', await grey(detail));
  files.set('shadow-back.png', await grey(shadow));
  files.set('highlight-back.png', await grey(highlight));

  // --- geometry: gentle cloth sag, then the real folds on top ------------
  const region = rectQuad(PRINT.x, PRINT.y, PRINT.w, PRINT.h);
  const mesh = fabricMesh(region, { cols: 10, rows: 10, sag: 0.012, drift: 0.005 });
  const outlinePx = denormalize(meshOutline(mesh), width, height);

  files.set('mask-back.png', await svgToPng(polygonMaskSvg({ width, height }, [outlinePx], 3)));

  const preview = await sharp(files.get('base.png')!)
    .composite([
      {
        input: await svgToPng(
          svg({ width, height }, `<polygon points="${svgPoints(outlinePx)}" fill="#e8e8e8"/>`),
        ),
        blend: 'over',
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  files.set('preview.png', preview);
  files.set('thumbnail.png', await thumbnail(preview, 480));

  const aspect = (PRINT.w * width) / (PRINT.h * height);
  const recommendedWidth = 1200;

  const layers: Layer[] = [
    { type: 'base', src: 'base.png' },
    {
      type: 'surface',
      id: 'back',
      label: 'Back print',
      placeholder: {
        aspect,
        recommendedWidth,
        recommendedHeight: Math.round(recommendedWidth / aspect),
        hint: 'Place your design here, then click Render',
      },
      warp: {
        kind: 'displacement',
        geometry: mesh,
        map: 'displace-back.png',
        scale: meta.displacementScalePx,
        vector: false,
      },
      lighting: {
        multiply: 'shadow-back.png',
        multiplyOpacity: 1,
        screen: 'highlight-back.png',
        screenOpacity: 0.85,
      },
      mask: 'mask-back.png',
      opacity: 1,
      blend: 'normal',
    },
  ];

  const item = MockupItemSchema.parse({
    id: 'tshirt-back-room-01',
    name: 'Oversized Tee, Back',
    category: 'apparel',
    viewpoint: 'scene',
    tags: ['tshirt', 'tee', 'back print', 'apparel', 'oversized', 'worn', 'streetwear', 'lifestyle'],
    canvas: { width, height },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  for (const [name, buffer] of files) await fs.writeFile(path.join(OUT_DIR, name), buffer);
  await fs.writeFile(path.join(OUT_DIR, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

  console.log(
    `✓ ${item.id}: ${files.size + 1} files, canvas ${width}x${height}, ` +
      `displacement ${meta.displacementScalePx}px from the supplied map, aspect ${aspect.toFixed(3)}`,
  );
}

await main();
