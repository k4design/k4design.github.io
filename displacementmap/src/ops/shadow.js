import { percentileValue } from "./percentile.js";

/**
 * Multiply map for Mockup Forge's `lighting.multiply`.
 *
 * The renderer does (apps/api/src/render/compositor.ts:131-139):
 *
 *   factor = 1 - (1 - shade) * multiplyOpacity;  rgb *= factor
 *
 * so **white is neutral and black is fully dark**, and it is applied to the
 * warped artwork only — never to the base photograph, which already contains
 * its own shading.
 *
 * This replaces what the catalog ships today: `apps/api/src/seed/raster.ts`
 * generates shadow maps as a 4-stop SVG linear gradient across the surface
 * polygon, carrying no information from the photograph at all. Here the same
 * map is built from two real signals:
 *
 *   - `low`, the broad lighting the high pass strips out of the height field —
 *     the actual falloff across the garment or panel
 *   - `ao`, fold-level crevice occlusion from the height field
 *
 * Values outside the surface don't matter: `drawSurface` applies the alpha mask
 * first and skips zero-alpha pixels, so lighting is never sampled off-surface.
 */

/**
 * @param {Float32Array} low low-frequency linear luminance (the blurred component)
 * @param {Float32Array} ao occlusion in [0,1], 1 = fully lit
 * @param {object} [opts]
 * @param {number} [opts.gamma=1] >1 deepens the broad shading, <1 flattens it
 * @param {number} [opts.strength=1] 0 = neutral white, 1 = full effect
 * @returns {Float32Array} multiply map in [0,1], 1 = neutral
 */
export function shadowMap(low, ao, opts = {}) {
  const gamma = opts.gamma ?? 1;
  const strength = opts.strength ?? 1;

  // Normalize against the bright end rather than max: the brightest lit part of
  // the surface becomes multiply-neutral, and everything else darkens relative
  // to it. Using the raw max would let one specular pixel wash the map out.
  const peak = percentileValue(low, 0.99);
  const inv = peak > 1e-6 ? 1 / peak : 0;

  const out = new Float32Array(low.length);
  for (let i = 0; i < low.length; i++) {
    const lit = clampShade(low[i] * inv);
    const shaded = (gamma === 1 ? lit : Math.pow(lit, gamma)) * ao[i];
    // Blend toward neutral white by `strength`.
    out[i] = clampShade(1 - (1 - shaded) * strength);
  }
  return out;
}

function clampShade(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
