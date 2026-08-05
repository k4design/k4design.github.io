import type { BlendMode } from '@mf/shared';
import type { RawImage } from './assets.js';
import type { WarpOutput } from './warp.js';

/**
 * Layer compositing.
 *
 * The canvas is a straight (non-premultiplied) RGBA buffer that starts as the
 * opaque base photograph, so alpha stays 255 throughout and the maths below
 * only has to blend colour. Warped design layers arrive premultiplied from the
 * warp sampler and are un-premultiplied on the way in.
 */

export class Canvas {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    initial?: RawImage,
  ) {
    this.data = new Uint8Array(width * height * 4);
    if (initial) this.drawBase(initial);
    else this.data.fill(255);
  }

  private drawBase(image: RawImage): void {
    if (image.width !== this.width || image.height !== this.height) {
      throw new Error(
        `base layer is ${image.width}x${image.height}, expected ${this.width}x${this.height}`,
      );
    }
    if (image.channels === 4) {
      this.data.set(image.data.subarray(0, this.data.length));
      // The base photograph is opaque by definition; force it so a stray alpha
      // channel in the source PNG cannot punch holes in the render.
      for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;
      return;
    }
    for (let pixel = 0; pixel < this.width * this.height; pixel += 1) {
      const value = image.data[pixel * image.channels]!;
      const target = pixel * 4;
      this.data[target] = value;
      this.data[target + 1] = value;
      this.data[target + 2] = value;
      this.data[target + 3] = 255;
    }
  }

  /**
   * Recolour a masked region.
   *
   * The region is normalized against the colorize layer's authored default
   * colour and then multiplied by the requested one, so shading and texture are
   * preserved as *ratios* rather than absolute values. That is what lets a white
   * mug go black and a dark cap go white — a plain multiply can only ever
   * darken, and a plain replace throws away the shading entirely.
   */
  colorize(mask: RawImage, from: RGB, to: RGB): void {
    assertSize(mask, this.width, this.height, 'colorize mask');

    // Guard against a default of pure black, which carries no ratio information.
    const ratio: [number, number, number] = [
      to.r / Math.max(8, from.r),
      to.g / Math.max(8, from.g),
      to.b / Math.max(8, from.b),
    ];

    const pixels = this.width * this.height;
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      const coverage = mask.data[pixel * mask.channels]!;
      if (coverage === 0) continue;
      const alpha = coverage / 255;
      const target = pixel * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = this.data[target + channel]!;
        const tinted = clamp255(base * ratio[channel]!);
        this.data[target + channel] = clamp255(base + (tinted - base) * alpha);
      }
    }
  }

  /**
   * Composite a warped design layer.
   *
   * Order matters: the mask clips the layer to the visible surface, then
   * lighting darkens and brightens the *artwork only*, and only then is the
   * result blended onto the base. Lighting the base as well would double-apply
   * the shading already present in the photograph.
   */
  drawSurface(
    layer: WarpOutput,
    options: {
      mask?: RawImage;
      multiply?: RawImage;
      multiplyOpacity?: number;
      screen?: RawImage;
      screenOpacity?: number;
      opacity?: number;
      blend?: BlendMode;
    } = {},
  ): void {
    const opacity = options.opacity ?? 1;
    const blend = options.blend ?? 'normal';
    if (opacity <= 0) return;

    for (let row = 0; row < layer.height; row += 1) {
      const canvasY = layer.y + row;
      if (canvasY < 0 || canvasY >= this.height) continue;

      for (let col = 0; col < layer.width; col += 1) {
        const canvasX = layer.x + col;
        if (canvasX < 0 || canvasX >= this.width) continue;

        const source = (row * layer.width + col) * 4;
        let alpha = layer.data[source + 3]! / 255;
        if (alpha <= 0) continue;

        // Warped layers are premultiplied; recover straight colour.
        let r = layer.data[source]! / alpha;
        let g = layer.data[source + 1]! / alpha;
        let b = layer.data[source + 2]! / alpha;

        const canvasIndex = (canvasY * this.width + canvasX) * 4;

        if (options.mask) {
          alpha *= options.mask.data[(canvasY * this.width + canvasX) * options.mask.channels]! / 255;
          if (alpha <= 0) continue;
        }

        if (options.multiply) {
          const shade =
            options.multiply.data[(canvasY * this.width + canvasX) * options.multiply.channels]! / 255;
          const amount = options.multiplyOpacity ?? 1;
          const factor = 1 - (1 - shade) * amount;
          r *= factor;
          g *= factor;
          b *= factor;
        }

        if (options.screen) {
          const light =
            options.screen.data[(canvasY * this.width + canvasX) * options.screen.channels]! / 255;
          const amount = (options.screenOpacity ?? 1) * light;
          if (amount > 0) {
            r = r + (255 - r) * amount;
            g = g + (255 - g) * amount;
            b = b + (255 - b) * amount;
          }
        }

        const effective = alpha * opacity;
        const baseR = this.data[canvasIndex]!;
        const baseG = this.data[canvasIndex + 1]!;
        const baseB = this.data[canvasIndex + 2]!;

        this.data[canvasIndex] = clamp255(mix(baseR, blendChannel(blend, baseR, r), effective));
        this.data[canvasIndex + 1] = clamp255(mix(baseG, blendChannel(blend, baseG, g), effective));
        this.data[canvasIndex + 2] = clamp255(mix(baseB, blendChannel(blend, baseB, b), effective));
      }
    }
  }

  /** Composite a full-canvas overlay (shadows, highlights, glass, grain). */
  drawOverlay(image: RawImage, blend: BlendMode, opacity: number): void {
    assertSize(image, this.width, this.height, 'overlay layer');
    if (opacity <= 0) return;

    const pixels = this.width * this.height;
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      const source = pixel * image.channels;
      const alpha = image.channels === 4 ? image.data[source + 3]! / 255 : 1;
      if (alpha <= 0) continue;

      const effective = alpha * opacity;
      const target = pixel * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const overlayValue =
          image.channels === 1 ? image.data[source]! : image.data[source + channel]!;
        const base = this.data[target + channel]!;
        this.data[target + channel] = clamp255(
          mix(base, blendChannel(blend, base, overlayValue), effective),
        );
      }
    }
  }

  toBuffer(): Buffer {
    return Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
  }
}

/** Per-channel blend maths on 0..255 values. */
function blendChannel(mode: BlendMode, base: number, top: number): number {
  switch (mode) {
    case 'multiply':
      return (base * top) / 255;
    case 'screen':
      return 255 - ((255 - base) * (255 - top)) / 255;
    case 'overlay':
      return base < 128
        ? (2 * base * top) / 255
        : 255 - (2 * (255 - base) * (255 - top)) / 255;
    case 'soft-light': {
      const b = base / 255;
      const t = top / 255;
      const result =
        t <= 0.5 ? b - (1 - 2 * t) * b * (1 - b) : b + (2 * t - 1) * (dodge(b) - b);
      return result * 255;
    }
    case 'normal':
    default:
      return top;
  }
}

function dodge(b: number): number {
  return b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function assertSize(image: RawImage, width: number, height: number, what: string): void {
  if (image.width !== width || image.height !== height) {
    throw new Error(`${what} is ${image.width}x${image.height}, expected ${width}x${height}`);
  }
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb255(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}
