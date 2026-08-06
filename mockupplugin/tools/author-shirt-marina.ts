/**
 * Re-authors tshirt-marina-01 so the print covers the **whole garment**, using
 * the displacement/shading maps that were dropped into the item folder
 * (displace-chest.png, shadow-chest.png, highlight-chest.png).
 *
 * Those three files are the user's own export and this tool never rewrites
 * them; it only measures the photo, builds the garment mask and geometry, and
 * emits item.json around them. The `-chest` filenames and the `chest` surface
 * id are kept deliberately even though the surface is now the entire shirt: the
 * generator that produced the maps writes those names, so renaming here would
 * break the next re-export.
 *
 * Segmenting the shirt: luminance alone cannot do it — the background holds
 * white boat hulls at the same brightness, and the trousers are brighter than
 * the shirt's shaded flank. Two measured facts make it tractable:
 *
 * 1. **Saturation separates cloth from skin.** Measured shirt saturation is
 *    5-11 against 39-96 for the arms, neck and face, so a saturation ceiling
 *    removes the body without touching the garment.
 * 2. **Luminance separates cloth from the water and hulls in shade** (shirt
 *    146-217 against 55-72 behind him), and a flood fill from chest seeds keeps
 *    the bright hulls out because they are not connected to the shirt.
 *
 * What neither can do is find the hem — trousers and shirt are both cream and
 * they touch along their whole width — so the hem is a traced polyline, set a
 * few pixels inside the garment so any error hides under cloth rather than
 * spilling onto the trousers.
 *
 * The mesh is then measured from the mask itself: each column takes the
 * garment's own top and bottom edge, smoothed, so the artwork fills the
 * silhouette instead of a rectangle floating on the chest. Columns are
 * cos-spaced, which compresses the design toward the sleeves the way a print
 * really does when the torso turns away.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MockupItemSchema, denormalize, meshOutline, pt, svgPoints, type Layer, type MeshGeometry, type Point } from '@mf/shared';
import { svg, svgToPng, thumbnail } from '../apps/api/src/seed/raster.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'assets', 'items', 'tshirt-marina-01');

/**
 * Search box around the man. Keeps distant hulls out of the flood entirely. The
 * right edge sits at 1018 because the sleeve is measured to end at 1013 and a
 * sunlit hull sits immediately beyond it, low-saturation and bright enough to
 * pass the cloth test — without the bound the flood escapes across the sleeve
 * edge into the boat.
 */
const BOX = { x0: 500, y0: 230, x1: 1018, y1: 815 };
/** Chest/sleeve seeds, all measured as cloth. */
const SEEDS: Array<[number, number]> = [
  [814, 465],
  [760, 600],
  [700, 430],
  [900, 460],
  [960, 480],
  [600, 500],
];
const LUM_MIN = 90;
/**
 * Saturation ceiling. Sunlit cloth measures 5-11 and the arms and neck run
 * 39-96, so the gap is wide — but it is the *background* that sets this bound,
 * not skin: the sunlit hull beside his shoulder measures 28, and at 34 the flood
 * escapes over the shoulder and swallows half the marina. Shaded cloth that
 * measures 28-42 is recovered by closing instead.
 */
const SAT_MAX = 28;
/**
 * Closing radius, in px. Sweeps up the last few concave notches where a crease
 * is both dark and open to the silhouette edge, so hole filling cannot reach it.
 */
const CLOSE = 12;
/** Traced hem, a few px inside the garment. Below this is trousers. */
const HEM: Array<[number, number]> = [
  [500, 792],
  [590, 774],
  [620, 770],
  [660, 762],
  [700, 748],
  [760, 744],
  [820, 740],
  [880, 736],
  [940, 728],
  [1015, 714],
  [1060, 708],
];

const COLS = 16;
const ROWS = 10;
/**
 * Fraction of the torso's circumference facing the camera. Higher values squeeze
 * the design harder toward the sleeves; past about 0.65 the squeeze at the very
 * edge columns is severe enough that fine artwork aliases into stipple there,
 * which no prefilter sized from the whole surface can catch.
 */
const WRAP = 0.7;
/** How much of the column spacing is plain linear rather than cylindrical. */
const LINEAR_BLEND = 0.55;
/**
 * Displacement strength in canvas px. 6, not the 12 the maps were exported
 * against: 12 was picked while `vector` was being silently ignored, so the map
 * was driving both axes off one averaged channel. Driven properly it moves about
 * twice as far, and at 12 the cloth reads liquid rather than creased.
 */
const DISPLACEMENT_SCALE = 6;
/** How far horizontal seams bow, in canvas px, from the torso being round. */
const SEAM_BOW = 9;
/** Grow the mesh past the measured silhouette so the mask, not the mesh, cuts. */
const PAD = 3;

interface Mask {
  data: Uint8Array;
  width: number;
  height: number;
}

function hemAt(x: number): number {
  let previous = HEM[0]!;
  for (const point of HEM) {
    if (point[0] >= x) {
      const span = point[0] - previous[0];
      const t = span === 0 ? 0 : (x - previous[0]) / span;
      return previous[1] + (point[1] - previous[1]) * t;
    }
    previous = point;
  }
  return previous[1];
}

/**
 * Dilate (`max`) or erode (`min`) in place with a square structuring element,
 * as two separable passes. Outside the search box counts as background, so an
 * erode does not eat inward from the box edges.
 */
function morph(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
  op: 'max' | 'min',
): void {
  const pass = (horizontal: boolean): void => {
    const source = mask.slice();
    for (let y = BOX.y0; y < BOX.y1; y += 1) {
      for (let x = BOX.x0; x < BOX.x1; x += 1) {
        let value = op === 'max' ? 0 : 1;
        for (let k = -radius; k <= radius; k += 1) {
          const sx = horizontal ? x + k : x;
          const sy = horizontal ? y : y + k;
          const inside = sx >= BOX.x0 && sx < BOX.x1 && sy >= BOX.y0 && sy < BOX.y1;
          const sample = inside ? source[sy * width + sx]! : 0;
          value = op === 'max' ? Math.max(value, sample) : Math.min(value, sample);
        }
        mask[y * width + x] = value;
      }
    }
  };
  pass(true);
  pass(false);
}

/**
 * First row below the collar. Above this a row can cross the neck between the
 * two shoulders, so row filling starts here.
 */
const COLLAR_BOTTOM = 340;

/** Relaxed cloth test used only when walking outward from an accepted edge. */
const EDGE_LUM_MIN = 100;
const EDGE_SAT_MAX = 48;
const EDGE_REACH = 50;

function extendRowEdges(
  mask: Uint8Array,
  pixels: Buffer,
  channels: number,
  width: number,
): number {
  let added = 0;
  const relaxed = (x: number, y: number): boolean => {
    const index = (y * width + x) * channels;
    const r = pixels[index]!;
    const g = pixels[index + 1]!;
    const b = pixels[index + 2]!;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance >= EDGE_LUM_MIN && Math.max(r, g, b) - Math.min(r, g, b) <= EDGE_SAT_MAX;
  };

  for (let y = COLLAR_BOTTOM; y < BOX.y1; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (mask[y * width + x]) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first < 0) continue;
    for (let step = 1; step <= EDGE_REACH; step += 1) {
      const x = first - step;
      if (x < BOX.x0 || y > hemAt(x) || !relaxed(x, y)) break;
      mask[y * width + x] = 1;
      added += 1;
    }
    for (let step = 1; step <= EDGE_REACH; step += 1) {
      const x = last + step;
      if (x >= BOX.x1 || y > hemAt(x) || !relaxed(x, y)) break;
      mask[y * width + x] = 1;
      added += 1;
    }
  }
  return added;
}

function fillRowSpans(
  mask: Uint8Array,
  width: number,
  fromY: number,
  toY: number,
): { filled: number; widest: number } {
  let filled = 0;
  let widest = 0;
  for (let y = fromY; y < toY; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (mask[y * width + x]) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first < 0) continue;
    let run = 0;
    for (let x = first; x <= last; x += 1) {
      if (mask[y * width + x]) {
        widest = Math.max(widest, run);
        run = 0;
        continue;
      }
      mask[y * width + x] = 1;
      filled += 1;
      run += 1;
    }
    widest = Math.max(widest, run);
  }
  return { filled, widest };
}

async function buildMask(base: string, width: number, height: number): Promise<Mask> {
  const { data, info } = await sharp(base).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // 1. Cloth test, inside the search box and above the hem.
  const cloth = new Uint8Array(width * height);
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (y > hemAt(x)) continue;
      const index = (y * width + x) * channels;
      const r = data[index]!;
      const g = data[index + 1]!;
      const b = data[index + 2]!;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      if (luminance >= LUM_MIN && saturation <= SAT_MAX) cloth[y * width + x] = 1;
    }
  }

  // 2. Keep only what the chest is connected to.
  const mask = new Uint8Array(width * height);
  const stack: number[] = [];
  for (const [x, y] of SEEDS) {
    const seed = y * width + x;
    if (!cloth[seed]) throw new Error(`seed (${x}, ${y}) is not cloth by the current thresholds`);
    if (!mask[seed]) {
      mask[seed] = 1;
      stack.push(seed);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < BOX.x0 || nx >= BOX.x1 || ny < BOX.y0 || ny >= BOX.y1) continue;
      const q = ny * width + nx;
      if (cloth[q] && !mask[q]) {
        mask[q] = 1;
        stack.push(q);
      }
    }
  }

  // 3. Close, then re-cut the hem: closing bridges notches but also bulges the
  //    boundary outward, and the one boundary that must not move is the hem.
  morph(mask, width, height, CLOSE, 'max');
  morph(mask, width, height, CLOSE, 'min');
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (y > hemAt(x)) mask[y * width + x] = 0;
    }
  }

  // 4. Fill each row between its outermost cloth pixels. The last gaps are the
  //    armpit and both flanks in deep shade: cloth that fails the saturation
  //    test because it is tinted by bounce light, and open to the silhouette
  //    edge, so neither closing nor hole filling reaches it. Anything between
  //    cloth on the left and cloth on the right of the same row is garment —
  //    below the collar. Above it the neck sits between the two shoulders and
  //    would be filled in, so rows start at the measured collar bottom.
  const spans = fillRowSpans(mask, width, COLLAR_BOTTOM, BOX.y1);
  console.log(`row fill: ${spans.filled} px, widest single gap ${spans.widest} px`);

  // 4b. Push each row's left and right edge back out to the true garment
  //     boundary. The flanks in deep shade are inset from it, and they are not
  //     between cloth so row filling cannot reach them — the same problem the
  //     phone's rounded corners had. Walking outward under a relaxed test stops
  //     at the arm (saturated) or the water (dark) but crosses tinted cloth.
  const edges = extendRowEdges(mask, data, channels, width);
  console.log(`edge extension: ${edges} px`);
  fillRowSpans(mask, width, COLLAR_BOTTOM, BOX.y1);

  // 4c. Extending row by row leaves a sawtooth edge, and can push a few pixels
  //     past the sleeve into a sunlit hull. A close-then-open pass smooths the
  //     first and drops the second, being narrower than the smoothing radius.
  morph(mask, width, height, 3, 'max');
  morph(mask, width, height, 3, 'min');
  morph(mask, width, height, 3, 'min');
  morph(mask, width, height, 3, 'max');
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (y > hemAt(x)) mask[y * width + x] = 0;
    }
  }
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      if (y > hemAt(x)) mask[y * width + x] = 0;
    }
  }

  // 5. Fill holes. Deep creases fall under the luminance floor and punch gaps
  //    through the middle of the garment; anything enclosed by cloth is cloth.
  const outside = new Uint8Array(width * height);
  const border: number[] = [];
  for (let x = BOX.x0; x < BOX.x1; x += 1) {
    border.push(BOX.y0 * width + x, (BOX.y1 - 1) * width + x);
  }
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    border.push(y * width + BOX.x0, y * width + BOX.x1 - 1);
  }
  for (const p of border) {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack.push(p);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < BOX.x0 || nx >= BOX.x1 || ny < BOX.y0 || ny >= BOX.y1) continue;
      const q = ny * width + nx;
      if (!mask[q] && !outside[q]) {
        outside[q] = 1;
        stack.push(q);
      }
    }
  }
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      const p = y * width + x;
      if (!mask[p] && !outside[p]) mask[p] = 1;
    }
  }

  return { data: mask, width, height };
}

/** Per-column top and bottom edge of the garment, smoothed. */
function profile(mask: Mask): { xs: number[]; top: number[]; bottom: number[] } {
  const xs: number[] = [];
  const top: number[] = [];
  const bottom: number[] = [];
  for (let x = 0; x < mask.width; x += 1) {
    let first = -1;
    let last = -1;
    for (let y = 0; y < mask.height; y += 1) {
      if (mask.data[y * mask.width + x]) {
        if (first < 0) first = y;
        last = y;
      }
    }
    if (first >= 0) {
      xs.push(x);
      top.push(first);
      bottom.push(last);
    }
  }
  return { xs, top: smooth(top, 21), bottom: smooth(bottom, 21) };
}

function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, index) => {
    let sum = 0;
    let count = 0;
    for (let k = -half; k <= half; k += 1) {
      const value = values[Math.min(values.length - 1, Math.max(0, index + k))]!;
      sum += value;
      count += 1;
    }
    return sum / count;
  });
}

function sampleAt(xs: number[], values: number[], x: number): number {
  const first = xs[0]!;
  const last = xs[xs.length - 1]!;
  if (x <= first) return values[0]!;
  if (x >= last) return values[values.length - 1]!;
  const index = Math.min(xs.length - 1, Math.max(1, Math.round(x - first)));
  return values[index]!;
}

/**
 * A garment mesh: cos-spaced columns across the silhouette for the wrap, each
 * column running from the measured shoulder edge to the measured hem, with the
 * horizontal seams bowed because the torso is round.
 */
function garmentMesh(
  mask: Mask,
  edges: { xs: number[]; top: number[]; bottom: number[] },
): MeshGeometry {
  const x0 = edges.xs[0]! - PAD;
  const x1 = edges.xs[edges.xs.length - 1]! + PAD;
  const halfAngle = (Math.PI / 2) * WRAP;

  const points: Point[] = [];
  for (let row = 0; row <= ROWS; row += 1) {
    const v = row / ROWS;
    for (let col = 0; col <= COLS; col += 1) {
      const u = col / COLS;
      const angle = (u * 2 - 1) * halfAngle;
      const cylindrical = (Math.sin(angle) / Math.sin(halfAngle) + 1) / 2;
      // Blended with linear spacing. Pure cylindrical spacing squeezes the outer
      // columns roughly 3x harder than the middle, and the renderer prefilters a
      // design once for the whole surface, so those columns alias into stipple.
      // The blend caps the squeeze while keeping the wrap read.
      const projected = LINEAR_BLEND * u + (1 - LINEAR_BLEND) * cylindrical;
      const x = x0 + (x1 - x0) * projected;
      const top = sampleAt(edges.xs, edges.top, x) - PAD;
      const bottom = sampleAt(edges.xs, edges.bottom, x) + PAD;
      const bow = Math.cos(angle) * SEAM_BOW * Math.sin(v * Math.PI);
      points.push(pt(x / mask.width, (top + (bottom - top) * v + bow) / mask.height));
    }
  }
  return { kind: 'mesh', rows: ROWS, cols: COLS, points };
}

async function main(): Promise<void> {
  const basePath = path.join(DIR, 'base.png');
  const meta = await sharp(basePath).metadata();
  const width = meta.width!;
  const height = meta.height!;

  const mask = await buildMask(basePath, width, height);
  const edges = profile(mask);
  const covered = mask.data.reduce((sum, value) => sum + value, 0);
  console.log(
    `mask: ${covered} px (${((covered / (width * height)) * 100).toFixed(1)}% of canvas), ` +
      `x ${edges.xs[0]}-${edges.xs[edges.xs.length - 1]}`,
  );

  const mesh = garmentMesh(mask, edges);
  const outlinePx = denormalize(meshOutline(mesh), width, height);

  const files = new Map<string, Buffer>();
  const debug = new Map<string, Buffer>();
  // Soft edge: the garment boundary is a photographed edge, not a vector one.
  files.set(
    'mask-chest.png',
    await sharp(Buffer.from(mask.data.map((v) => v * 255)), {
      raw: { width, height, channels: 1 },
    })
      .blur(1.6)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  // Flat grey through the garment mask, over the photo: shows the print area.
  // Built as an explicit RGBA buffer rather than a dest-in composite, which
  // sharp resolves against the created layer's own alpha and flattens to solid.
  const overlay = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p += 1) {
    if (!mask.data[p]) continue;
    overlay[p * 4] = 0xdc;
    overlay[p * 4 + 1] = 0xdc;
    overlay[p * 4 + 2] = 0xdc;
    overlay[p * 4 + 3] = 0xff;
  }
  const composed = await sharp(basePath)
    .composite([
      {
        input: await sharp(overlay, { raw: { width, height, channels: 4 } })
          .blur(1.2)
          .png()
          .toBuffer(),
        blend: 'over',
        top: 0,
        left: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  files.set('preview.png', composed);
  files.set('thumbnail.png', await thumbnail(composed, 480));

  // Debug overlay: mesh outline over the photo, so the fit is checkable. Goes to
  // the samples directory, not the item, so it never ships in the catalog.
  debug.set(
    'tshirt-marina-01-mesh.png',
    await sharp(basePath)
      .composite([
        {
          input: await svgToPng(
            svg(
              { width, height },
              `<polygon points="${svgPoints(outlinePx)}" fill="none" stroke="#ff00ff" stroke-width="3"/>`,
            ),
          ),
          blend: 'over',
        },
      ])
      .png()
      .toBuffer(),
  );

  const bbox = outlinePx.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const aspect = (bbox.maxX - bbox.minX) / (bbox.maxY - bbox.minY);
  const recommendedWidth = 1600;

  const layers: Layer[] = [
    { type: 'base', src: 'base.png' },
    {
      type: 'surface',
      id: 'chest',
      label: 'All-over print',
      placeholder: {
        aspect,
        recommendedWidth,
        recommendedHeight: Math.round(recommendedWidth / aspect),
        hint: 'Fill the frame edge to edge — the artwork covers the whole shirt',
      },
      warp: {
        kind: 'displacement',
        geometry: mesh,
        map: 'displace-chest.png',
        scale: DISPLACEMENT_SCALE,
        vector: true,
      },
      lighting: {
        multiply: 'shadow-chest.png',
        multiplyOpacity: 1,
        screen: 'highlight-chest.png',
        screenOpacity: 1,
      },
      mask: 'mask-chest.png',
      opacity: 1,
      blend: 'normal',
    },
  ];

  const item = MockupItemSchema.parse({
    id: 'tshirt-marina-01',
    name: 'Marina Tee, All-Over',
    category: 'apparel',
    viewpoint: 'scene',
    tags: ['tshirt', 'tee', 'apparel', 'all-over', 'worn', 'model', 'marina', 'lifestyle', 'summer'],
    canvas: { width, height },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  for (const [name, buffer] of files) await fs.writeFile(path.join(DIR, name), buffer);
  const samples = path.join(ROOT, 'assets', 'samples');
  await fs.mkdir(samples, { recursive: true });
  for (const [name, buffer] of debug) await fs.writeFile(path.join(samples, name), buffer);
  await fs.writeFile(path.join(DIR, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

  console.log(
    `✓ ${item.id}: mesh ${COLS}x${ROWS} over ${Math.round(bbox.maxX - bbox.minX)}x${Math.round(
      bbox.maxY - bbox.minY,
    )}px, aspect ${aspect.toFixed(3)}, vector displacement ${DISPLACEMENT_SCALE}px`,
  );
}

await main();
