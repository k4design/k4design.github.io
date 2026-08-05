/**
 * Percentile-clipped contrast normalization.
 *
 * Plain min/max stretching is hostage to a single blown-out specular pixel, so
 * clip the tails first (default 0.5% each end) and rescale what's left.
 */

import { percentileRange } from "./percentile.js";

/**
 * @param {Float32Array} data
 * @param {object} [opts]
 * @param {number} [opts.clip=0.005] fraction discarded from each tail
 * @param {boolean} [opts.symmetric=false] rescale symmetrically about 0.5,
 *   preserving 0.5 as exact neutral. Required for high-passed height fields —
 *   the sidecar promises the Figma plugin that 128 means "no displacement", and
 *   an asymmetric stretch would quietly break that.
 * @returns {Float32Array} values in [0,1]
 */
export function normalize(data, opts = {}) {
  const clip = opts.clip ?? 0.005;
  const symmetric = opts.symmetric ?? false;
  const n = data.length;
  const out = new Float32Array(n);

  const [lo, hi, min, max] = percentileRange(data, clip);
  if (!(max > min)) {
    out.fill(symmetric ? 0.5 : 0);
    return out;
  }
  if (!(hi > lo)) {
    out.fill(symmetric ? 0.5 : 0);
    return out;
  }

  if (symmetric) {
    // Largest deviation from neutral in either direction sets a single gain, so
    // 0.5 stays put.
    const spread = Math.max(0.5 - lo, hi - 0.5);
    const gain = spread > 1e-6 ? 0.5 / spread : 0;
    for (let i = 0; i < n; i++) {
      out[i] = clamp01(0.5 + (data[i] - 0.5) * gain);
    }
  } else {
    const gain = 1 / (hi - lo);
    for (let i = 0; i < n; i++) {
      out[i] = clamp01((data[i] - lo) * gain);
    }
  }
  return out;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
