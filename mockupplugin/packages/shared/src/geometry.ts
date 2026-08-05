import type { MeshGeometry, Point, Quad } from './item.js';

/**
 * Construction helpers for warp geometry, shared by the seed generator, the
 * authoring tool and the renderer. Everything here works in normalized canvas
 * space (0..1) and is pure — no rasterizing, no I/O.
 */

export const pt = (x: number, y: number): Point => ({ x, y });

export function quad(tl: Point, tr: Point, br: Point, bl: Point): Quad {
  return { tl, tr, br, bl };
}

/** Corners of an axis-aligned rectangle, in design order. */
export function rectQuad(x: number, y: number, w: number, h: number): Quad {
  return quad(pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h));
}

export function quadPoints(q: Quad): Point[] {
  return [q.tl, q.tr, q.br, q.bl];
}

/** Bilinear interpolation across a quad; (u, v) both in 0..1. */
export function quadLerp(q: Quad, u: number, v: number): Point {
  const top = pt(q.tl.x + (q.tr.x - q.tl.x) * u, q.tl.y + (q.tr.y - q.tl.y) * u);
  const bottom = pt(q.bl.x + (q.br.x - q.bl.x) * u, q.bl.y + (q.br.y - q.bl.y) * u);
  return pt(top.x + (bottom.x - top.x) * v, top.y + (bottom.y - top.y) * v);
}

export interface MeshFromQuadOptions {
  cols?: number;
  rows?: number;
  /**
   * Displaces interior points along the surface normal to fake curvature.
   * Positive values bulge toward the viewer's right/bottom depending on axis.
   */
  warp?: (u: number, v: number, point: Point) => Point;
}

/**
 * Builds a mesh by sampling a quad on a uniform (cols+1) x (rows+1) grid, then
 * optionally displacing each sample. Every mesh below is a variation on this.
 */
export function meshFromQuad(q: Quad, options: MeshFromQuadOptions = {}): MeshGeometry {
  const cols = options.cols ?? 8;
  const rows = options.rows ?? 8;
  const points: Point[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let col = 0; col <= cols; col += 1) {
      const u = col / cols;
      const base = quadLerp(q, u, v);
      points.push(options.warp ? options.warp(u, v, base) : base);
    }
  }
  return { kind: 'mesh', rows, cols, points };
}

/**
 * A label wrapped around a cylinder seen from the side.
 *
 * Horizontally the design compresses toward the silhouette edges as
 * `cos`-spaced samples, which is what actually happens when a flat label is
 * wrapped round a tube. Vertically the top and bottom edges bow by
 * `edgeCurve` to follow the cylinder's elliptical rim.
 *
 * @param wrap fraction of the cylinder's circumference that is visible, 0..1.
 *             Lower values mean a narrower, more strongly foreshortened view.
 */
export function cylinderMesh(
  q: Quad,
  options: {
    cols?: number;
    rows?: number;
    wrap?: number;
    edgeCurve?: number;
  } = {},
): MeshGeometry {
  const cols = options.cols ?? 12;
  const rows = options.rows ?? 6;
  const wrap = options.wrap ?? 0.62;
  const edgeCurve = options.edgeCurve ?? 0.035;

  // Angular half-extent of the visible arc.
  const halfAngle = (Math.PI / 2) * Math.min(1, Math.max(0.05, wrap));

  const points: Point[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let col = 0; col <= cols; col += 1) {
      const u = col / cols;
      // Map u linearly onto the arc, then project to the viewing plane.
      const angle = (u * 2 - 1) * halfAngle;
      const projected = (Math.sin(angle) / Math.sin(halfAngle) + 1) / 2;
      const base = quadLerp(q, projected, v);
      // Rim bow: strongest at the centre of the visible arc, and it flips sign
      // between the top and bottom edges so the label looks wrapped, not bent.
      const bow = Math.cos(angle) * edgeCurve;
      points.push(pt(base.x, base.y + bow * (v - 0.5) * 2));
    }
  }
  return { kind: 'mesh', rows, cols, points };
}

/**
 * Fabric lying on a surface: a gentle overall sag plus a slow lateral drift,
 * the low-frequency shape of cloth. Wrinkle detail is a displacement map's job,
 * not the mesh's.
 */
export function fabricMesh(
  q: Quad,
  options: { cols?: number; rows?: number; sag?: number; drift?: number } = {},
): MeshGeometry {
  const sag = options.sag ?? 0.02;
  const drift = options.drift ?? 0.008;
  return meshFromQuad(q, {
    cols: options.cols ?? 10,
    rows: options.rows ?? 10,
    warp: (u, v, point) => {
      // Sag peaks mid-width and grows toward the bottom of the panel.
      const across = Math.sin(u * Math.PI);
      const down = v;
      return pt(
        point.x + Math.sin(v * Math.PI * 1.5) * drift * (u - 0.5) * 2,
        point.y + across * down * sag,
      );
    },
  });
}

/** Row-major accessor for a mesh's destination grid. */
export function meshPoint(mesh: MeshGeometry, col: number, row: number): Point {
  const index = row * (mesh.cols + 1) + col;
  const found = mesh.points[index];
  if (!found) {
    throw new Error(`mesh point out of range: col=${col} row=${row}`);
  }
  return found;
}

/**
 * The mesh's outer boundary as a closed polygon, walked clockwise from the
 * top-left. Used to build alpha masks that match the warp exactly.
 */
export function meshOutline(mesh: MeshGeometry): Point[] {
  const { rows, cols } = mesh;
  const out: Point[] = [];
  for (let col = 0; col <= cols; col += 1) out.push(meshPoint(mesh, col, 0));
  for (let row = 1; row <= rows; row += 1) out.push(meshPoint(mesh, cols, row));
  for (let col = cols - 1; col >= 0; col -= 1) out.push(meshPoint(mesh, col, rows));
  for (let row = rows - 1; row >= 1; row -= 1) out.push(meshPoint(mesh, 0, row));
  return out;
}

/** Scale normalized points into pixel space. */
export function denormalize(points: Point[], width: number, height: number): Point[] {
  return points.map((p) => pt(p.x * width, p.y * height));
}

export function boundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
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
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** `polygon` points attribute for an SVG element. */
export function svgPoints(points: Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
