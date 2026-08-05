import sharp from 'sharp';
import { catalog } from '../catalog/store.js';

/**
 * Decoded item assets, cached at the resolution they are used at.
 *
 * Rendering the same popular mockup repeatedly is the common case, and decoding
 * a 3000px PNG is the single most expensive step after the warp itself. The
 * cache is keyed by item, file and target size, and bounded by total bytes
 * rather than entry count, since a mask and a base photo differ hugely in cost.
 */

export interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

const MAX_CACHE_BYTES = 512 * 1024 * 1024;

class AssetCache {
  private entries = new Map<string, RawImage>();
  private bytes = 0;

  get(key: string): RawImage | undefined {
    const found = this.entries.get(key);
    if (found) {
      // Re-insert so iteration order is least-recently-used first.
      this.entries.delete(key);
      this.entries.set(key, found);
    }
    return found;
  }

  set(key: string, value: RawImage): void {
    this.entries.set(key, value);
    this.bytes += value.data.byteLength;
    while (this.bytes > MAX_CACHE_BYTES) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      const evicted = this.entries.get(oldest.value);
      this.entries.delete(oldest.value);
      this.bytes -= evicted?.data.byteLength ?? 0;
    }
  }

  clear(): void {
    this.entries.clear();
    this.bytes = 0;
  }

  get stats(): { entries: number; bytes: number } {
    return { entries: this.entries.size, bytes: this.bytes };
  }
}

const cache = new AssetCache();

export function clearAssetCache(): void {
  cache.clear();
}

export function assetCacheStats(): { entries: number; bytes: number } {
  return cache.stats;
}

/** RGBA at exactly `width` x `height`. */
export async function loadRgba(
  itemId: string,
  src: string,
  width: number,
  height: number,
): Promise<RawImage> {
  const key = `rgba:${itemId}:${src}:${width}x${height}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { data, info } = await sharp(catalog.assetPath(itemId, src))
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const image: RawImage = { data, width: info.width, height: info.height, channels: 4 };
  cache.set(key, image);
  return image;
}

/**
 * Single-channel grayscale at exactly `width` x `height`. Masks and lighting
 * maps are authored as grayscale; forcing one channel keeps the compositor's
 * inner loops branch-free.
 */
export async function loadGray(
  itemId: string,
  src: string,
  width: number,
  height: number,
): Promise<RawImage> {
  const key = `gray:${itemId}:${src}:${width}x${height}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { data, info } = await sharp(catalog.assetPath(itemId, src))
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const image: RawImage = { data, width: info.width, height: info.height, channels: 1 };
  cache.set(key, image);
  return image;
}

/**
 * Displacement maps are loaded at their authored resolution: they are sampled
 * in normalized space, and resizing them would only blur detail the renderer is
 * about to sample anyway.
 */
export async function loadDisplacement(itemId: string, src: string): Promise<RawImage> {
  const key = `disp:${itemId}:${src}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { data, info } = await sharp(catalog.assetPath(itemId, src))
    .removeAlpha()
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const image: RawImage = { data, width: info.width, height: info.height, channels: info.channels };
  cache.set(key, image);
  return image;
}

/**
 * Decode an uploaded design to premultiplied RGBA.
 *
 * Premultiplied is required by the warp sampler: interpolating straight RGBA
 * pulls the colour of fully transparent pixels into soft edges, which shows up
 * as a dark or white halo around anti-aliased artwork.
 */
export async function decodeDesign(
  png: Buffer,
  limits: { maxPixels: number },
): Promise<RawImage & { premultiplied: true }> {
  const image = sharp(png, { limitInputPixels: limits.maxPixels, failOn: 'error' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('The uploaded design is not a readable image.');
  }

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // sharp exposes no premultiply step, so do it here. Skipped entirely for
  // fully opaque artwork, which is the common case.
  const pixels = info.width * info.height;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const index = pixel * 4;
    const alpha = data[index + 3]!;
    if (alpha === 255) continue;
    if (alpha === 0) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      continue;
    }
    const factor = alpha / 255;
    data[index] = Math.round(data[index]! * factor);
    data[index + 1] = Math.round(data[index + 1]! * factor);
    data[index + 2] = Math.round(data[index + 2]! * factor);
  }

  return {
    data,
    width: info.width,
    height: info.height,
    channels: 4,
    premultiplied: true,
  };
}
