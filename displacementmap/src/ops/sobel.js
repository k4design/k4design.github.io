/**
 * Sobel gradient of a height field, with clamp-to-edge sampling.
 *
 * Extracted so the normal map and the vector displacement map derive from
 * literally the same numbers — two independent Sobel implementations would drift
 * apart silently and only show up as a mismatch in a rendered mockup.
 *
 * `gy` is measured DOWNWARD in image space (rows increase downward). Consumers
 * that want a +Y-up convention negate it themselves.
 */

/**
 * @param {Float32Array} height normalized height, one entry per pixel
 * @param {number} width
 * @param {number} imgHeight
 * @returns {{gx: Float32Array, gy: Float32Array}} kernel-normalized gradients
 */
export function sobel(height, width, imgHeight) {
  const h = imgHeight;
  const gx = new Float32Array(width * h);
  const gy = new Float32Array(width * h);

  for (let y = 0; y < h; y++) {
    const y0 = (y > 0 ? y - 1 : 0) * width;
    const y1 = y * width;
    const y2 = (y < h - 1 ? y + 1 : h - 1) * width;

    for (let x = 0; x < width; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x2 = x < width - 1 ? x + 1 : width - 1;

      const tl = height[y0 + x0], tc = height[y0 + x], tr = height[y0 + x2];
      const ml = height[y1 + x0],                       mr = height[y1 + x2];
      const bl = height[y2 + x0], bc = height[y2 + x], br = height[y2 + x2];

      const i = y1 + x;
      // /8 normalizes the kernel weight.
      gx[i] = ((tr + 2 * mr + br) - (tl + 2 * ml + bl)) / 8;
      gy[i] = ((bl + 2 * bc + br) - (tl + 2 * tc + tr)) / 8;
    }
  }
  return { gx, gy };
}
