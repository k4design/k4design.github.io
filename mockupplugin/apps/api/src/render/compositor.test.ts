import { describe, expect, it } from 'vitest';
import { Canvas, hexToRgb255 } from './compositor.js';
import type { RawImage } from './assets.js';
import type { WarpOutput } from './warp.js';

function solidBase(width: number, height: number, r: number, g: number, b: number): RawImage {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, channels: 4 };
}

function grayMask(width: number, height: number, value: number): RawImage {
  return { data: new Uint8Array(width * height).fill(value), width, height, channels: 1 };
}

/** A fully opaque, premultiplied single-colour layer. */
function layer(width: number, height: number, r: number, g: number, b: number): WarpOutput {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, x: 0, y: 0 };
}

const pixel = (canvas: Canvas, x: number, y: number): number[] => {
  const index = (y * canvas.width + x) * 4;
  return [
    canvas.data[index]!,
    canvas.data[index + 1]!,
    canvas.data[index + 2]!,
    canvas.data[index + 3]!,
  ];
};

describe('Canvas base', () => {
  it('forces the base layer opaque so a stray alpha cannot punch holes', () => {
    const base = solidBase(2, 2, 10, 20, 30);
    base.data[3] = 0;
    const canvas = new Canvas(2, 2, base);
    expect(pixel(canvas, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it('rejects a base layer of the wrong size rather than rendering garbage', () => {
    expect(() => new Canvas(4, 4, solidBase(2, 2, 0, 0, 0))).toThrow(/expected 4x4/);
  });
});

describe('Canvas.colorize', () => {
  it('leaves the region untouched when the requested colour is the default', () => {
    const canvas = new Canvas(2, 2, solidBase(2, 2, 200, 200, 200));
    canvas.colorize(grayMask(2, 2, 255), hexToRgb255('#ffffff'), hexToRgb255('#ffffff'));
    expect(pixel(canvas, 0, 0)).toEqual([200, 200, 200, 255]);
  });

  it('recolours by ratio against the default, so shading survives', () => {
    // Base is 80% of the authored white default, i.e. a shaded part of a white
    // product. Recolouring to mid-red must keep that 80% relationship.
    const canvas = new Canvas(1, 1, solidBase(1, 1, 204, 204, 204));
    canvas.colorize(grayMask(1, 1, 255), hexToRgb255('#ffffff'), hexToRgb255('#cc0000'));
    const [r, g, b] = pixel(canvas, 0, 0);
    expect(r).toBe(Math.round(204 * (204 / 255)));
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('can lighten a dark default, which a plain multiply cannot', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 47, 58, 68));
    canvas.colorize(grayMask(1, 1, 255), hexToRgb255('#2f3a44'), hexToRgb255('#ffffff'));
    const [r, g, b] = pixel(canvas, 0, 0);
    // 47/47, 58/58, 68/68 all scale to full white.
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('blends proportionally to mask coverage', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 255, 255, 255));
    canvas.colorize(grayMask(1, 1, 128), hexToRgb255('#ffffff'), hexToRgb255('#000000'));
    const [r] = pixel(canvas, 0, 0);
    // Half coverage of a full black tint lands near mid-grey.
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(140);
  });

  it('ignores pixels the mask excludes entirely', () => {
    const mask = grayMask(2, 1, 0);
    mask.data[0] = 255;
    const canvas = new Canvas(2, 1, solidBase(2, 1, 255, 255, 255));
    canvas.colorize(mask, hexToRgb255('#ffffff'), hexToRgb255('#ff0000'));
    expect(pixel(canvas, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(canvas, 1, 0)).toEqual([255, 255, 255, 255]);
  });
});

describe('Canvas.drawSurface', () => {
  it('replaces the base where the layer is opaque', () => {
    const canvas = new Canvas(2, 2, solidBase(2, 2, 0, 0, 0));
    canvas.drawSurface(layer(2, 2, 200, 100, 50));
    expect(pixel(canvas, 0, 0)).toEqual([200, 100, 50, 255]);
  });

  it('clips to the surface mask', () => {
    const mask = grayMask(2, 1, 0);
    mask.data[0] = 255;
    const canvas = new Canvas(2, 1, solidBase(2, 1, 0, 0, 0));
    canvas.drawSurface(layer(2, 1, 255, 255, 255), { mask });
    expect(pixel(canvas, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(pixel(canvas, 1, 0)).toEqual([0, 0, 0, 255]);
  });

  it('darkens the artwork by the shadow map without touching the base elsewhere', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawSurface(layer(1, 1, 200, 200, 200), {
      multiply: grayMask(1, 1, 128),
      multiplyOpacity: 1,
    });
    const [r] = pixel(canvas, 0, 0);
    // A mid-grey multiply map roughly halves the artwork.
    expect(r).toBeGreaterThan(95);
    expect(r).toBeLessThan(105);
  });

  it('lifts the artwork by the highlight map', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawSurface(layer(1, 1, 100, 100, 100), {
      screen: grayMask(1, 1, 255),
      screenOpacity: 1,
    });
    expect(pixel(canvas, 0, 0)[0]).toBe(255);
  });

  it('a white multiply map and a black screen map are both no-ops', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawSurface(layer(1, 1, 123, 45, 67), {
      multiply: grayMask(1, 1, 255),
      screen: grayMask(1, 1, 0),
    });
    expect(pixel(canvas, 0, 0)).toEqual([123, 45, 67, 255]);
  });

  it('respects layer opacity', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawSurface(layer(1, 1, 200, 200, 200), { opacity: 0.5 });
    expect(pixel(canvas, 0, 0)[0]).toBe(100);
  });

  it('un-premultiplies so a semi-transparent layer keeps its true colour', () => {
    // Premultiplied half-alpha white is (128,128,128,128); composited over
    // black at 50% it must land on mid-grey, not quarter-grey.
    const data = new Uint8Array([128, 128, 128, 128]);
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawSurface({ data, width: 1, height: 1, x: 0, y: 0 });
    const [r] = pixel(canvas, 0, 0);
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(136);
  });

  it('ignores a layer positioned entirely off-canvas', () => {
    const canvas = new Canvas(2, 2, solidBase(2, 2, 5, 5, 5));
    canvas.drawSurface({ ...layer(2, 2, 255, 0, 0), x: 50, y: 50 });
    expect(pixel(canvas, 0, 0)).toEqual([5, 5, 5, 255]);
  });
});

describe('Canvas.drawOverlay', () => {
  it('multiplies', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 200, 200, 200));
    canvas.drawOverlay(solidBase(1, 1, 128, 128, 128), 'multiply', 1);
    expect(pixel(canvas, 0, 0)[0]).toBe(Math.round((200 * 128) / 255));
  });

  it('screens', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 100, 100, 100));
    canvas.drawOverlay(solidBase(1, 1, 255, 255, 255), 'screen', 1);
    expect(pixel(canvas, 0, 0)[0]).toBe(255);
  });

  it('treats a transparent overlay pixel as a no-op', () => {
    const overlay = solidBase(1, 1, 255, 0, 0);
    overlay.data[3] = 0;
    const canvas = new Canvas(1, 1, solidBase(1, 1, 10, 20, 30));
    canvas.drawOverlay(overlay, 'normal', 1);
    expect(pixel(canvas, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it('scales its effect by opacity', () => {
    const canvas = new Canvas(1, 1, solidBase(1, 1, 0, 0, 0));
    canvas.drawOverlay(solidBase(1, 1, 200, 200, 200), 'normal', 0.25);
    expect(pixel(canvas, 0, 0)[0]).toBe(50);
  });
});

describe('hexToRgb255', () => {
  it('parses with and without the hash', () => {
    expect(hexToRgb255('#0a141e')).toEqual({ r: 10, g: 20, b: 30 });
    expect(hexToRgb255('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});
