/**
 * Separable box blur, three passes — a good gaussian approximation that runs in
 * O(n) per pass regardless of radius (running-sum sliding window).
 *
 * Three box passes of width w = 2r+1 give variance 3*(w^2-1)/12 = ((2r+1)^2-1)/4,
 * i.e. an effective sigma of sqrt((2r+1)^2-1)/2 which is within a few percent of
 * r for any useful radius. So callers can treat `radius` as a gaussian sigma.
 *
 * This is the shared blur for high-pass, final smoothing, and AO. Don't add a
 * second one.
 */

const PASSES = 3;

/**
 * @param {Float32Array} src
 * @param {number} width
 * @param {number} height
 * @param {number} radius  box radius in pixels; <= 0 returns a copy
 * @returns {Float32Array} new blurred buffer (src is never mutated)
 */
export function blur(src, width, height, radius) {
  const r = Math.round(radius);
  if (r < 1) return Float32Array.from(src);

  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);

  for (let pass = 0; pass < PASSES; pass++) {
    boxH(a, b, width, height, r);
    boxV(b, a, width, height, r);
  }
  return a;
}

// Horizontal pass with clamp-to-edge sampling.
function boxH(src, dst, width, height, r) {
  const norm = 1 / (2 * r + 1);
  const last = width - 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    // Window at x=0 is [-r..r]: r clamped copies of src[0], plus src[0], plus src[1..r].
    let sum = src[row] * (r + 1);
    for (let x = 1; x <= r; x++) sum += src[row + (x > last ? last : x)];

    for (let x = 0; x < width; x++) {
      dst[row + x] = sum * norm;
      const addIdx = x + r + 1;
      const subIdx = x - r;
      sum += src[row + (addIdx > last ? last : addIdx)];
      sum -= src[row + (subIdx < 0 ? 0 : subIdx)];
    }
  }
}

// Vertical pass, same logic with a stride of `width`.
function boxV(src, dst, width, height, r) {
  const norm = 1 / (2 * r + 1);
  const last = height - 1;
  for (let x = 0; x < width; x++) {
    let sum = src[x] * (r + 1);
    for (let y = 1; y <= r; y++) sum += src[(y > last ? last : y) * width + x];

    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum * norm;
      const addIdx = y + r + 1;
      const subIdx = y - r;
      sum += src[(addIdx > last ? last : addIdx) * width + x];
      sum -= src[(subIdx < 0 ? 0 : subIdx) * width + x];
    }
  }
}
