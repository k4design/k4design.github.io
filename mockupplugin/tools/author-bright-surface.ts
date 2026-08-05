/**
 * Authors mockups from photographs whose print surfaces are the brightest
 * things in frame — screens showing white, or pale cards on a darker ground.
 *
 * One tool, several items, because the measurement is identical every time:
 *
 *   threshold  ->  connected components  ->  keep the biggest N
 *   ->  fit each blob's four edges  ->  slide them out to supporting lines
 *   ->  corners, per-pixel mask, lighting, item.json
 *
 * Connected components are what make this general. A cafe window behind a
 * laptop is just as bright as its screen, so "the brightest pixels" is not
 * enough — "the largest bright *region*" is. The same machinery then splits a
 * flat-lay of six cards into six separate surfaces for free.
 *
 * Everything is derived, nothing is hand-placed, and the fitting is
 * deterministic, so re-running reproduces byte-identical output and the
 * golden-image suite keeps working.
 *
 *   npx tsx tools/author-bright-surface.ts            # every configured item
 *   npx tsx tools/author-bright-surface.ts laptop-01  # just one
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  MockupItemSchema,
  quadPoints,
  svgPoints,
  type Category,
  type Layer,
  type Point,
  type Viewpoint,
} from '@mf/shared';
import { highlightMapSvg, shadowMapSvg, svg, svgToPng, thumbnail } from '../apps/api/src/seed/raster.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = path.join(ROOT, 'assets', 'sources');
const ITEMS = path.join(ROOT, 'assets', 'items');

interface SurfaceNaming {
  /** Surface id when there is one surface, or the prefix when there are many. */
  id: string;
  label: string;
}

interface Config {
  itemId: string;
  name: string;
  source: string;
  category: Category;
  viewpoint: Viewpoint;
  tags: string[];
  /** Channel value above which a pixel counts as surface. */
  threshold: number;
  /** How many bright regions to turn into surfaces. */
  surfaces: number;
  /**
   * Optional coarse boxes, normalized [x0, y0, x1, y1], one per surface.
   *
   * For a flat lay of pale cards on a pale ground, no global threshold
   * separates card from background — the lit background is brighter than a
   * shadowed card. Inside a box holding one card, though, the split is
   * obvious, so each box gets its own threshold chosen by Otsu's method. The
   * boxes only have to be roughly right; the measurement is still exact.
   */
  rois?: [number, number, number, number][];
  /**
   * Explicit corner quads, normalized, one slot per ROI. A slot that is null
   * is measured automatically; a slot with corners skips detection entirely.
   *
   * Needed where dappled shade falls across a surface: Otsu then splits the
   * *card* into its lit and shaded halves rather than separating card from
   * background, and no single threshold can fix it. Corners are read off a
   * coordinate grid instead.
   */
  quads?: (null | [number, number][])[];
  naming: SurfaceNaming;
  /** Discard blobs smaller than this fraction of the frame. */
  minArea?: number;
  shadow?: { direction?: 'horizontal' | 'vertical' | 'radial'; strength?: number };
  highlight?: { strength?: number; sweep?: number };
  /** Mask edge softness in pixels. */
  feather?: number;
  /**
   * Mask from the fitted quad rather than the detected region.
   *
   * A screen wants the region: it carries the bezel's rounded corners, the
   * notch, and any finger crossing an edge. A flat card wants the quad: it is a
   * solid rectangle with nothing in front of it, and the detected region covers
   * only the part that happened to be lit — leaving shaded stretches of card
   * unmasked, showing through as pale blotches.
   */
  maskFromQuad?: boolean;
  /** Longest edge of the design frame the plugin creates. */
  recommendedWidth?: number;
  /** Snap the placeholder to this ratio when the measurement is within 6%. */
  preferredAspect?: number;
  emptyFill?: string;
}

const CONFIGS: Config[] = [
  {
    itemId: 'laptop-cafe-01',
    name: 'Laptop on a Café Table',
    source: 'laptop.png',
    category: 'devices',
    viewpoint: 'scene',
    tags: ['laptop', 'macbook', 'screen', 'website', 'cafe', 'workspace', 'lifestyle'],
    // The screen is near-blown-white; the window behind it is bright but not
    // this bright, and the component pass removes it regardless.
    threshold: 242,
    surfaces: 1,
    naming: { id: 'screen', label: 'Screen' },
    shadow: { direction: 'vertical', strength: 0.16 },
    highlight: { strength: 0.14, sweep: 0.22 },
    feather: 1.5,
    recommendedWidth: 2560,
    preferredAspect: 16 / 10,
    emptyFill: '#12151a',
  },
  {
    itemId: 'tablet-in-hands-01',
    name: 'Tablet Held in Both Hands',
    source: 'tablet.png',
    category: 'devices',
    viewpoint: 'in-hand',
    tags: ['tablet', 'ipad', 'screen', 'app', 'held', 'presentation', 'landscape'],
    threshold: 212,
    surfaces: 1,
    naming: { id: 'screen', label: 'Screen' },
    shadow: { direction: 'vertical', strength: 0.14 },
    highlight: { strength: 0.12, sweep: 0.2 },
    feather: 2,
    recommendedWidth: 2360,
    preferredAspect: 4 / 3,
    emptyFill: '#14171c',
  },
  {
    itemId: 'postcards-flatlay-01',
    name: 'Postcard Set, Flat Lay',
    source: 'postcards.png',
    category: 'branding',
    viewpoint: 'flat-lay',
    tags: ['postcard', 'stationery', 'flat lay', 'branding', 'identity', 'set', 'collateral'],
    // Unused when rois are given, but kept for the error message.
    threshold: 209,
    surfaces: 6,
    // Six cards, read coarsely off a coordinate grid; Otsu finds each precisely.
    rois: [
      [0.075, 0.175, 0.375, 0.385],
      [0.4, 0.185, 0.71, 0.39],
      [0.175, 0.395, 0.495, 0.6],
      [0.495, 0.4, 0.815, 0.605],
      [0.07, 0.615, 0.39, 0.82],
      [0.4, 0.62, 0.72, 0.825],
    ],
    // The top two cards lie under dappled palm shade; their corners are read
    // from the grid. The other four measure themselves.
    quads: [
      [
        [0.0859, 0.1836],
        [0.3672, 0.1836],
        [0.3672, 0.3726],
        [0.0859, 0.3726],
      ],
      [
        [0.4082, 0.1938],
        [0.7041, 0.1938],
        [0.7041, 0.3803],
        [0.4082, 0.3803],
      ],
      null,
      null,
      null,
      null,
    ],
    naming: { id: 'card', label: 'Card' },
    maskFromQuad: true,
    minArea: 0.004,
    shadow: { direction: 'horizontal', strength: 0.16 },
    highlight: { strength: 0.08, sweep: 0.3 },
    feather: 2,
    recommendedWidth: 1500,
    emptyFill: '#ece7de',
  },
];

/* ------------------------------------------------------------------ */
/* Geometry fitting (shared with the phone tool's approach)            */
/* ------------------------------------------------------------------ */

interface Line {
  slope: number;
  intercept: number;
}
interface Sample {
  along: number;
  value: number;
}

function leastSquares(points: Sample[]): Line {
  const n = points.length;
  let sa = 0;
  let sv = 0;
  let sav = 0;
  let saa = 0;
  for (const p of points) {
    sa += p.along;
    sv += p.value;
    sav += p.along * p.value;
    saa += p.along * p.along;
  }
  const denominator = n * saa - sa * sa;
  if (n < 2 || Math.abs(denominator) < 1e-9) return { slope: 0, intercept: n ? sv / n : 0 };
  const slope = (n * sav - sa * sv) / denominator;
  return { slope, intercept: (sv - slope * sa) / n };
}

/**
 * Consensus fit: score every line through pairs of evenly-spaced anchors by
 * how many samples fall within tolerance, then refit on the winner's inliers.
 * Least squares cannot be used directly — for a rotated surface, a third of
 * the "topmost pixel per column" samples lie on the *side* edges instead, and
 * they drag the fit into a line matching nothing. Anchors are strided, not
 * random, so results are reproducible.
 */
function consensusFit(points: Sample[], tolerance = 2): Line {
  if (points.length < 8) return leastSquares(points);
  const anchorCount = Math.min(40, points.length);
  const stride = (points.length - 1) / (anchorCount - 1);
  const anchors = Array.from(
    { length: anchorCount },
    (_u, index) => points[Math.round(index * stride)]!,
  );

  let best: Sample[] = [];
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      const a = anchors[i]!;
      const b = anchors[j]!;
      if (Math.abs(b.along - a.along) < 1e-6) continue;
      const slope = (b.value - a.value) / (b.along - a.along);
      const intercept = a.value - slope * a.along;
      const inliers = points.filter(
        (p) => Math.abs(p.value - (slope * p.along + intercept)) <= tolerance,
      );
      if (inliers.length > best.length) best = inliers;
    }
  }
  return leastSquares(best.length >= 2 ? best : points);
}

function intersect(vertical: Line, horizontal: Line): Point {
  const denominator = 1 - vertical.slope * horizontal.slope;
  const x = (vertical.slope * horizontal.intercept + vertical.intercept) / denominator;
  return { x, y: horizontal.slope * x + horizontal.intercept };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/* ------------------------------------------------------------------ */
/* Connected components                                               */
/* ------------------------------------------------------------------ */

interface Blob {
  pixels: Uint8Array;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Fill a convex polygon into a full-frame mask, reported as a Blob. */
function rasterizeQuad(points: Point[], width: number, height: number): Blob {
  const pixels = new Uint8Array(width * height);
  let area = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  const inside = (px: number, py: number): boolean => {
    let sign = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
      const s = Math.sign(cross);
      if (s === 0) continue;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  };

  const bx0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
  const bx1 = Math.min(width - 1, Math.ceil(Math.max(...points.map((p) => p.x))));
  const by0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
  const by1 = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p.y))));

  for (let y = by0; y <= by1; y += 1) {
    for (let x = bx0; x <= bx1; x += 1) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      pixels[y * width + x] = 255;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { pixels, area, minX, maxX, minY, maxY };
}

/**
 * Otsu's threshold: the grey level splitting a histogram into two classes with
 * the least combined variance. Used per ROI so each card is judged against its
 * own surroundings rather than the whole frame's lighting.
 */
function otsuThreshold(histogram: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i]!;
  let sumB = 0;
  let weightB = 0;
  let best = 0;
  let bestVariance = -1;
  for (let t = 0; t < 256; t += 1) {
    weightB += histogram[t]!;
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * histogram[t]!;
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (variance > bestVariance) {
      bestVariance = variance;
      best = t;
    }
  }
  return best;
}

/** Bright regions, largest first. 4-connectivity, iterative to avoid recursion. */
function findBlobs(
  bright: Uint8Array,
  width: number,
  height: number,
  minArea: number,
): Blob[] {
  const labels = new Int32Array(width * height).fill(-1);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < bright.length; start += 1) {
    if (!bright[start] || labels[start] !== -1) continue;
    const id = blobs.length;
    const pixels = new Uint8Array(width * height);
    let area = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    stack.push(start);
    labels[start] = id;
    while (stack.length > 0) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;
      pixels[index] = 255;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const n of neighbours) {
        if (n < 0 || labels[n] !== -1 || !bright[n]) continue;
        labels[n] = id;
        stack.push(n);
      }
    }

    if (area >= minArea) blobs.push({ pixels, area, minX, maxX, minY, maxY });
  }

  return blobs.sort((a, b) => b.area - a.area);
}

/* ------------------------------------------------------------------ */
/* Per-blob quad                                                      */
/* ------------------------------------------------------------------ */

interface Fitted {
  corners: { tl: Point; tr: Point; br: Point; bl: Point };
  aspect: number;
}

function fitQuad(blob: Blob, width: number, height: number): Fitted | null {
  const rows: { y: number; left: number; right: number }[] = [];
  for (let y = blob.minY; y <= blob.maxY; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = blob.minX; x <= blob.maxX; x += 1) {
      if (!blob.pixels[y * width + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0 && last - first > 4) rows.push({ y, left: first, right: last });
  }
  if (rows.length < 20) return null;

  const columns = new Map<number, { top: number; bottom: number }>();
  for (const row of rows) {
    for (let x = row.left; x <= row.right; x += 1) {
      if (!blob.pixels[row.y * width + x]) continue;
      const existing = columns.get(x);
      if (!existing) columns.set(x, { top: row.y, bottom: row.y });
      else existing.bottom = row.y;
    }
  }
  if (columns.size < 20) return null;

  const TRIM = 0.12;
  const trimRows = Math.floor(rows.length * TRIM);
  const middleRows = rows.slice(trimRows, rows.length - trimRows);
  const left = consensusFit(middleRows.map((r) => ({ along: r.y, value: r.left })));
  const right = consensusFit(middleRows.map((r) => ({ along: r.y, value: r.right })));

  const columnList = [...columns.entries()].sort((a, b) => a[0] - b[0]);
  const trimCols = Math.floor(columnList.length * TRIM);
  const middleCols = columnList.slice(trimCols, columnList.length - trimCols);

  // Drop columns whose extreme pixel lies on a side edge — those belong to a
  // different side of the surface and would dominate the top/bottom fits.
  const onSide = (x: number, y: number): boolean =>
    Math.abs(x - (left.slope * y + left.intercept)) <= 6 ||
    Math.abs(x - (right.slope * y + right.intercept)) <= 6;

  const top = consensusFit(
    middleCols.filter(([x, c]) => !onSide(x, c.top)).map(([x, c]) => ({ along: x, value: c.top })),
  );
  const bottom = consensusFit(
    middleCols
      .filter(([x, c]) => !onSide(x, c.bottom))
      .map(([x, c]) => ({ along: x, value: c.bottom })),
  );

  // Slide each edge outward to touch the outermost lit pixel, so the warp is
  // guaranteed to cover every pixel the mask reveals (rounded corners
  // otherwise leave slivers of bare surface showing).
  let topC = Infinity;
  let bottomC = -Infinity;
  let leftC = Infinity;
  let rightC = -Infinity;
  for (let y = blob.minY; y <= blob.maxY; y += 1) {
    for (let x = blob.minX; x <= blob.maxX; x += 1) {
      if (!blob.pixels[y * width + x]) continue;
      topC = Math.min(topC, y - top.slope * x);
      bottomC = Math.max(bottomC, y - bottom.slope * x);
      leftC = Math.min(leftC, x - left.slope * y);
      rightC = Math.max(rightC, x - right.slope * y);
    }
  }

  const support = {
    top: { slope: top.slope, intercept: topC },
    bottom: { slope: bottom.slope, intercept: bottomC },
    left: { slope: left.slope, intercept: leftC },
    right: { slope: right.slope, intercept: rightC },
  };

  const corners = {
    tl: intersect(support.left, support.top),
    tr: intersect(support.right, support.top),
    br: intersect(support.right, support.bottom),
    bl: intersect(support.left, support.bottom),
  };

  for (const p of Object.values(corners)) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    // A wildly out-of-frame corner means the fit collapsed.
    if (p.x < -width || p.x > width * 2 || p.y < -height || p.y > height * 2) return null;
  }

  const topLength = distance(corners.tl, corners.tr);
  const bottomLength = distance(corners.bl, corners.br);
  const leftLength = distance(corners.tl, corners.bl);
  const rightLength = distance(corners.tr, corners.br);
  if (Math.min(topLength, bottomLength, leftLength, rightLength) < 8) return null;

  return { corners, aspect: (topLength + bottomLength) / (leftLength + rightLength) };
}

/* ------------------------------------------------------------------ */

async function build(config: Config): Promise<void> {
  const sourcePath = path.join(SOURCES, config.source);
  const { data, info } = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const minArea = Math.round((config.minArea ?? 0.01) * width * height);
  let blobs: Blob[];

  if (config.rois) {
    // Per-ROI Otsu: each box holds one surface, thresholded against its own
    // local histogram, so uneven lighting across the frame does not matter.
    blobs = [];
    for (const [roiIndex, [nx0, ny0, nx1, ny1]] of config.rois.entries()) {
      // An explicit quad short-circuits detection: rasterize it as the region.
      const explicit = config.quads?.[roiIndex];
      if (explicit) {
        const region = rasterizeQuad(
          explicit.map(([nx, ny]) => ({ x: nx * width, y: ny * height })),
          width,
          height,
        );
        console.log(`  quad given -> region ${Math.round(region.area / 1000)}k`);
        blobs.push(region);
        continue;
      }

      const x0 = Math.max(0, Math.round(nx0 * width));
      const y0 = Math.max(0, Math.round(ny0 * height));
      const x1 = Math.min(width - 1, Math.round(nx1 * width));
      const y1 = Math.min(height - 1, Math.round(ny1 * height));

      const histogram = new Array<number>(256).fill(0);
      let count = 0;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const o = (y * width + x) * channels;
          const grey = Math.round(0.299 * data[o]! + 0.587 * data[o + 1]! + 0.114 * data[o + 2]!);
          histogram[grey] += 1;
          count += 1;
        }
      }
      const threshold = otsuThreshold(histogram, count);

      const bright = new Uint8Array(width * height);
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const o = (y * width + x) * channels;
          const grey = 0.299 * data[o]! + 0.587 * data[o + 1]! + 0.114 * data[o + 2]!;
          if (grey > threshold) bright[y * width + x] = 1;
        }
      }

      const found = findBlobs(bright, width, height, Math.round(minArea * 0.3));
      const best = found[0];
      if (!best) {
        throw new Error(`${config.itemId}: nothing found in ROI ${nx0},${ny0} ${nx1},${ny1}.`);
      }
      console.log(`  roi otsu=${threshold} -> blob ${Math.round(best.area / 1000)}k`);
      blobs.push(best);
    }
  } else {
    const bright = new Uint8Array(width * height);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const o = pixel * channels;
      if (
        data[o]! > config.threshold &&
        data[o + 1]! > config.threshold &&
        data[o + 2]! > config.threshold
      ) {
        bright[pixel] = 1;
      }
    }
    blobs = findBlobs(bright, width, height, minArea).slice(0, config.surfaces);
  }

  if (blobs.length === 0) {
    throw new Error(
      `${config.itemId}: no bright region of at least ${minArea}px at threshold ${config.threshold}.`,
    );
  }

  const fitted = blobs
    .map((blob) => ({ blob, fit: fitQuad(blob, width, height) }))
    .filter((entry): entry is { blob: Blob; fit: Fitted } => entry.fit !== null);
  if (fitted.length === 0) throw new Error(`${config.itemId}: no region could be fitted to a quad.`);

  // Stable order: reading order (top to bottom, then left to right), so surface
  // ids do not shuffle between runs.
  fitted.sort((a, b) => a.blob.minY - b.blob.minY || a.blob.minX - b.blob.minX);

  const outDir = path.join(ITEMS, config.itemId);
  await fs.mkdir(outDir, { recursive: true });
  const files = new Map<string, Buffer>();
  const layers: Layer[] = [{ type: 'base', src: 'base.png' }];

  files.set(
    'base.png',
    await sharp(sourcePath).flatten({ background: '#000000' }).png({ compressionLevel: 9 }).toBuffer(),
  );

  const placeholderShapes: string[] = [];

  for (const [index, entry] of fitted.entries()) {
    const single = fitted.length === 1;
    const id = single ? config.naming.id : `${config.naming.id}-${index + 1}`;
    const label = single ? config.naming.label : `${config.naming.label} ${index + 1}`;
    const polygonPx = quadPoints(entry.fit.corners);

    const maskPixels = config.maskFromQuad
      ? rasterizeQuad(polygonPx, width, height).pixels
      : entry.blob.pixels;
    entry.blob.pixels = maskPixels;

    const maskName = `mask-${id}.png`;
    files.set(
      maskName,
      await sharp(maskPixels, { raw: { width, height, channels: 1 } })
        .blur(config.feather ?? 2)
        .png({ compressionLevel: 9 })
        .toBuffer(),
    );

    const lighting: Record<string, unknown> = { multiplyOpacity: 1, screenOpacity: 1 };
    if (config.shadow) {
      const name = `shadow-${id}.png`;
      files.set(name, await svgToPng(shadowMapSvg({ width, height }, [polygonPx], config.shadow)));
      lighting.multiply = name;
    }
    if (config.highlight) {
      const name = `highlight-${id}.png`;
      files.set(
        name,
        await svgToPng(highlightMapSvg({ width, height }, [polygonPx], config.highlight)),
      );
      lighting.screen = name;
    }

    const preferred = config.preferredAspect;
    const usePreferred =
      preferred !== undefined && Math.abs(entry.fit.aspect - preferred) / preferred < 0.06;
    const aspect = usePreferred ? preferred! : entry.fit.aspect;
    const recommendedWidth = config.recommendedWidth ?? 1600;

    layers.push({
      type: 'surface',
      id,
      label,
      placeholder: {
        aspect,
        recommendedWidth,
        recommendedHeight: Math.round(recommendedWidth / aspect),
        hint: 'Place your design here, then click Render',
      },
      warp: {
        kind: 'homography',
        corners: {
          tl: { x: entry.fit.corners.tl.x / width, y: entry.fit.corners.tl.y / height },
          tr: { x: entry.fit.corners.tr.x / width, y: entry.fit.corners.tr.y / height },
          br: { x: entry.fit.corners.br.x / width, y: entry.fit.corners.br.y / height },
          bl: { x: entry.fit.corners.bl.x / width, y: entry.fit.corners.bl.y / height },
        },
      },
      ...(config.shadow || config.highlight ? { lighting: lighting as never } : {}),
      mask: maskName,
      opacity: 1,
      blend: 'normal',
    });

    placeholderShapes.push(
      `<polygon points="${svgPoints(polygonPx)}" fill="${config.emptyFill ?? '#e8e8e8'}"/>`,
    );

    console.log(
      `  ${id.padEnd(8)} area ${String(entry.blob.area).padStart(7)}px  ` +
        `aspect ${entry.fit.aspect.toFixed(3)}${usePreferred ? ` -> ${aspect.toFixed(3)}` : ''}`,
    );
  }

  // Preview: the photo with each print area blocked in, clipped to its mask so
  // rounded corners and any occlusion read correctly before the first render.
  const masks = [...files.entries()].filter(([name]) => name.startsWith('mask-'));
  let placeholder = await svgToPng(svg({ width, height }, placeholderShapes.join('')));
  const union = Buffer.alloc(width * height);
  for (const entry of fitted) {
    for (let i = 0; i < union.length; i += 1) if (entry.blob.pixels[i]) union[i] = 255;
  }
  void masks;
  placeholder = await sharp(placeholder)
    .composite([
      {
        input: await sharp(union, { raw: { width, height, channels: 1 } }).png().toBuffer(),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  const preview = await sharp(files.get('base.png')!)
    .composite([{ input: placeholder, blend: 'over' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  files.set('preview.png', preview);
  files.set('thumbnail.png', await thumbnail(preview, 480));

  const item = MockupItemSchema.parse({
    id: config.itemId,
    name: config.name,
    category: config.category,
    viewpoint: config.viewpoint,
    tags: config.tags,
    canvas: { width, height },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  for (const [name, buffer] of files) await fs.writeFile(path.join(outDir, name), buffer);
  await fs.writeFile(path.join(outDir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);
  console.log(`✓ ${config.itemId}: ${fitted.length} surface(s), ${files.size + 1} files\n`);
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const selected = only.length ? CONFIGS.filter((c) => only.includes(c.itemId)) : CONFIGS;
if (selected.length === 0) {
  console.error(`No match. Known: ${CONFIGS.map((c) => c.itemId).join(', ')}`);
  process.exit(1);
}
for (const config of selected) {
  console.log(`${config.itemId} — ${config.source} @ threshold ${config.threshold}`);
  await build(config);
}
