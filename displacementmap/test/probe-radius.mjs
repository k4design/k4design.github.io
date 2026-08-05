import { blur } from "../src/ops/blur.js";
import { highPass } from "../src/ops/highpass.js";

// How much of a sinusoid of a given wavelength survives the high pass?
// 2048-wide strip, so numbers read directly against the preset reference edge.
const W = 2048, H = 1;

function retention(wavelength, radius) {
  const a = new Float32Array(W);
  for (let x = 0; x < W; x++) a[x] = 0.5 + 0.25 * Math.sin((2 * Math.PI * x) / wavelength);
  const hp = highPass(a, W, H, radius);
  // amplitude in the middle third, away from edge clamping
  let lo = Infinity, hi = -Infinity;
  for (let x = Math.floor(W / 3); x < Math.floor((2 * W) / 3); x++) { lo = Math.min(lo, hp[x]); hi = Math.max(hi, hp[x]); }
  return (hi - lo) / 0.5; // 1.0 = fully preserved
}

const wavelengths = [8, 32, 128, 384, 768, 2048];
const radii = [32, 64, 128, 256, 512];

console.log("retention of a sinusoid (1.00 = fully kept, 0.00 = removed)");
console.log("wavelength ->".padEnd(14) + wavelengths.map((w) => String(w).padStart(7)).join(""));
for (const r of radii) {
  const row = wavelengths.map((w) => retention(w, r).toFixed(2).padStart(7)).join("");
  console.log(`radius ${String(r).padEnd(7)}${row}`);
}

console.log("\nscale reference at 2048px: weave ~4-12px, creases ~30-120px,");
console.log("garment folds ~200-600px, lighting falloff ~1000-2048px");
