import { percentileValue } from "./percentile.js";

/**
 * Screen map for Mockup Forge's `lighting.screen`.
 *
 * The renderer does (apps/api/src/render/compositor.ts:141-150):
 *
 *   amount = screenOpacity * light;  rgb += (255 - rgb) * amount
 *
 * so **black is neutral and white is fully blown**. The map must therefore be
 * black almost everywhere — only genuine speculars should be lit. This is the
 * opposite polarity to the shadow map and easy to get backwards.
 *
 * Like the shadow map, this replaces a synthetic one: the catalog currently uses
 * a single blurred diagonal "sweep" bar from `raster.ts:110-138`, positioned by
 * a hand-set `sweep` constant rather than by where light actually hits.
 */

/**
 * @param {Float32Array} luma linear luminance in [0,1]
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.92] percentile above which a pixel counts as specular
 * @param {number} [opts.strength=1] peak brightness of the map
 * @returns {Float32Array} screen map in [0,1], 0 = neutral
 */
export function highlightMap(luma, opts = {}) {
  const threshold = opts.threshold ?? 0.92;
  const strength = opts.strength ?? 1;

  const t = percentileValue(luma, threshold);
  const span = 1 - t;
  const out = new Float32Array(luma.length);
  // Everything at or below the threshold stays black; a surface with no
  // headroom above it produces an entirely neutral map rather than a divide by
  // zero.
  if (span <= 1e-6 || strength <= 0) return out;

  for (let i = 0; i < luma.length; i++) {
    const v = (luma[i] - t) / span;
    out[i] = v <= 0 ? 0 : (v > 1 ? 1 : v) * strength;
  }
  return out;
}
