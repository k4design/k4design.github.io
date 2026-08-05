import sharp from 'sharp';

/**
 * A deterministic test design for the golden-image suite.
 *
 * Drawn procedurally into a raw buffer rather than via SVG on purpose: SVG text
 * pulls in whatever fonts the host machine happens to have, and a font
 * substitution would change every golden image on a different machine. Nothing
 * here depends on anything outside this function.
 *
 * The pattern is chosen so warp regressions are visible rather than plausible:
 * a grid catches shear and non-uniform scale, distinct corner colours catch
 * flips and rotations, and the diagonal catches transposition.
 */
export async function testDesignPng(width: number, height: number): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 4);
  const step = Math.max(8, Math.round(Math.min(width, height) / 10));
  const marker = Math.round(Math.min(width, height) * 0.12);

  const corners: [number, number, number][] = [
    [220, 40, 40],
    [40, 190, 90],
    [240, 200, 40],
    [40, 120, 230],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;

      // Diagonal gradient backdrop.
      const t = (x / width + y / height) / 2;
      let r = Math.round(24 + t * 40);
      let g = Math.round(28 + t * 24);
      let b = Math.round(60 + t * 60);

      // Grid.
      if (x % step === 0 || y % step === 0) {
        r = 236;
        g = 238;
        b = 245;
      }

      // Centre cross.
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);
      const thickness = Math.max(2, Math.round(Math.min(width, height) / 200));
      if (Math.abs(x - cx) < thickness || Math.abs(y - cy) < thickness) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Descending diagonal, so a transposed warp cannot pass.
      if (Math.abs(y / height - x / width) < 0.006) {
        r = 255;
        g = 140;
        b = 0;
      }

      // Corner markers, each a different colour.
      const inLeft = x < marker;
      const inRight = x >= width - marker;
      const inTop = y < marker;
      const inBottom = y >= height - marker;
      let corner: [number, number, number] | null = null;
      if (inTop && inLeft) corner = corners[0]!;
      else if (inTop && inRight) corner = corners[1]!;
      else if (inBottom && inRight) corner = corners[2]!;
      else if (inBottom && inLeft) corner = corners[3]!;
      if (corner) {
        r = corner[0];
        g = corner[1];
        b = corner[2];
      }

      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }

  return sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
}
