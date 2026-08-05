import { blur } from "./blur.js";

/**
 * Subtract the low-frequency component: removes broad lighting falloff and
 * vignetting, which otherwise read as huge phantom bulges in the height field.
 * Measured effect at the 2048 reference edge with radius 128: a full-width
 * cosine lighting gradient drops 22x, while fold-scale (384px) detail is
 * preserved at ~0.93 and the weave passes untouched. See presets.js for the full
 * frequency-response table.
 *
 * IMPORTANT — what this does NOT do: it cannot remove printed artwork. This is a
 * low-pass subtraction, so anything *smaller* or sharper than the cutoff (which
 * is any realistic logo) survives and gets baked in as fake geometry. There is
 * no radius that removes a print without also erasing the folds, since they
 * occupy overlapping spatial scales. Bake from BLANK mockup photos.
 * `test/ops.test.mjs` asserts this limitation so it can't be quietly forgotten.
 *
 * With radius 0 the input passes through untouched, which is what you want on a
 * device screen where the low-frequency signal IS the curvature you're after.
 *
 * @param {Float32Array} luma linear luminance in [0,1]
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @returns {Float32Array} height field centered on 0.5
 */
export function highPass(luma, width, height, radius) {
  return highPassWithLow(luma, width, height, radius).height;
}

/**
 * The same computation, also returning the low-frequency component it subtracts.
 *
 * That discarded buffer is not waste — it IS the real lighting across the
 * surface, and `ops/shadow.js` needs exactly it. Returning it here avoids
 * running the (expensive, large-radius) blur a second time, and guarantees the
 * shadow map is built from precisely what the height field had removed.
 *
 * With radius 0 there is nothing to separate, so the luminance is its own low
 * component: for a device screen the broad shading is the whole signal.
 *
 * @returns {{height: Float32Array, low: Float32Array}}
 */
export function highPassWithLow(luma, width, height, radius) {
  if (Math.round(radius) < 1) {
    return { height: Float32Array.from(luma), low: Float32Array.from(luma) };
  }

  const low = blur(luma, width, height, radius);
  const out = new Float32Array(luma.length);
  for (let i = 0; i < luma.length; i++) {
    out[i] = luma[i] - low[i] + 0.5;
  }
  return { height: out, low };
}
