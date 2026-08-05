/**
 * Authors the curved-display-01 item from assets/sources/curved-display.png —
 * a keynote-style concave LED wall photographed head-on.
 *
 * Nothing here is hand-placed. The screen is the only near-white region in the
 * photo, so the script thresholds it and derives everything from the
 * measurement:
 *
 * - the warp mesh's top and bottom edges are the measured arcs;
 * - horizontal design distribution is equalized by local screen height — the
 *   screen is ~27% taller at its edges because the concave wall is nearer to
 *   camera there, and pixels-per-design-unit scales the same way, so columns
 *   are placed where equal slices of the *design* land rather than equal
 *   slices of the photo;
 * - the alpha mask is the thresholded region itself, per-pixel, which follows
 *   the arcs exactly where a polygon would chord across them;
 * - the placeholder aspect is the integrated design width over the mean
 *   height, i.e. the panorama's true shape rather than its bounding box.
 *
 * Deterministic: same photo in, same item out. Re-run after changing the
 * source, then restart the API.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MockupItemSchema, meshOutline, svgPoints, type Layer, type MeshGeometry, type Point } from '@mf/shared';
import { shadowMapSvg, svg, svgToPng, thumbnail } from '../apps/api/src/seed/raster.js';

const SOURCE = path.resolve(import.meta.dirname, '../assets/sources/curved-display.png');
const OUT_DIR = path.resolve(import.meta.dirname, '../assets/items/curved-display-01');

/** Pixels at least this bright on all channels count as screen. */
const WHITE = 200;
/** A column's white run must be at least this tall to count as screen, which
 *  filters out the ceiling ring's small point lights. */
const MIN_RUN = 80;

const COLS = 16;
const ROWS = 4;

interface Edges {
  x0: number;
  x1: number;
  top: Int32Array;
  bottom: Int32Array;
}

function measure(data: Buffer, width: number, height: number, channels: number): Edges {
  const top = new Int32Array(width).fill(-1);
  const bottom = new Int32Array(width).fill(-1);
  let x0 = -1;
  let x1 = -1;

  for (let x = 0; x < width; x += 1) {
    let bestLength = 0;
    let runStart = -1;
    for (let y = 0; y <= height; y += 1) {
      const index = (y * width + x) * channels;
      const white =
        y < height && data[index]! > WHITE && data[index + 1]! > WHITE && data[index + 2]! > WHITE;
      if (white && runStart < 0) runStart = y;
      if (!white && runStart >= 0) {
        const length = y - runStart;
        if (length > bestLength) {
          bestLength = length;
          top[x] = runStart;
          bottom[x] = y - 1;
        }
        runStart = -1;
      }
    }
    if (bestLength >= MIN_RUN) {
      if (x0 < 0) x0 = x;
      x1 = x;
    } else {
      top[x] = -1;
      bottom[x] = -1;
    }
  }

  if (x0 < 0 || x1 - x0 < 100) {
    throw new Error('Could not find the screen: no sufficiently tall white region.');
  }
  return { x0, x1, top, bottom };
}

/** Median of the valid measurements in a +-4px window, to shrug off noise. */
function sampleEdge(edge: Int32Array, x: number, x0: number, x1: number): number {
  const values: number[] = [];
  for (let dx = -4; dx <= 4; dx += 1) {
    const xx = Math.min(x1, Math.max(x0, x + dx));
    const v = edge[xx]!;
    if (v >= 0) values.push(v);
  }
  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  if (median === undefined) throw new Error(`no edge measurement near x=${x}`);
  return median;
}

async function main(): Promise<void> {
  const image = sharp(SOURCE);
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const edges = measure(data, width, height, channels);
  const screenHeight = (x: number) =>
    sampleEdge(edges.bottom, x, edges.x0, edges.x1) - sampleEdge(edges.top, x, edges.x0, edges.x1);

  // --- horizontal equalization -----------------------------------------
  // Design units advance per photo pixel in proportion to 1 / distance, and
  // the screen's pixel height measures exactly that. Integrate 1/h(x) across
  // the span, then place mesh columns at equal fractions of that integral.
  const cumulative: number[] = [0];
  for (let x = edges.x0; x < edges.x1; x += 1) {
    cumulative.push(cumulative[cumulative.length - 1]! + 1 / screenHeight(x));
  }
  const total = cumulative[cumulative.length - 1]!;

  const columnX = (k: number): number => {
    const target = (total * k) / COLS;
    // Binary search the cumulative integral.
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid]! < target) lo = mid + 1;
      else hi = mid;
    }
    return edges.x0 + lo;
  };

  // --- mesh --------------------------------------------------------------
  const points: Point[] = [];
  for (let row = 0; row <= ROWS; row += 1) {
    const v = row / ROWS;
    for (let k = 0; k <= COLS; k += 1) {
      const x = columnX(k);
      const topY = sampleEdge(edges.top, x, edges.x0, edges.x1);
      const bottomY = sampleEdge(edges.bottom, x, edges.x0, edges.x1);
      points.push({ x: x / width, y: (topY + (bottomY - topY) * v) / height });
    }
  }
  const mesh: MeshGeometry = { kind: 'mesh', rows: ROWS, cols: COLS, points };

  // True panorama shape: integrated design width over unit height.
  const aspect = total;
  const recommendedWidth = 2880;
  const recommendedHeight = Math.round(recommendedWidth / aspect);

  console.log(
    `screen x ${edges.x0}..${edges.x1}, heights ${screenHeight(edges.x0)}px edge / ${screenHeight(
      Math.round((edges.x0 + edges.x1) / 2),
    )}px centre, aspect ${aspect.toFixed(2)}:1`,
  );

  // --- assets --------------------------------------------------------------
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = new Map<string, Buffer>();

  files.set(
    'base.png',
    await sharp(SOURCE).flatten({ background: '#000000' }).png({ compressionLevel: 9 }).toBuffer(),
  );

  // Per-pixel mask straight from the threshold — it follows the measured arcs
  // exactly, where any polygon would chord across them.
  const maskData = Buffer.alloc(width * height);
  for (let x = edges.x0; x <= edges.x1; x += 1) {
    const t = edges.top[x]!;
    const b = edges.bottom[x]!;
    if (t < 0) continue;
    for (let y = t; y <= b; y += 1) maskData[y * width + x] = 255;
  }
  files.set(
    'mask-screen.png',
    await sharp(maskData, { raw: { width, height, channels: 1 } })
      .blur(1.2)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  // Gentle edge falloff so the curvature reads on flat artwork. The screen is
  // emissive, so this stays subtle.
  const outlinePx = meshOutline(mesh).map((p) => ({ x: p.x * width, y: p.y * height }));
  files.set(
    'shadow-screen.png',
    await svgToPng(
      shadowMapSvg({ width, height }, [outlinePx], { direction: 'horizontal', strength: 0.16 }),
    ),
  );

  const previewPng = await sharp(files.get('base.png')!)
    .composite([
      {
        input: await svgToPng(
          svg(
            { width, height },
            `<polygon points="${svgPoints(outlinePx)}" fill="#e9ecef"/>`,
          ),
        ),
        blend: 'over',
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  files.set('preview.png', previewPng);
  files.set('thumbnail.png', await thumbnail(previewPng, 480));

  const layers: Layer[] = [
    { type: 'base', src: 'base.png' },
    {
      type: 'surface',
      id: 'screen',
      label: 'Screen',
      placeholder: {
        aspect,
        recommendedWidth,
        recommendedHeight,
        hint: 'Place your design here, then click Render',
      },
      warp: mesh,
      lighting: { multiply: 'shadow-screen.png', multiplyOpacity: 1, screenOpacity: 1 },
      mask: 'mask-screen.png',
      opacity: 1,
      blend: 'normal',
    },
  ];

  const item = MockupItemSchema.parse({
    id: 'curved-display-01',
    name: 'Curved LED Display',
    category: 'devices',
    viewpoint: 'scene',
    tags: ['display', 'led', 'screen', 'keynote', 'stage', 'curved', 'panorama', 'event'],
    canvas: { width, height },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  for (const [name, buffer] of files) await fs.writeFile(path.join(OUT_DIR, name), buffer);
  await fs.writeFile(path.join(OUT_DIR, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

  console.log(`✓ Wrote ${files.size + 1} files to ${OUT_DIR}`);
  console.log(`  placeholder ${recommendedWidth}x${recommendedHeight} (${aspect.toFixed(2)}:1)`);
}

await main();
