// Segment the t-shirt: bright + desaturated + connected to a chest seed.
const sharp = require('sharp');
const D = '/private/tmp/claude-501/-Users-kyleforeman-Documents-GitHub-k4design-github-io-mockupplugin/8c5638a1-e077-4d6b-94e6-acd3cd637ff1/scratchpad';
const BASE = '/Users/kyleforeman/Documents/GitHub/k4design.github.io/mockupplugin/assets/items/tshirt-marina-01/base.png';

const LUM_MIN = Number(process.env.LUM_MIN ?? 120);
const SAT_MAX = Number(process.env.SAT_MAX ?? 26);
// Rough box around the man: keeps distant white boats out of the flood entirely.
const BOX = { x0: 500, y0: 230, x1: 1060, y1: 815 };
const SEEDS = [[814, 465], [760, 600], [700, 430], [900, 460], [960, 480], [600, 500]];

(async () => {
  const { data, info } = await sharp(BASE).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const ok = new Uint8Array(W * H);
  for (let y = BOX.y0; y < BOX.y1; y++) {
    for (let x = BOX.x0; x < BOX.x1; x++) {
      const i = (y * W + x) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum >= LUM_MIN && sat <= SAT_MAX) ok[y * W + x] = 1;
    }
  }
  // flood from seeds
  const mask = new Uint8Array(W * H);
  const stack = [];
  for (const [sx, sy] of SEEDS) {
    if (ok[sy * W + sx]) { stack.push(sy * W + sx); mask[sy * W + sx] = 1; }
    else console.log('seed rejected', sx, sy);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < BOX.x0 || nx >= BOX.x1 || ny < BOX.y0 || ny >= BOX.y1) continue;
      const q = ny * W + nx;
      if (ok[q] && !mask[q]) { mask[q] = 1; stack.push(q); }
    }
  }
  let count = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) {
    count++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  console.log('LUM_MIN', LUM_MIN, 'SAT_MAX', SAT_MAX, 'px', count, 'bbox', minX, minY, maxX, maxY);

  // overlay: magenta where mask
  const out = Buffer.alloc(W * H * 3);
  for (let p = 0; p < W * H; p++) {
    const i = p * C;
    if (mask[p]) { out[p * 3] = 255; out[p * 3 + 1] = 0; out[p * 3 + 2] = 255; }
    else { out[p * 3] = data[i]; out[p * 3 + 1] = data[i + 1]; out[p * 3 + 2] = data[i + 2]; }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize({ width: 900 }).toFile(`${D}/seg.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: 518, top: 243, width: 518, height: 573 }).resize({ width: 700 }).toFile(`${D}/seg-torso.png`);
})();
