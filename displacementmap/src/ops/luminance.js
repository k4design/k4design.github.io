/**
 * sRGB -> linear -> relative luminance.
 *
 * Linearizing before weighting matters: computed in gamma space, dark albedo
 * reads as much deeper geometry than it is, and every downstream map inherits
 * the error.
 */

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * @param {Uint8Array} pixels chunky (interleaved) 8-bit samples
 * @param {number} count number of pixels
 * @param {number} components samples per pixel (3 = RGB, 4 = RGBA)
 * @returns {Float32Array} linear luminance in [0,1], one entry per pixel
 */
export function luminance(pixels, count, components) {
  const out = new Float32Array(count);
  for (let i = 0, p = 0; i < count; i++, p += components) {
    out[i] =
      0.2126 * SRGB_TO_LINEAR[pixels[p]] +
      0.7152 * SRGB_TO_LINEAR[pixels[p + 1]] +
      0.0722 * SRGB_TO_LINEAR[pixels[p + 2]];
  }
  return out;
}
