import { blur } from "./blur.js";

/**
 * Cheap crevice-occlusion approximation:
 *
 *   ao = 1 - clamp((blur(height, radius) - height) * strength)
 *
 * Where a pixel sits below its local neighbourhood average it's in a valley, so
 * it gets darkened. Not a real ray-traced AO, but for fabric folds and paper
 * creases the visual result is right and it costs one extra blur.
 *
 * @param {Float32Array} height normalized height in [0,1]
 * @param {number} width
 * @param {number} imgHeight
 * @param {number} radius blur radius; <= 0 means "no AO", caller should skip
 * @param {number} strength occlusion gain
 * @returns {Float32Array} occlusion in [0,1]; 1 = fully lit
 */
export function aoMap(height, width, imgHeight, radius, strength) {
  const avg = blur(height, width, imgHeight, radius);
  const out = new Float32Array(height.length);
  for (let i = 0; i < height.length; i++) {
    const occ = (avg[i] - height[i]) * strength;
    out[i] = 1 - (occ < 0 ? 0 : occ > 1 ? 1 : occ);
  }
  return out;
}
