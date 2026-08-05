import { sobel } from "./sobel.js";

/**
 * Sobel gradient of the height field -> tangent-space normal map.
 *
 * n = normalize(-dx * strength, -dy * strength, 1), encoded as (n*0.5+0.5)*255.
 * A flat region therefore lands on (128,128,255) — the familiar flat blue.
 *
 * Not consumed by Mockup Forge, which has no normal-map code path. Kept for
 * other tools; `ops/vectordisp.js` is what feeds the mockup renderer, and both
 * read their gradients from `ops/sobel.js` so they cannot disagree.
 */

/**
 * @param {Float32Array} height normalized height in [0,1]
 * @param {number} width
 * @param {number} height_ image height in pixels
 * @param {number} strength gradient gain
 * @param {boolean} yUp true = OpenGL convention (+Y up), false = DirectX (+Y down).
 *   Default true because WebGL/Figma shaders expect OpenGL.
 * @returns {Uint8Array} chunky RGB, 3 components per pixel
 */
export function normalMap(height, width, height_, strength, yUp = true) {
  const h = height_;
  const { gx, gy } = sobel(height, width, h);
  const out = new Uint8Array(width * h * 3);
  const ySign = yUp ? 1 : -1;

  for (let i = 0; i < width * h; i++) {
    // n = (-dh/dx, -dh/dy_up, 1); dh/dy_up == -gy, hence +gy for OpenGL.
    const nx = -gx[i] * strength;
    const ny = gy[i] * strength * ySign;
    const nz = 1;
    const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

    const p = i * 3;
    out[p]     = encodeNormalAxis(nx * inv);
    out[p + 1] = encodeNormalAxis(ny * inv);
    out[p + 2] = encodeNormalAxis(nz * inv);
  }
  return out;
}

function encodeNormalAxis(v) {
  const b = Math.round((v * 0.5 + 0.5) * 255);
  return b < 0 ? 0 : b > 255 ? 255 : b;
}
