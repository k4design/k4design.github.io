import { sobel } from "./sobel.js";
import { percentileMagnitude } from "./percentile.js";

/**
 * RG vector displacement map for Mockup Forge's `vector: true` warp.
 *
 * The renderer decodes (apps/api/src/render/warp.ts:501-503):
 *
 *   dx = ((R - 128) / 127) * scale
 *   dy = ((G - 128) / 127) * scale
 *
 * so 128 is neutral on both axes and full deflection means `scale` canvas
 * pixels. B is held at 128 and unused.
 *
 * Direction comes from the height gradient: artwork slides along the slope of a
 * fold rather than in one fixed direction everywhere, which is what the scalar
 * path cannot do (it hardwires dy = dx * 0.72).
 *
 * A single gain is derived from the gradient MAGNITUDE percentile, not per-axis,
 * so encoding preserves direction — independently normalizing X and Y would
 * rotate every offset vector.
 */

/**
 * @param {Float32Array} height normalized height in [0,1]
 * @param {number} width
 * @param {number} imgHeight
 * @param {object} [opts]
 * @param {boolean} [opts.yUp=true] flip the Y axis (see the sign check in the README)
 * @param {number} [opts.clip=0.995] gradient percentile mapped to full deflection
 * @returns {Uint8Array} chunky RGB, 3 components per pixel
 */
export function vectorDisplacement(height, width, imgHeight, opts = {}) {
  const yUp = opts.yUp ?? true;
  const clip = opts.clip ?? 0.995;

  const { gx, gy } = sobel(height, width, imgHeight);
  const peak = percentileMagnitude(gx, gy, clip);
  // A perfectly flat field has no gradient; gain 0 keeps the whole map neutral
  // instead of amplifying float noise into visible garbage.
  const gain = peak > 1e-9 ? 1 / peak : 0;
  const ySign = yUp ? 1 : -1;

  const out = new Uint8Array(width * imgHeight * 3);
  for (let i = 0; i < width * imgHeight; i++) {
    const p = i * 3;
    out[p] = encodeDispAxis(gx[i] * gain);
    out[p + 1] = encodeDispAxis(gy[i] * gain * ySign);
    out[p + 2] = 128;
  }
  return out;
}

/** [-1,1] -> [1,255] centred exactly on 128, matching the renderer's /127. */
function encodeDispAxis(v) {
  const c = v < -1 ? -1 : v > 1 ? 1 : v;
  return 128 + Math.round(c * 127);
}
