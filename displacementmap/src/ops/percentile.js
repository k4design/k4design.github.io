/**
 * Histogram-based percentiles.
 *
 * Every map here needs "the value N% of pixels fall below" to set gains without
 * a single blown-out specular pixel dictating the whole range. One
 * implementation, three callers (levels, shadow/highlight thresholds, and the
 * displacement gain).
 */

const BINS = 4096;

function histogram(read, count, min, max) {
  const hist = new Uint32Array(BINS);
  const scale = (BINS - 1) / (max - min);
  for (let i = 0; i < count; i++) {
    hist[((read(i) - min) * scale) | 0]++;
  }
  return { hist, scale };
}

function boundsOf(read, count) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = read(i);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/**
 * Value below which `fraction` of the data falls.
 * @param {Float32Array} data
 * @param {number} fraction 0..1
 */
export function percentileValue(data, fraction) {
  const read = (i) => data[i];
  const { min, max } = boundsOf(read, data.length);
  if (!(max > min)) return min;
  const { hist, scale } = histogram(read, data.length, min, max);

  const target = Math.max(1, Math.floor(data.length * fraction));
  let acc = 0;
  for (let b = 0; b < BINS; b++) {
    acc += hist[b];
    if (acc >= target) return min + b / scale;
  }
  return max;
}

/**
 * Clipped [low, high] range: discards `clip` of the data from each tail.
 * @returns {[number, number, number, number]} [lo, hi, min, max]
 */
export function percentileRange(data, clip) {
  const read = (i) => data[i];
  const { min, max } = boundsOf(read, data.length);
  if (!(max > min)) return [min, max, min, max];
  const { hist, scale } = histogram(read, data.length, min, max);

  const target = Math.max(1, Math.floor(data.length * clip));
  let acc = 0;
  let loBin = 0;
  for (let b = 0; b < BINS; b++) {
    acc += hist[b];
    if (acc >= target) { loBin = b; break; }
  }
  acc = 0;
  let hiBin = BINS - 1;
  for (let b = BINS - 1; b >= 0; b--) {
    acc += hist[b];
    if (acc >= target) { hiBin = b; break; }
  }
  return [min + loBin / scale, min + hiBin / scale, min, max];
}

/**
 * Percentile of the vector magnitude hypot(ax[i], ay[i]). Used to set a single
 * gain for both displacement axes, so the encoded field keeps its direction —
 * scaling X and Y independently would rotate every offset.
 */
export function percentileMagnitude(ax, ay, fraction) {
  const read = (i) => Math.hypot(ax[i], ay[i]);
  const { min, max } = boundsOf(read, ax.length);
  if (!(max > min)) return max;
  const { hist, scale } = histogram(read, ax.length, min, max);

  const target = Math.max(1, Math.floor(ax.length * fraction));
  let acc = 0;
  for (let b = 0; b < BINS; b++) {
    acc += hist[b];
    if (acc >= target) return min + b / scale;
  }
  return max;
}
