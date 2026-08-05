/**
 * Authors smartphone-in-hand-01 from assets/sources/iphone-darkbg.png — a
 * phone held in one hand against black, lit blue and red from the sides, with
 * a blank screen.
 *
 * Measurement-driven, like the curved display: the screen is the only
 * near-white region, so it is thresholded and everything is derived from it.
 * Two details make this photo harder than a flat-on shot:
 *
 * - The screen is a *rotated* quadrilateral, and its corners are rounded, so
 *   the extreme white pixels sit inside the true corners. Each of the four
 *   edges is therefore fitted as a line (robustly, rejecting outliers) and the
 *   corners are the intersections of adjacent lines.
 * - The notch bites into the top of the screen and fingers can cross its
 *   edges. Neither is near-white, so the per-pixel mask excludes them for
 *   free — the artwork lands *behind* the notch and *behind* the fingers with
 *   no hand-painted occlusion mask.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MockupItemSchema, quadPoints, svgPoints, type Layer, type Point } from '@mf/shared';
import { highlightMapSvg, shadowMapSvg, svg, svgToPng, thumbnail } from '../apps/api/src/seed/raster.js';

const SOURCE = path.resolve(import.meta.dirname, '../assets/sources/iphone-darkbg.png');
const OUT_DIR = path.resolve(import.meta.dirname, '../assets/items/smartphone-in-hand-01');

/** Channel value above which a pixel counts as lit screen. */
const WHITE = 200;
/** A row's white run must be this wide to be screen rather than a highlight. */
const MIN_RUN = 40;
/** Fraction of each edge ignored at both ends, where corners round off. */
const EDGE_TRIM = 0.12;

interface Line {
  /** value = slope * along + intercept */
  slope: number;
  intercept: number;
}

interface Sample {
  along: number;
  value: number;
}

/** Plain least squares over the given points. */
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
 * Consensus fit, because least squares cannot survive this photo.
 *
 * A rotated screen's "topmost white pixel per column" traces the *left* edge
 * for every column left of the top-left corner — a third of the samples,
 * belonging to a line six times steeper — and the notch drags another fifth of
 * them far below the true edge. Least squares splits the difference and lands
 * on a line matching nothing.
 *
 * So: take every line through a pair of evenly-spaced anchor samples, keep the
 * one the most samples agree with, and refit on just those. Anchors are chosen
 * by stride rather than at random, so the result is bit-for-bit reproducible —
 * the golden-image suite depends on that.
 */
function consensusFit(points: Sample[], tolerance = 2): Line {
  if (points.length < 8) return leastSquares(points);

  const anchorCount = Math.min(48, points.length);
  const stride = (points.length - 1) / (anchorCount - 1);
  const anchors = Array.from(
    { length: anchorCount },
    (_unused, index) => points[Math.round(index * stride)]!,
  );

  let bestInliers: Sample[] = [];
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
      if (inliers.length > bestInliers.length) bestInliers = inliers;
    }
  }

  return leastSquares(bestInliers.length >= 2 ? bestInliers : points);
}

/** Intersection of a vertical-ish edge (x = f(y)) and a horizontal-ish one (y = g(x)). */
function intersect(vertical: Line, horizontal: Line): Point {
  // x = a*y + b and y = c*x + d  ->  x = a*(c*x + d) + b
  const denominator = 1 - vertical.slope * horizontal.slope;
  const x = (vertical.slope * horizontal.intercept + vertical.intercept) / denominator;
  return { x, y: horizontal.slope * x + horizontal.intercept };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

async function main(): Promise<void> {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const isWhite = (x: number, y: number): boolean => {
    const i = (y * width + x) * channels;
    return data[i]! > WHITE && data[i + 1]! > WHITE && data[i + 2]! > WHITE;
  };

  // --- per-pixel screen mask + row/column extents ------------------------
  const mask = Buffer.alloc(width * height);
  const rows: { y: number; left: number; right: number }[] = [];

  for (let y = 0; y < height; y += 1) {
    let bestLength = 0;
    let bestStart = -1;
    let bestEnd = -1;
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const white = x < width && isWhite(x, y);
      if (white && start < 0) start = x;
      if (!white && start >= 0) {
        if (x - start > bestLength) {
          bestLength = x - start;
          bestStart = start;
          bestEnd = x - 1;
        }
        start = -1;
      }
    }
    if (bestLength < MIN_RUN) continue;

    // The longest run decides whether this row is screen at all, but the row's
    // full lit extent decides the mask: the notch splits the top rows in two,
    // and the strips either side of it are screen that must take artwork.
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x += 1) {
      if (!isWhite(x, y)) continue;
      if (first < 0) first = x;
      last = x;
    }
    rows.push({ y, left: first, right: last });
    for (let x = first; x <= last; x += 1) {
      if (isWhite(x, y)) mask[y * width + x] = 255;
    }
  }

  if (rows.length < 50) throw new Error('Could not find a screen: too few lit rows.');

  const columns = new Map<number, { top: number; bottom: number }>();
  for (const row of rows) {
    for (let x = row.left; x <= row.right; x += 1) {
      if (!isWhite(x, row.y)) continue;
      const existing = columns.get(x);
      if (!existing) columns.set(x, { top: row.y, bottom: row.y });
      else existing.bottom = row.y;
    }
  }

  // --- fit the four edges ------------------------------------------------
  // Left and right first: the screen spans every row, so each row's outermost
  // lit pixel lies on one of these two edges, and the only outliers are the
  // rounded ends and any finger crossing the edge.
  const trimRows = Math.floor(rows.length * EDGE_TRIM);
  const middleRows = rows.slice(trimRows, rows.length - trimRows);
  const leftEdge = consensusFit(middleRows.map((r) => ({ along: r.y, value: r.left })));
  const rightEdge = consensusFit(middleRows.map((r) => ({ along: r.y, value: r.right })));

  const columnList = [...columns.entries()].sort((a, b) => a[0] - b[0]);
  const trimCols = Math.floor(columnList.length * EDGE_TRIM);
  const middleCols = columnList.slice(trimCols, columnList.length - trimCols);

  // Now drop the columns whose extreme pixel sits on the left or right edge
  // just fitted — those belong to a different side of the screen and would
  // otherwise dominate the top and bottom fits.
  const onSideEdge = (x: number, y: number): boolean =>
    Math.abs(x - (leftEdge.slope * y + leftEdge.intercept)) <= 6 ||
    Math.abs(x - (rightEdge.slope * y + rightEdge.intercept)) <= 6;

  const topEdge = consensusFit(
    middleCols.filter(([x, c]) => !onSideEdge(x, c.top)).map(([x, c]) => ({ along: x, value: c.top })),
  );
  const bottomEdge = consensusFit(
    middleCols
      .filter(([x, c]) => !onSideEdge(x, c.bottom))
      .map(([x, c]) => ({ along: x, value: c.bottom })),
  );

  /**
   * Slide each edge outward until it touches the outermost lit pixel.
   *
   * The fits give reliable *slopes*, but their offsets land wherever the
   * sampled boundary happened to sit, which leaves slivers of bare screen
   * showing at the rounded corners. Turning each edge into a supporting line
   * guarantees the warp covers every pixel the mask will reveal; the mask is
   * what defines the visible shape, so the quad only has to contain it.
   */
  const supportEdges = () => {
    let topC = Infinity;
    let bottomC = -Infinity;
    let leftC = Infinity;
    let rightC = -Infinity;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mask[y * width + x]) continue;
        topC = Math.min(topC, y - topEdge.slope * x);
        bottomC = Math.max(bottomC, y - bottomEdge.slope * x);
        leftC = Math.min(leftC, x - leftEdge.slope * y);
        rightC = Math.max(rightC, x - rightEdge.slope * y);
      }
    }
    return {
      top: { slope: topEdge.slope, intercept: topC },
      bottom: { slope: bottomEdge.slope, intercept: bottomC },
      left: { slope: leftEdge.slope, intercept: leftC },
      right: { slope: rightEdge.slope, intercept: rightC },
    };
  };

  const support = supportEdges();
  const corners = {
    tl: intersect(support.left, support.top),
    tr: intersect(support.right, support.top),
    br: intersect(support.right, support.bottom),
    bl: intersect(support.left, support.bottom),
  };

  const topLength = distance(corners.tl, corners.tr);
  const bottomLength = distance(corners.bl, corners.br);
  const leftLength = distance(corners.tl, corners.bl);
  const rightLength = distance(corners.tr, corners.br);
  const projectedAspect = (topLength + bottomLength) / (leftLength + rightLength);

  // A modern phone screen is 1179x2556 (0.4613). When the measured projection
  // is within a few percent, prefer the real device ratio: designers build to
  // it, and the tiny difference is absorbed by the warp.
  const DEVICE_ASPECT = 1179 / 2556;
  const useDevice = Math.abs(projectedAspect - DEVICE_ASPECT) / DEVICE_ASPECT < 0.06;
  const aspect = useDevice ? DEVICE_ASPECT : projectedAspect;

  console.log(`screen corners (px):`);
  for (const [name, p] of Object.entries(corners)) {
    console.log(`  ${name}  ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`);
  }
  console.log(
    `edges: top ${topLength.toFixed(0)} bottom ${bottomLength.toFixed(0)} ` +
      `left ${leftLength.toFixed(0)} right ${rightLength.toFixed(0)}`,
  );
  console.log(
    `projected aspect ${projectedAspect.toFixed(4)} -> using ` +
      `${useDevice ? `device ${DEVICE_ASPECT.toFixed(4)}` : 'measured'}`,
  );

  const normalize = (p: Point): Point => ({ x: p.x / width, y: p.y / height });
  const normalized = {
    tl: normalize(corners.tl),
    tr: normalize(corners.tr),
    br: normalize(corners.br),
    bl: normalize(corners.bl),
  };
  const polygonPx = quadPoints(corners);

  // --- assets ------------------------------------------------------------
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = new Map<string, Buffer>();

  files.set(
    'base.png',
    await sharp(SOURCE).flatten({ background: '#000000' }).png({ compressionLevel: 9 }).toBuffer(),
  );

  // The mask is the thresholded screen itself: rounded corners, the notch and
  // any finger crossing an edge are all excluded exactly as photographed.
  files.set(
    'mask-screen.png',
    await sharp(mask, { raw: { width, height, channels: 1 } })
      .blur(0.8)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  // A phone screen is emissive, so lighting stays subtle — just enough falloff
  // to sit the artwork in the photo's blue/red rim light.
  files.set(
    'shadow-screen.png',
    await svgToPng(
      shadowMapSvg({ width, height }, [polygonPx], { direction: 'vertical', strength: 0.14 }),
    ),
  );
  files.set(
    'highlight-screen.png',
    await svgToPng(highlightMapSvg({ width, height }, [polygonPx], { strength: 0.12, sweep: 0.2 })),
  );

  const previewPng = await sharp(files.get('base.png')!)
    .composite([
      {
        input: await svgToPng(
          svg({ width, height }, `<polygon points="${svgPoints(polygonPx)}" fill="#e9ecef"/>`),
        ),
        blend: 'over',
      },
      // Re-apply the screen mask so the preview's placeholder respects the
      // notch and fingers too.
      {
        input: await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer(),
        blend: 'dest-in',
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  // dest-in above clipped the whole composite to the mask; redo it as base +
  // masked placeholder so the phone and background survive.
  const placeholderLayer = await sharp(
    await svgToPng(svg({ width, height }, `<polygon points="${svgPoints(polygonPx)}" fill="#e9ecef"/>`)),
  )
    .composite([
      {
        input: await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer(),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  const preview = await sharp(files.get('base.png')!)
    .composite([{ input: placeholderLayer, blend: 'over' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  void previewPng;
  files.set('preview.png', preview);
  files.set('thumbnail.png', await thumbnail(preview, 480));

  const layers: Layer[] = [
    { type: 'base', src: 'base.png' },
    {
      type: 'surface',
      id: 'screen',
      label: 'Screen',
      placeholder: {
        aspect,
        recommendedWidth: 1179,
        recommendedHeight: Math.round(1179 / aspect),
        hint: 'Place your design here, then click Render',
      },
      warp: { kind: 'homography', corners: normalized },
      lighting: {
        multiply: 'shadow-screen.png',
        multiplyOpacity: 1,
        screen: 'highlight-screen.png',
        screenOpacity: 1,
      },
      mask: 'mask-screen.png',
      opacity: 1,
      blend: 'normal',
    },
  ];

  const item = MockupItemSchema.parse({
    id: 'smartphone-in-hand-01',
    name: 'Smartphone in Hand, Dark',
    category: 'devices',
    viewpoint: 'in-hand',
    tags: ['phone', 'smartphone', 'in hand', 'held', 'app', 'dark', 'neon', 'night', 'screen'],
    canvas: { width, height },
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  for (const [name, buffer] of files) await fs.writeFile(path.join(OUT_DIR, name), buffer);
  await fs.writeFile(path.join(OUT_DIR, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

  console.log(`✓ Wrote ${files.size + 1} files to ${OUT_DIR}`);
}

await main();
