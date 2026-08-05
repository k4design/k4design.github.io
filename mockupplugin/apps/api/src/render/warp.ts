import type { MeshGeometry, Point, Quad } from '@mf/shared';

/**
 * The warp core.
 *
 * Everything here is pure and synchronous so it can be unit-tested against
 * known fixtures. Two ideas carry the whole file:
 *
 * 1. **Inverse mapping.** For every *destination* pixel we solve back to a
 *    source coordinate and sample there. Forward-mapping source pixels onto the
 *    destination leaves holes wherever the transform stretches; inverse mapping
 *    cannot, by construction.
 *
 * 2. **A sampler is just `(x, y) -> source coordinate | null`.** Homography and
 *    mesh warps differ only in how they answer that question, so displacement,
 *    masking, lighting and compositing are written once and work for both.
 */

export type Matrix3 = [number, number, number, number, number, number, number, number, number];

export interface SourceCoord {
  sx: number;
  sy: number;
}

/** Answers "which source pixel belongs at this destination pixel?" */
export interface Sampler {
  /** Writes into `out` and returns false when the pixel is outside the surface. */
  locate(x: number, y: number, out: SourceCoord): boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ */
/* Linear algebra                                                      */
/* ------------------------------------------------------------------ */

/**
 * Solves an n x n system by Gaussian elimination with partial pivoting.
 * `rows` is augmented: each row is [a0..a(n-1), b].
 */
export function solveLinear(rows: number[][]): number[] | null {
  const n = rows.length;
  const m = rows.map((row) => [...row]);

  for (let col = 0; col < n; col += 1) {
    // Partial pivoting: without it, a perfectly ordinary axis-aligned quad
    // produces a zero pivot and the solve fails.
    let pivot = col;
    let best = Math.abs(m[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row += 1) {
      const candidate = Math.abs(m[row]?.[col] ?? 0);
      if (candidate > best) {
        best = candidate;
        pivot = row;
      }
    }
    if (best < 1e-12) return null;

    if (pivot !== col) {
      const a = m[col]!;
      m[col] = m[pivot]!;
      m[pivot] = a;
    }

    const pivotRow = m[col]!;
    const pivotValue = pivotRow[col]!;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const target = m[row]!;
      const factor = target[col]! / pivotValue;
      if (factor === 0) continue;
      for (let k = col; k <= n; k += 1) {
        target[k] = target[k]! - factor * pivotRow[k]!;
      }
    }
  }

  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    const row = m[i]!;
    out[i] = row[n]! / row[i]!;
  }
  return out;
}

/**
 * The perspective transform taking the four `from` points to the four `to`
 * points, as a row-major 3x3 matrix with h22 fixed at 1.
 *
 * Returns null when the points are degenerate (collinear, coincident), which is
 * an authoring error rather than a runtime one.
 */
export function solvePerspective(from: Point[], to: Point[]): Matrix3 | null {
  if (from.length !== 4 || to.length !== 4) return null;

  const rows: number[][] = [];
  for (let i = 0; i < 4; i += 1) {
    const f = from[i]!;
    const t = to[i]!;
    rows.push([f.x, f.y, 1, 0, 0, 0, -t.x * f.x, -t.x * f.y, t.x]);
    rows.push([0, 0, 0, f.x, f.y, 1, -t.y * f.x, -t.y * f.y, t.y]);
  }

  const solved = solveLinear(rows);
  if (!solved) return null;

  const [a, b, c, d, e, f, g, h] = solved as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  if (![a, b, c, d, e, f, g, h].every(Number.isFinite)) return null;
  return [a, b, c, d, e, f, g, h, 1];
}

export function applyMatrix(m: Matrix3, x: number, y: number): Point {
  const w = m[6] * x + m[7] * y + m[8];
  if (w === 0) return { x: 0, y: 0 };
  return { x: (m[0] * x + m[1] * y + m[2]) / w, y: (m[3] * x + m[4] * y + m[5]) / w };
}

/* ------------------------------------------------------------------ */
/* Samplers                                                            */
/* ------------------------------------------------------------------ */

/**
 * A four-point perspective warp.
 *
 * The matrix is solved in the *inverse* direction — destination quad to source
 * rectangle — so no matrix inversion is needed. Containment falls out for free:
 * a destination pixel belongs to the surface exactly when its source coordinate
 * lands inside the source image.
 */
export function homographySampler(
  corners: Quad,
  source: { width: number; height: number },
): Sampler | null {
  const destination = [corners.tl, corners.tr, corners.br, corners.bl];
  const sourceRect = [
    { x: 0, y: 0 },
    { x: source.width, y: 0 },
    { x: source.width, y: source.height },
    { x: 0, y: source.height },
  ];

  const matrix = solvePerspective(destination, sourceRect);
  if (!matrix) return null;

  const maxX = source.width;
  const maxY = source.height;
  const [a, b, c, d, e, f, g, h, i] = matrix;

  return {
    locate(x, y, out) {
      const w = g * x + h * y + i;
      if (w === 0) return false;
      const sx = (a * x + b * y + c) / w;
      const sy = (d * x + e * y + f) / w;
      // Half-pixel slack keeps the outermost row of pixels from being dropped
      // to transparent along the surface edge.
      if (sx < -0.5 || sy < -0.5 || sx > maxX + 0.5 || sy > maxY + 0.5) return false;
      out.sx = sx;
      out.sy = sy;
      return true;
    },
  };
}

/**
 * A piecewise affine warp over a triangulated grid.
 *
 * Each grid cell is split into two triangles; each triangle gets the affine map
 * taking its destination vertices back to its source vertices. Point location is
 * a precomputed index raster over the destination bounding box, so per-pixel
 * lookup is O(1) and a displaced coordinate that lands outside the mesh reports
 * "no source" rather than sampling the wrong triangle.
 */
export function meshSampler(
  mesh: MeshGeometry,
  source: { width: number; height: number },
  bounds: Rect,
): Sampler | null {
  const { rows, cols } = mesh;
  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));

  const triangleCount = rows * cols * 2;
  // Per triangle: 6 affine coefficients mapping destination -> source.
  const affine = new Float64Array(triangleCount * 6);
  const index = new Int32Array(width * height).fill(-1);

  const destPoint = (col: number, row: number): Point => {
    const p = mesh.points[row * (cols + 1) + col];
    if (!p) throw new Error(`mesh point out of range: ${col},${row}`);
    return p;
  };
  const srcPoint = (col: number, row: number): Point => ({
    x: (col / cols) * source.width,
    y: (row / rows) * source.height,
  });

  let triangle = 0;
  let degenerate = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const d00 = destPoint(col, row);
      const d10 = destPoint(col + 1, row);
      const d11 = destPoint(col + 1, row + 1);
      const d01 = destPoint(col, row + 1);
      const s00 = srcPoint(col, row);
      const s10 = srcPoint(col + 1, row);
      const s11 = srcPoint(col + 1, row + 1);
      const s01 = srcPoint(col, row + 1);

      // Split along the shorter diagonal: the more equilateral the triangles,
      // the less the affine approximation shears within a cell.
      const diagA = dist2(d00, d11);
      const diagB = dist2(d10, d01);
      const pairs: [Point[], Point[]][] =
        diagA <= diagB
          ? [
              [
                [d00, d10, d11],
                [s00, s10, s11],
              ],
              [
                [d00, d11, d01],
                [s00, s11, s01],
              ],
            ]
          : [
              [
                [d00, d10, d01],
                [s00, s10, s01],
              ],
              [
                [d10, d11, d01],
                [s10, s11, s01],
              ],
            ];

      for (const [dest, src] of pairs) {
        if (!writeAffine(affine, triangle, dest, src)) degenerate += 1;
        rasterizeTriangle(index, width, height, bounds, dest, triangle);
        triangle += 1;
      }
    }
  }

  if (degenerate === triangleCount) return null;

  const originX = bounds.x;
  const originY = bounds.y;

  return {
    locate(x, y, out) {
      const ix = Math.floor(x - originX);
      const iy = Math.floor(y - originY);
      if (ix < 0 || iy < 0 || ix >= width || iy >= height) return false;
      const id = index[iy * width + ix]!;
      if (id < 0) return false;
      const base = id * 6;
      out.sx = affine[base]! * x + affine[base + 1]! * y + affine[base + 2]!;
      out.sy = affine[base + 3]! * x + affine[base + 4]! * y + affine[base + 5]!;
      return true;
    },
  };
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Affine map taking three destination vertices to three source vertices. */
function writeAffine(out: Float64Array, triangle: number, dest: Point[], src: Point[]): boolean {
  const [d0, d1, d2] = dest as [Point, Point, Point];
  const [s0, s1, s2] = src as [Point, Point, Point];

  const det = (d1.x - d0.x) * (d2.y - d0.y) - (d2.x - d0.x) * (d1.y - d0.y);
  if (Math.abs(det) < 1e-9) {
    // A collapsed cell contributes nothing; leaving its coefficients at zero
    // means any pixel that lands in it samples the source origin, and the mask
    // clips it away regardless.
    return false;
  }

  const base = triangle * 6;
  for (let axis = 0; axis < 2; axis += 1) {
    const v0 = axis === 0 ? s0.x : s0.y;
    const v1 = axis === 0 ? s1.x : s1.y;
    const v2 = axis === 0 ? s2.x : s2.y;
    const a = ((v1 - v0) * (d2.y - d0.y) - (v2 - v0) * (d1.y - d0.y)) / det;
    const b = ((v2 - v0) * (d1.x - d0.x) - (v1 - v0) * (d2.x - d0.x)) / det;
    const c = v0 - a * d0.x - b * d0.y;
    out[base + axis * 3] = a;
    out[base + axis * 3 + 1] = b;
    out[base + axis * 3 + 2] = c;
  }
  return true;
}

/**
 * Fills `index` with `id` for every pixel centre inside the triangle. Uses a
 * top-left fill rule so neighbouring triangles tile without gaps or overlap
 * fighting.
 */
function rasterizeTriangle(
  index: Int32Array,
  width: number,
  height: number,
  bounds: Rect,
  dest: Point[],
  id: number,
): void {
  const [p0, p1, p2] = dest as [Point, Point, Point];

  const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x) - bounds.x) - 1);
  const maxX = Math.min(width - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x) - bounds.x) + 1);
  const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y) - bounds.y) - 1);
  const maxY = Math.min(height - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y) - bounds.y) + 1);
  if (minX > maxX || minY > maxY) return;

  const area = edge(p0, p1, p2);
  if (Math.abs(area) < 1e-9) return;
  const sign = area > 0 ? 1 : -1;

  for (let iy = minY; iy <= maxY; iy += 1) {
    const y = iy + bounds.y + 0.5;
    for (let ix = minX; ix <= maxX; ix += 1) {
      const x = ix + bounds.x + 0.5;
      const p = { x, y };
      const w0 = edge(p1, p2, p) * sign;
      const w1 = edge(p2, p0, p) * sign;
      const w2 = edge(p0, p1, p) * sign;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        index[iy * width + ix] = id;
      }
    }
  }
}

function edge(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

/* ------------------------------------------------------------------ */
/* Sampling and warping                                               */
/* ------------------------------------------------------------------ */

/**
 * Bilinear sample of a premultiplied-alpha RGBA buffer.
 *
 * Sampling must be premultiplied: interpolating straight RGBA drags the colour
 * of fully transparent pixels into the edges of the artwork, which shows up as
 * dark or white fringing wherever a design has soft edges.
 */
export function sampleBilinear(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  out: Float64Array,
): void {
  const cx = Math.min(width - 1, Math.max(0, x - 0.5));
  const cy = Math.min(height - 1, Math.max(0, y - 0.5));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  for (let channel = 0; channel < 4; channel += 1) {
    out[channel] =
      data[i00 + channel]! * w00 +
      data[i10 + channel]! * w10 +
      data[i01 + channel]! * w01 +
      data[i11 + channel]! * w11;
  }
}

export interface DisplacementField {
  /** Grayscale or RGBA map data. */
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  /** Maximum offset in canvas pixels at full black/white. */
  scale: number;
  /** When true, red drives X and green drives Y; otherwise luminance drives both. */
  vector: boolean;
}

export interface WarpInput {
  /** Premultiplied RGBA of the user's design. */
  source: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
  sampler: Sampler;
  /** Destination region to fill, in canvas pixels. */
  bounds: Rect;
  /** Canvas size, so displacement maps can be sampled in normalized space. */
  canvasWidth: number;
  canvasHeight: number;
  displacement?: DisplacementField;
}

export interface WarpOutput {
  /** Premultiplied RGBA covering `bounds`. */
  data: Uint8Array;
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Warps the source into a layer covering `bounds`.
 *
 * Displacement is applied to the *destination* coordinate before inverse
 * mapping, which is what makes `scale` mean "canvas pixels" as documented, and
 * lets a displaced pixel fall off the surface entirely instead of smearing the
 * nearest triangle.
 */
export function warpSurface(input: WarpInput): WarpOutput {
  const width = Math.max(1, Math.ceil(input.bounds.width));
  const height = Math.max(1, Math.ceil(input.bounds.height));
  const out = new Uint8Array(width * height * 4);

  const coord: SourceCoord = { sx: 0, sy: 0 };
  const pixel = new Float64Array(4);
  const displacement = input.displacement;

  for (let row = 0; row < height; row += 1) {
    const baseY = input.bounds.y + row + 0.5;
    for (let col = 0; col < width; col += 1) {
      const baseX = input.bounds.x + col + 0.5;

      let x = baseX;
      let y = baseY;

      if (displacement) {
        const offset = sampleDisplacement(displacement, baseX / input.canvasWidth, baseY / input.canvasHeight);
        x += offset.dx;
        y += offset.dy;
      }

      if (!input.sampler.locate(x, y, coord)) continue;

      sampleBilinear(input.source, input.sourceWidth, input.sourceHeight, coord.sx, coord.sy, pixel);
      const alpha = pixel[3]!;
      if (alpha < 0.5) continue;

      const target = (row * width + col) * 4;
      out[target] = clamp255(pixel[0]!);
      out[target + 1] = clamp255(pixel[1]!);
      out[target + 2] = clamp255(pixel[2]!);
      out[target + 3] = clamp255(alpha);
    }
  }

  return { data: out, width, height, x: Math.floor(input.bounds.x), y: Math.floor(input.bounds.y) };
}

const displacementResult = { dx: 0, dy: 0 };

function sampleDisplacement(
  field: DisplacementField,
  u: number,
  v: number,
): { dx: number; dy: number } {
  const x = Math.min(field.width - 1, Math.max(0, Math.round(u * field.width)));
  const y = Math.min(field.height - 1, Math.max(0, Math.round(v * field.height)));
  const index = (y * field.width + x) * field.channels;

  if (field.vector && field.channels >= 2) {
    displacementResult.dx = ((field.data[index]! - 128) / 127) * field.scale;
    displacementResult.dy = ((field.data[index + 1]! - 128) / 127) * field.scale;
    return displacementResult;
  }

  // Luminance maps push along both axes, which reads as cloth bunching rather
  // than sliding in one direction.
  const value = (field.data[index]! - 128) / 127;
  displacementResult.dx = value * field.scale;
  displacementResult.dy = value * field.scale * 0.72;
  return displacementResult;
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/** Destination bounding box of a set of points, clamped to the canvas and padded. */
export function surfaceBounds(
  points: Point[],
  canvas: { width: number; height: number },
  pad = 2,
): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const x = Math.max(0, Math.floor(minX - pad));
  const y = Math.max(0, Math.floor(minY - pad));
  return {
    x,
    y,
    width: Math.min(canvas.width, Math.ceil(maxX + pad)) - x,
    height: Math.min(canvas.height, Math.ceil(maxY + pad)) - y,
  };
}
