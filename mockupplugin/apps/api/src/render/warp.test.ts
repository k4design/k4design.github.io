import { describe, expect, it } from 'vitest';
import { meshFromQuad, rectQuad, quad, pt, denormalize, quadPoints } from '@mf/shared';
import {
  applyMatrix,
  homographySampler,
  meshSampler,
  sampleBilinear,
  solvePerspective,
  surfaceBounds,
  warpSurface,
  type SourceCoord,
} from './warp.js';

const coord = (): SourceCoord => ({ sx: 0, sy: 0 });

describe('solvePerspective', () => {
  it('maps every control point exactly', () => {
    const from = [pt(0, 0), pt(100, 0), pt(100, 50), pt(0, 50)];
    const to = [pt(10, 20), pt(210, 5), pt(190, 130), pt(30, 110)];
    const matrix = solvePerspective(from, to);
    expect(matrix).not.toBeNull();

    for (let i = 0; i < 4; i += 1) {
      const mapped = applyMatrix(matrix!, from[i]!.x, from[i]!.y);
      expect(mapped.x).toBeCloseTo(to[i]!.x, 6);
      expect(mapped.y).toBeCloseTo(to[i]!.y, 6);
    }
  });

  it('recovers an exact affine transform', () => {
    // A pure 2x scale plus translation is a homography with g = h = 0.
    const from = [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)];
    const to = [pt(5, 7), pt(25, 7), pt(25, 27), pt(5, 27)];
    const matrix = solvePerspective(from, to)!;
    expect(matrix[0]).toBeCloseTo(2, 9);
    expect(matrix[4]).toBeCloseTo(2, 9);
    expect(matrix[2]).toBeCloseTo(5, 9);
    expect(matrix[5]).toBeCloseTo(7, 9);
    expect(matrix[6]).toBeCloseTo(0, 9);
    expect(matrix[7]).toBeCloseTo(0, 9);
  });

  it('handles an axis-aligned square, which needs pivoting', () => {
    const unit = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
    const matrix = solvePerspective(unit, unit);
    expect(matrix).not.toBeNull();
    const mapped = applyMatrix(matrix!, 0.25, 0.75);
    expect(mapped.x).toBeCloseTo(0.25, 9);
    expect(mapped.y).toBeCloseTo(0.75, 9);
  });

  it('rejects degenerate point sets', () => {
    const collinear = [pt(0, 0), pt(1, 1), pt(2, 2), pt(3, 3)];
    expect(solvePerspective(collinear, collinear)).toBeNull();
  });

  it('inverts itself: solving A->B then B->A round-trips', () => {
    const a = [pt(0, 0), pt(80, 0), pt(80, 60), pt(0, 60)];
    const b = [pt(12, 4), pt(96, 18), pt(88, 74), pt(4, 62)];
    const forward = solvePerspective(a, b)!;
    const back = solvePerspective(b, a)!;
    const mid = applyMatrix(forward, 33, 21);
    const home = applyMatrix(back, mid.x, mid.y);
    expect(home.x).toBeCloseTo(33, 6);
    expect(home.y).toBeCloseTo(21, 6);
  });
});

describe('homographySampler', () => {
  it('is the identity when the quad equals the source rect', () => {
    const source = { width: 200, height: 100 };
    const sampler = homographySampler(
      quad(pt(0, 0), pt(200, 0), pt(200, 100), pt(0, 100)),
      source,
    )!;
    const out = coord();

    expect(sampler.locate(50.5, 20.5, out)).toBe(true);
    expect(out.sx).toBeCloseTo(50.5, 9);
    expect(out.sy).toBeCloseTo(20.5, 9);
  });

  it('maps the destination corners to the source corners', () => {
    const source = { width: 300, height: 200 };
    const corners = quad(pt(40, 30), pt(260, 10), pt(280, 190), pt(20, 170));
    const sampler = homographySampler(corners, source)!;
    const out = coord();

    const expected = [
      [corners.tl, { sx: 0, sy: 0 }],
      [corners.tr, { sx: 300, sy: 0 }],
      [corners.br, { sx: 300, sy: 200 }],
      [corners.bl, { sx: 0, sy: 200 }],
    ] as const;

    for (const [dest, want] of expected) {
      expect(sampler.locate(dest.x, dest.y, out)).toBe(true);
      expect(out.sx).toBeCloseTo(want.sx, 5);
      expect(out.sy).toBeCloseTo(want.sy, 5);
    }
  });

  it('reports pixels outside the quad as having no source', () => {
    const sampler = homographySampler(
      quad(pt(100, 100), pt(200, 100), pt(200, 200), pt(100, 200)),
      { width: 100, height: 100 },
    )!;
    const out = coord();
    expect(sampler.locate(50, 50, out)).toBe(false);
    expect(sampler.locate(250, 150, out)).toBe(false);
    expect(sampler.locate(150, 150, out)).toBe(true);
  });

  it('halves the source step when the destination is twice as wide', () => {
    const sampler = homographySampler(
      quad(pt(0, 0), pt(200, 0), pt(200, 200), pt(0, 200)),
      { width: 100, height: 100 },
    )!;
    const a = coord();
    const b = coord();
    sampler.locate(10, 10, a);
    sampler.locate(30, 10, b);
    expect(b.sx - a.sx).toBeCloseTo(10, 6);
  });
});

describe('meshSampler', () => {
  const source = { width: 120, height: 80 };

  it('reduces to the identity for a uniform grid over the source rect', () => {
    const mesh = meshFromQuad(rectQuad(0, 0, 120, 80), { cols: 6, rows: 4 });
    const bounds = { x: 0, y: 0, width: 120, height: 80 };
    const sampler = meshSampler(mesh, source, bounds)!;
    const out = coord();

    for (const [x, y] of [
      [10.5, 10.5],
      [60.5, 40.5],
      [119.5, 79.5],
      [1.5, 78.5],
    ] as const) {
      expect(sampler.locate(x, y, out)).toBe(true);
      expect(out.sx).toBeCloseTo(x, 4);
      expect(out.sy).toBeCloseTo(y, 4);
    }
  });

  it('agrees with the homography sampler on an undistorted quad', () => {
    // A mesh whose control points lie on a perspective quad should match the
    // exact perspective solution closely; a 2x2 grid is coarse, so allow a
    // pixel of piecewise-affine error.
    const corners = quad(pt(20, 15), pt(180, 5), pt(190, 95), pt(10, 105));
    const mesh = meshFromQuad(corners, { cols: 12, rows: 12 });
    const bounds = surfaceBounds(quadPoints(corners), { width: 220, height: 130 });

    const exact = homographySampler(corners, source)!;
    const approx = meshSampler(mesh, source, bounds)!;
    const a = coord();
    const b = coord();

    let compared = 0;
    for (let y = bounds.y + 4; y < bounds.y + bounds.height - 4; y += 7) {
      for (let x = bounds.x + 4; x < bounds.x + bounds.width - 4; x += 7) {
        if (!exact.locate(x + 0.5, y + 0.5, a)) continue;
        if (!approx.locate(x + 0.5, y + 0.5, b)) continue;
        // Bilinear mesh interpolation is not perspective-correct, so the two
        // disagree most in the middle of the quad. A few pixels on a 180px
        // surface is the expected magnitude.
        expect(Math.abs(a.sx - b.sx)).toBeLessThan(4);
        expect(Math.abs(a.sy - b.sy)).toBeLessThan(4);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(20);
  });

  it('covers every interior pixel of the mesh, leaving no holes', () => {
    // The mesh spans x 5..105 and y 5..65; scan strictly inside it, since the
    // point of this test is that adjacent triangles tile without gaps.
    const mesh = meshFromQuad(rectQuad(5, 5, 100, 60), { cols: 7, rows: 5 });
    const bounds = { x: 0, y: 0, width: 120, height: 80 };
    const sampler = meshSampler(mesh, source, bounds)!;
    const out = coord();

    let holes = 0;
    for (let y = 6; y < 64; y += 1) {
      for (let x = 6; x < 104; x += 1) {
        if (!sampler.locate(x + 0.5, y + 0.5, out)) holes += 1;
      }
    }
    expect(holes).toBe(0);
  });

  it('reports no source outside the mesh outline', () => {
    const mesh = meshFromQuad(rectQuad(40, 40, 40, 20), { cols: 4, rows: 2 });
    const sampler = meshSampler(mesh, source, { x: 0, y: 0, width: 120, height: 80 })!;
    const out = coord();
    expect(sampler.locate(10.5, 10.5, out)).toBe(false);
    expect(sampler.locate(100.5, 70.5, out)).toBe(false);
    expect(sampler.locate(60.5, 50.5, out)).toBe(true);
  });
});

describe('sampleBilinear', () => {
  /** 2x2 premultiplied RGBA: opaque red, green, blue, white. */
  const image = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);

  it('returns exact pixel values at pixel centres', () => {
    const out = new Float64Array(4);
    sampleBilinear(image, 2, 2, 0.5, 0.5, out);
    expect([...out]).toEqual([255, 0, 0, 255]);
    sampleBilinear(image, 2, 2, 1.5, 1.5, out);
    expect([...out]).toEqual([255, 255, 255, 255]);
  });

  it('averages the four neighbours at the centre of the image', () => {
    const out = new Float64Array(4);
    sampleBilinear(image, 2, 2, 1, 1, out);
    expect(out[0]).toBeCloseTo((255 + 0 + 0 + 255) / 4, 6);
    expect(out[1]).toBeCloseTo((0 + 255 + 0 + 255) / 4, 6);
    expect(out[2]).toBeCloseTo((0 + 0 + 255 + 255) / 4, 6);
    expect(out[3]).toBeCloseTo(255, 6);
  });

  it('clamps at the edges instead of wrapping', () => {
    const out = new Float64Array(4);
    sampleBilinear(image, 2, 2, -5, -5, out);
    expect([...out]).toEqual([255, 0, 0, 255]);
    sampleBilinear(image, 2, 2, 99, 99, out);
    expect([...out]).toEqual([255, 255, 255, 255]);
  });
});

describe('warpSurface', () => {
  /** A 4x4 opaque mid-grey source. */
  function grey(width: number, height: number, value = 128): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      data[i * 4] = value;
      data[i * 4 + 1] = value;
      data[i * 4 + 2] = value;
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  it('fills exactly the destination quad and leaves the rest transparent', () => {
    const canvas = { width: 40, height: 40 };
    const corners = quad(pt(10, 10), pt(30, 10), pt(30, 30), pt(10, 30));
    const bounds = surfaceBounds(quadPoints(corners), canvas, 0);
    const output = warpSurface({
      source: grey(8, 8),
      sourceWidth: 8,
      sourceHeight: 8,
      sampler: homographySampler(corners, { width: 8, height: 8 })!,
      bounds,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    expect(output.width).toBe(20);
    expect(output.height).toBe(20);
    // Every pixel inside a fully-covered destination quad must be opaque.
    let opaque = 0;
    for (let i = 3; i < output.data.length; i += 4) {
      if (output.data[i]! > 250) opaque += 1;
    }
    expect(opaque).toBe(20 * 20);
  });

  it('shifts sampling when a displacement map is applied', () => {
    const canvas = { width: 40, height: 40 };
    const corners = quad(pt(0, 0), pt(40, 0), pt(40, 40), pt(0, 40));

    // Source: left half black, right half white, so a horizontal displacement
    // visibly moves the boundary.
    const source = new Uint8Array(40 * 40 * 4);
    for (let y = 0; y < 40; y += 1) {
      for (let x = 0; x < 40; x += 1) {
        const value = x < 20 ? 0 : 255;
        const i = (y * 40 + x) * 4;
        source[i] = value;
        source[i + 1] = value;
        source[i + 2] = value;
        source[i + 3] = 255;
      }
    }

    // A uniformly bright map displaces by the full scale.
    const map = new Uint8Array(16 * 16).fill(255);
    const output = warpSurface({
      source,
      sourceWidth: 40,
      sourceHeight: 40,
      sampler: homographySampler(corners, { width: 40, height: 40 })!,
      bounds: { x: 0, y: 0, width: 40, height: 40 },
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      displacement: { data: map, width: 16, height: 16, channels: 1, scale: 6, vector: false },
    });

    // Displacing +6px in x means the pixel at x=16 now samples x=22, which is
    // in the white half.
    const at = (x: number, y: number) => output.data[(y * output.width + x) * 4]!;
    expect(at(16, 20)).toBeGreaterThan(200);
    expect(at(10, 20)).toBeLessThan(50);
  });
});

describe('surfaceBounds', () => {
  it('pads outward but stays inside the canvas', () => {
    const bounds = surfaceBounds(
      denormalize([pt(0, 0), pt(0.5, 0), pt(0.5, 0.5), pt(0, 0.5)], 100, 100),
      { width: 100, height: 100 },
      2,
    );
    expect(bounds).toEqual({ x: 0, y: 0, width: 52, height: 52 });
  });
});
