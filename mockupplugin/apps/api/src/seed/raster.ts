import sharp from 'sharp';
import { boundingBox, svgPoints, type Point } from '@mf/shared';

/**
 * Rasterizing helpers for the seed catalog.
 *
 * The seed photography is synthetic on purpose: what matters is that every code
 * path in the renderer is exercised by real files with real alpha, masks,
 * lighting maps and displacement maps. SVG covers the product shapes and
 * gradients; procedural noise covers wrinkle detail, which SVG filters cannot
 * express portably.
 */

export interface Size {
  width: number;
  height: number;
}

export function svg(size: Size, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">${
    defs ? `<defs>${defs}</defs>` : ''
  }${body}</svg>`;
}

export async function svgToPng(markup: string): Promise<Buffer> {
  return sharp(Buffer.from(markup)).png({ compressionLevel: 9 }).toBuffer();
}

/** Flatten an SVG onto opaque white — for base photography, which has no alpha. */
export async function svgToOpaquePng(markup: string, background = '#ffffff'): Promise<Buffer> {
  return sharp(Buffer.from(markup)).flatten({ background }).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * An 8-bit alpha mask: white where the surface is visible, black elsewhere.
 * `feather` softens the edge so warped artwork does not end in a hard jaggy
 * line against the product.
 */
export function polygonMaskSvg(
  size: Size,
  polygons: Point[][],
  feather = 1.5,
  /** Extra white-on-black markup, for regions a polygon cannot describe (a
   *  stroked handle, a curved seam). Drawn with the polygons, inside the blur. */
  extra = '',
): string {
  const shapes =
    polygons
      .map((points) => `<polygon points="${svgPoints(points)}" fill="#ffffff"/>`)
      .join('') + extra;
  const defs = feather > 0 ? `<filter id="f"><feGaussianBlur stdDeviation="${feather}"/></filter>` : '';
  return svg(
    size,
    `<rect width="${size.width}" height="${size.height}" fill="#000000"/><g${
      feather > 0 ? ' filter="url(#f)"' : ''
    }>${shapes}</g>`,
    defs,
  );
}

/**
 * Lighting maps for a surface region.
 *
 * `multiply` carries the shadow: mid-grey to white, so unlit areas darken the
 * artwork and lit areas leave it alone. `screen` carries the specular
 * highlight: black is neutral, brighter pixels lift the artwork.
 *
 * Both are clipped to the surface polygon, because they are applied to the
 * warped design only — never to the base photo.
 */
export function shadowMapSvg(
  size: Size,
  polygons: Point[][],
  options: { direction?: 'horizontal' | 'vertical' | 'radial'; strength?: number } = {},
): string {
  const strength = options.strength ?? 0.45;
  const dark = Math.round(255 * (1 - strength));
  const dir = options.direction ?? 'horizontal';
  const box = boundingBox(polygons.flat());

  const gradient =
    dir === 'radial'
      ? `<radialGradient id="g" cx="42%" cy="34%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.62" stop-color="rgb(${
          dark + 40
        },${dark + 40},${dark + 40})"/><stop offset="1" stop-color="rgb(${dark},${dark},${dark})"/></radialGradient>`
      : `<linearGradient id="g" x1="${dir === 'horizontal' ? '0' : '0'}" y1="${
          dir === 'horizontal' ? '0' : '0'
        }" x2="${dir === 'horizontal' ? '1' : '0'}" y2="${dir === 'horizontal' ? '0' : '1'}">` +
        `<stop offset="0" stop-color="rgb(${dark},${dark},${dark})"/>` +
        `<stop offset="0.34" stop-color="#ffffff"/>` +
        `<stop offset="0.72" stop-color="#f2f2f2"/>` +
        `<stop offset="1" stop-color="rgb(${dark + 20},${dark + 20},${dark + 20})"/>` +
        `</linearGradient>`;

  const shapes = polygons
    .map((points) => `<polygon points="${svgPoints(points)}" fill="url(#g)"/>`)
    .join('');

  // Outside the polygon the map is white, i.e. multiply-neutral.
  return svg(
    size,
    `<rect width="${size.width}" height="${size.height}" fill="#ffffff"/><g filter="url(#soft)">${shapes}</g>`,
    `${gradient}<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${Math.max(
      2,
      Math.min(box.width, box.height) * 0.02,
    )}"/></filter>`,
  );
}

export function highlightMapSvg(
  size: Size,
  polygons: Point[][],
  options: { strength?: number; sweep?: number } = {},
): string {
  const strength = options.strength ?? 0.3;
  const peak = Math.round(255 * strength);
  const sweep = options.sweep ?? 0.28;
  const box = boundingBox(polygons.flat());
  const shapes = polygons
    .map((points) => `<polygon points="${svgPoints(points)}" fill="url(#g)"/>`)
    .join('');

  return svg(
    size,
    `<rect width="${size.width}" height="${size.height}" fill="#000000"/><g filter="url(#soft)">${shapes}</g>`,
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0.3">` +
      `<stop offset="0" stop-color="#000000"/>` +
      `<stop offset="${(sweep - 0.06).toFixed(2)}" stop-color="#000000"/>` +
      `<stop offset="${sweep.toFixed(2)}" stop-color="rgb(${peak},${peak},${peak})"/>` +
      `<stop offset="${(sweep + 0.08).toFixed(2)}" stop-color="#000000"/>` +
      `<stop offset="1" stop-color="#000000"/>` +
      `</linearGradient>` +
      `<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${Math.max(
        3,
        Math.min(box.width, box.height) * 0.03,
      )}"/></filter>`,
  );
}

/* ------------------------------------------------------------------ */
/* Procedural noise — wrinkle displacement maps                        */
/* ------------------------------------------------------------------ */

/** Deterministic 32-bit hash, so regenerating the catalog is reproducible. */
function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  const top = n00 + (n10 - n00) * fx;
  const bottom = n01 + (n11 - n01) * fx;
  return top + (bottom - top) * fy;
}

export interface WrinkleOptions {
  seed?: number;
  /** Noise cells across the width at the first octave. */
  scale?: number;
  octaves?: number;
  /** 0..1 — how far the map swings from neutral grey. */
  contrast?: number;
  /**
   * Adds directional creases, which is what makes cloth read as cloth rather
   * than as static. Angle is in radians.
   */
  creaseAngle?: number;
  creaseStrength?: number;
  creaseFrequency?: number;
}

/**
 * A grayscale displacement map. 128 is neutral; the renderer reads deviation
 * from mid-grey and offsets its source sample accordingly.
 */
export async function wrinklePng(size: Size, options: WrinkleOptions = {}): Promise<Buffer> {
  const seed = options.seed ?? 1;
  const scale = options.scale ?? 6;
  const octaves = options.octaves ?? 4;
  const contrast = options.contrast ?? 0.55;
  const creaseAngle = options.creaseAngle ?? Math.PI / 5;
  const creaseStrength = options.creaseStrength ?? 0.35;
  const creaseFrequency = options.creaseFrequency ?? 9;

  const { width, height } = size;
  const data = Buffer.allocUnsafe(width * height);
  const cos = Math.cos(creaseAngle);
  const sin = Math.sin(creaseAngle);

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;

      let amplitude = 1;
      let frequency = scale;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o += 1) {
        sum += valueNoise(u * frequency, v * frequency, seed + o * 31) * amplitude;
        norm += amplitude;
        amplitude *= 0.5;
        frequency *= 2.07;
      }
      let value = sum / norm;

      // Creases: a warped sine banding along one axis, jittered by the noise so
      // the folds are irregular rather than corduroy.
      const along = u * cos + v * sin;
      const crease =
        Math.sin((along + value * 0.35) * Math.PI * 2 * creaseFrequency) * 0.5 + 0.5;
      value = value * (1 - creaseStrength) + crease * creaseStrength;

      const signed = (value - 0.5) * 2 * contrast;
      data[y * width + x] = Math.max(0, Math.min(255, Math.round(128 + signed * 127)));
    }
  }

  return sharp(data, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Downscale a finished render into a library thumbnail. */
export async function thumbnail(png: Buffer, width = 480): Promise<Buffer> {
  return sharp(png).resize({ width, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
}
