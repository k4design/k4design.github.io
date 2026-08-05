import { blur } from "../src/ops/blur.js";
import { luminance } from "../src/ops/luminance.js";
import { highPass } from "../src/ops/highpass.js";
import { normalize } from "../src/ops/levels.js";
import { normalMap } from "../src/ops/normal.js";
import { aoMap } from "../src/ops/ao.js";
import { sobel } from "../src/ops/sobel.js";
import { vectorDisplacement } from "../src/ops/vectordisp.js";
import { shadowMap } from "../src/ops/shadow.js";
import { highlightMap } from "../src/ops/highlight.js";
import { highPassWithLow } from "../src/ops/highpass.js";

let fails = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) { fails++; console.log(`FAIL ${name} ${extra}`); }
  else console.log(`ok   ${name} ${extra}`);
};

// --- blur: constant field is preserved (DC gain == 1, edge clamping correct)
{
  const W = 37, H = 23;
  const a = new Float32Array(W * H).fill(0.4);
  const b = blur(a, W, H, 5);
  let max = 0;
  for (let i = 0; i < b.length; i++) max = Math.max(max, Math.abs(b[i] - 0.4));
  ok("blur preserves constant", max < 1e-5, `maxErr=${max.toExponential(2)}`);
}

// --- blur: energy preserved on a random field (mean unchanged)
{
  const W = 64, H = 64;
  const a = new Float32Array(W * H);
  for (let i = 0; i < a.length; i++) a[i] = ((i * 2654435761) % 1000) / 1000;
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const b = blur(a, W, H, 4);
  ok("blur preserves mean", Math.abs(mean(a) - mean(b)) < 1e-3,
     `${mean(a).toFixed(5)} -> ${mean(b).toFixed(5)}`);
}

// --- blur: radius 0 is identity
{
  const a = new Float32Array([1, 2, 3, 4]);
  const b = blur(a, 2, 2, 0);
  ok("blur radius 0 identity", a.every((v, i) => v === b[i]));
  ok("blur does not mutate src", a[0] === 1);
}

// --- blur: effective sigma ~= radius (impulse response std dev)
{
  const W = 401, H = 1, R = 10;
  const a = new Float32Array(W * H);
  a[200] = 1;
  const b = blur(a, W, H, R);
  let sum = 0, m = 0;
  for (let x = 0; x < W; x++) { sum += b[x]; m += b[x] * x; }
  m /= sum;
  let v = 0;
  for (let x = 0; x < W; x++) v += b[x] * (x - m) ** 2;
  v /= sum;
  const sigma = Math.sqrt(v);
  ok("blur sigma ~= radius", Math.abs(sigma - R) / R < 0.10,
     `sigma=${sigma.toFixed(2)} for r=${R}`);
}

// --- luminance: pure white -> 1, black -> 0, mid grey linearizes below 0.5
{
  const px = new Uint8Array([255,255,255, 0,0,0, 128,128,128]);
  const l = luminance(px, 3, 3);
  ok("luma white=1", Math.abs(l[0] - 1) < 1e-4, `${l[0]}`);
  ok("luma black=0", Math.abs(l[1]) < 1e-6, `${l[1]}`);
  ok("luma 128 linearized (~0.216)", l[2] > 0.20 && l[2] < 0.23, `${l[2].toFixed(4)}`);
}

// --- luminance: green weighted heaviest
{
  const px = new Uint8Array([255,0,0, 0,255,0, 0,0,255]);
  const l = luminance(px, 3, 3);
  ok("luma G > R > B", l[1] > l[0] && l[0] > l[2],
     `R=${l[0].toFixed(3)} G=${l[1].toFixed(3)} B=${l[2].toFixed(3)}`);
}

// --- THE key behaviour, at the real reference scale: the high pass must drop
// broad lighting falloff while keeping fold- and weave-scale geometry, and must
// suppress a print small relative to its radius.
{
  const W = 2048, H = 64;
  const RADIUS = 128; // the fabric preset
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lighting = 60 * Math.cos((Math.PI * x) / W);      // broad falloff, albedo-like
      const fold = 14 * Math.sin((2 * Math.PI * x) / 384);    // fold-scale geometry
      const weave = 6 * Math.sin((2 * Math.PI * x) / 8);      // weave
      const smallPrint = x > 1000 && x < 1180 ? -70 : 0;      // 180px logo (< 2x radius)
      const v = Math.max(0, Math.min(255, Math.round(170 + lighting + fold + weave + smallPrint)));
      const p = (y * W + x) * 3;
      px[p] = px[p + 1] = px[p + 2] = v;
    }
  }
  const luma = luminance(px, W * H, 3);
  const hp = highPass(luma, W, H, RADIUS);

  const row = H >> 1;
  // Average over a 32px window to cancel the weave when probing broad levels.
  const patch = (buf, cx) => {
    let s = 0;
    for (let x = cx - 16; x <= cx + 16; x++) s += buf[row * W + x];
    return s / 33;
  };
  // Peak-to-trough of a given feature, measured over a span.
  const p2p = (buf, from, to) => {
    let lo = Infinity, hi = -Infinity;
    for (let x = from; x < to; x++) { const v = buf[row * W + x]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return hi - lo;
  };

  const rawLighting = Math.abs(patch(luma, 200) - patch(luma, 1848));
  const hpLighting = Math.abs(patch(hp, 200) - patch(hp, 1848));
  ok("raw luma carries broad lighting falloff", rawLighting > 0.15, `delta=${rawLighting.toFixed(3)}`);
  ok("high pass removes broad lighting falloff", hpLighting < 0.08 * rawLighting,
     `${rawLighting.toFixed(3)} -> ${hpLighting.toFixed(3)} (${(rawLighting / hpLighting).toFixed(0)}x down)`);

  // Documented limitation, asserted so it can't be forgotten: the high pass is a
  // LOW-frequency filter, so a printed graphic — which is smaller and sharper
  // than the cutoff — survives it and will be baked in as fake geometry. There is
  // no radius that fixes this without also erasing the folds. The source must be
  // a BLANK mockup.
  const printDelta = Math.abs(patch(hp, 1090) - patch(hp, 600));
  ok("a mid-size print SURVIVES the high pass (source must be blank)",
     printDelta > 0.05, `delta=${printDelta.toFixed(3)}`);

  // Fold-scale signal must survive: compare against raw amplitude in a clean span.
  const foldRaw = p2p(luma, 200, 584);
  const foldHp = p2p(hp, 200, 584);
  ok("high pass keeps fold-scale geometry", foldHp > 0.6 * foldRaw,
     `${foldRaw.toFixed(4)} -> ${foldHp.toFixed(4)}`);
  ok("high pass keeps the weave", p2p(hp, 400, 408) > 0.005, `p2p=${p2p(hp, 400, 408).toFixed(4)}`);

  // --- levels: symmetric mode keeps 0.5 exactly neutral.
  // Note it deliberately does NOT push both ends to the rails — a single gain is
  // set by the larger deviation so that neutral cannot drift. Only the dominant
  // side reaches a rail; that is the point, not a bug.
  const lev = normalize(hp, { symmetric: true });
  const mean = lev.reduce((s, v) => s + v, 0) / lev.length;
  ok("symmetric normalize keeps neutral ~0.5", Math.abs(mean - 0.5) < 0.02, `mean=${mean.toFixed(4)}`);
  let mn = Infinity, mx = -Infinity;
  for (const v of lev) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  ok("symmetric normalize drives the dominant side to a rail",
     Math.max(mx - 0.5, 0.5 - mn) > 0.45, `[${mn.toFixed(3)},${mx.toFixed(3)}]`);
  ok("symmetric normalize stays in [0,1]", mn >= 0 && mx <= 1);
}

// --- levels: asymmetric mode stretches to full range, clip resists outliers
{
  const a = new Float32Array(1000);
  for (let i = 0; i < 1000; i++) a[i] = 0.4 + (i / 1000) * 0.2; // 0.4..0.6
  a[0] = -50; a[999] = 50;                                       // outliers
  const n = normalize(a, { symmetric: false, clip: 0.005 });
  let inRange = 0;
  for (let i = 5; i < 995; i++) if (n[i] > 0.001 && n[i] < 0.999) inRange++;
  ok("percentile clip ignores outliers", inRange > 900, `${inRange}/990 mid-range`);
}

// --- levels: flat input doesn't divide by zero
{
  const flat = new Float32Array(100).fill(0.5);
  const s = normalize(flat, { symmetric: true });
  ok("flat input -> neutral", s.every((v) => v === 0.5));
  const a = normalize(flat, { symmetric: false });
  ok("flat input asym -> no NaN", a.every((v) => Number.isFinite(v)));
}

// --- normal map: flat height -> (128,128,255)
{
  const W = 16, H = 16;
  const h = new Float32Array(W * H).fill(0.5);
  const n = normalMap(h, W, H, 2.5, true);
  ok("flat normal is 128,128,255",
     n[0] === 128 && n[1] === 128 && n[2] === 255, `${n[0]},${n[1]},${n[2]}`);
}

// --- normal map: convention check on a ramp rising to the right / downward
{
  const W = 32, H = 32;
  const hx = new Float32Array(W * H);
  const hy = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    hx[y * W + x] = x / (W - 1);   // rises to the right
    hy[y * W + x] = y / (H - 1);   // rises downward
  }
  const c = (buf, s, yUp) => {
    const n = normalMap(buf, W, H, s, yUp);
    const p = (16 * W + 16) * 3;
    return [n[p], n[p + 1], n[p + 2]];
  };
  const rx = c(hx, 4, true);
  ok("ramp right -> R below 128 (nx = -dh/dx)", rx[0] < 120, `R=${rx[0]}`);
  const ryUp = c(hy, 4, true);
  const ryDown = c(hy, 4, false);
  ok("ramp down -> G above 128 in OpenGL (+Y up)", ryUp[1] > 136, `G=${ryUp[1]}`);
  ok("normalYUp=false flips green", ryDown[1] < 120 && Math.abs((255 - ryDown[1]) - ryUp[1]) <= 1,
     `G openGL=${ryUp[1]} directX=${ryDown[1]}`);
  ok("normal is unit length", (() => {
    const v = rx.map((b) => (b / 255) * 2 - 1);
    const len = Math.hypot(...v);
    return Math.abs(len - 1) < 0.02;
  })(), "");
}

// --- AO: valley darkens, plateau stays lit
{
  const W = 64, H = 64;
  const h = new Float32Array(W * H).fill(0.6);
  for (let y = 28; y < 36; y++) for (let x = 28; x < 36; x++) h[y * W + x] = 0.1; // pit
  const ao = aoMap(h, W, H, 12, 1.2);
  const pit = ao[32 * W + 32];
  const plateau = ao[2 * W + 2];
  ok("AO darkens the valley", pit < 0.8, `pit=${pit.toFixed(3)}`);
  ok("AO leaves flat areas lit", plateau > 0.95, `plateau=${plateau.toFixed(3)}`);
  ok("AO stays in [0,1]", ao.every((v) => v >= 0 && v <= 1));
}

// --- determinism
{
  const W = 48, H = 48;
  const px = new Uint8Array(W * H * 3);
  for (let i = 0; i < px.length; i++) px[i] = (i * 97) % 256;
  const run = () => {
    const l = luminance(px, W * H, 3);
    const hp = highPass(l, W, H, 20);
    const lev = normalize(hp, { symmetric: true });
    const hf = blur(lev, W, H, 3);
    return Array.from(normalMap(hf, W, H, 2.5, true));
  };
  const a = run(), b = run();
  ok("pipeline is deterministic", a.every((v, i) => v === b[i]));
}


// ============================================================
//  Mockup Forge output maps
// ============================================================

// --- sobel feeds both the normal map and the displacement map
{
  const W = 32, H = 32;
  const ramp = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ramp[y * W + x] = x / (W - 1);
  const { gx, gy } = sobel(ramp, W, H);
  const i = 16 * W + 16;
  ok("sobel gx matches the ramp slope", Math.abs(gx[i] - 1 / (W - 1)) < 1e-6, `gx=${gx[i].toFixed(6)}`);
  ok("sobel gy is zero on a horizontal ramp", Math.abs(gy[i]) < 1e-6, `gy=${gy[i]}`);

  // The value normalMap used to compute inline, now shared. If these diverge the
  // normal map and the displacement map would disagree about the same fold.
  const flat = new Float32Array(W * H).fill(0.5);
  const f = sobel(flat, W, H);
  ok("sobel of a flat field is zero", f.gx.every((v) => v === 0) && f.gy.every((v) => v === 0));
}

// --- vector displacement: neutral, range, and direction preservation
{
  const W = 24, H = 24;
  const flat = new Float32Array(W * H).fill(0.42);
  const enc = vectorDisplacement(flat, W, H);
  ok("flat field encodes to exactly neutral 128",
     enc.every((v) => v === 128), `first=${enc[0]},${enc[1]},${enc[2]}`);

  const bump = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    bump[y * W + x] = Math.exp(-(((x - 12) ** 2 + (y - 12) ** 2) / 30));
  }
  const b = vectorDisplacement(bump, W, H);
  ok("displacement stays in [0,255]", b.every((v) => v >= 0 && v <= 255));
  ok("blue channel is held at neutral", b.filter((_, i) => i % 3 === 2).every((v) => v === 128));

  // Direction must survive encoding: a single magnitude-based gain, not per-axis.
  // Only meaningful where the encoded vector is well clear of the 1-level
  // quantization floor; a gradient encoding to 2 levels has no reliable angle.
  const { gx, gy } = sobel(bump, W, H);
  let worst = 0;
  let checked = 0;
  for (let i = 0; i < W * H; i++) {
    const ex = b[i * 3] - 128;
    const ey = b[i * 3 + 1] - 128;
    if (Math.hypot(ex, ey) < 20) continue;
    checked++;
    let d = Math.abs(Math.atan2(gy[i], gx[i]) - Math.atan2(ey, ex));
    if (d > Math.PI) d = 2 * Math.PI - d;
    worst = Math.max(worst, d);
  }
  ok("encoding preserves gradient direction", checked > 50 && worst < 0.05,
     `worst ${(worst * 180 / Math.PI).toFixed(2)} deg over ${checked} px`);

  // encodeDispAxis maps [-1,1] onto [1,255] symmetrically about 128, so the
  // mirror of v is 256 - v, not 255 - v.
  const flipped = vectorDisplacement(bump, W, H, { yUp: false });
  ok("Flip Y mirrors the green channel about 128",
     flipped.filter((_, i) => i % 3 === 1).every((v, j) => v === 256 - b[j * 3 + 1]));
  ok("Flip Y leaves the red channel alone",
     flipped.filter((_, i) => i % 3 === 0).every((v, j) => v === b[j * 3]));
}

// --- THE contract test: our encoder against the renderer's literal decode.
// apps/api/src/render/warp.ts:501-503
//   dx = ((R - 128) / 127) * scale ;  dy = ((G - 128) / 127) * scale
{
  const W = 64, H = 64;
  const fold = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fold[y * W + x] = 0.5 + 0.4 * Math.sin(x / 5);
  const enc = vectorDisplacement(fold, W, H);
  const SCALE = 12;

  let maxOffset = 0;
  let sawNegative = false;
  let sawPositive = false;
  for (let i = 0; i < W * H; i++) {
    const dx = ((enc[i * 3] - 128) / 127) * SCALE;
    const dy = ((enc[i * 3 + 1] - 128) / 127) * SCALE;
    maxOffset = Math.max(maxOffset, Math.hypot(dx, dy));
    if (dx < -0.5) sawNegative = true;
    if (dx > 0.5) sawPositive = true;
  }
  ok("decoded offset never exceeds the declared scale", maxOffset <= SCALE + 1e-6,
     `max=${maxOffset.toFixed(3)} scale=${SCALE}`);
  ok("decoded offset reaches most of the scale", maxOffset > SCALE * 0.8,
     `max=${maxOffset.toFixed(3)}`);
  ok("displacement pushes both directions across a fold", sawNegative && sawPositive);
}

// --- shadow map: white is multiply-neutral, dark is shaded
{
  const N = 64 * 64;
  const evenLight = new Float32Array(N).fill(0.6);
  const noOcclusion = new Float32Array(N).fill(1);
  const flat = shadowMap(evenLight, noOcclusion, { gamma: 1, strength: 1 });
  ok("evenly lit + unoccluded is multiply-neutral white",
     flat.every((v) => v > 0.99), `min=${Math.min(...flat).toFixed(4)}`);

  const falloff = new Float32Array(N);
  for (let i = 0; i < N; i++) falloff[i] = 0.2 + 0.8 * ((i % 64) / 63);
  const graded = shadowMap(falloff, noOcclusion, { gamma: 1, strength: 1 });
  ok("real lighting falloff darkens the shaded end",
     graded[0] < 0.35 && graded[63] > 0.95, `dark=${graded[0].toFixed(3)} lit=${graded[63].toFixed(3)}`);

  const occluded = new Float32Array(N).fill(1);
  occluded[100] = 0.3;
  const withAo = shadowMap(evenLight, occluded, { gamma: 1, strength: 1 });
  ok("crevice occlusion darkens that pixel", withAo[100] < 0.35, `${withAo[100].toFixed(3)}`);

  const off = shadowMap(falloff, occluded, { gamma: 1, strength: 0 });
  ok("strength 0 is fully neutral", off.every((v) => v === 1));
  ok("shadow stays in [0,1]", graded.every((v) => v >= 0 && v <= 1));
}

// --- highlight map: black is screen-neutral, only speculars light up
{
  const N = 1000;
  const luma = new Float32Array(N);
  for (let i = 0; i < N; i++) luma[i] = i < 950 ? 0.3 : 0.9 + (i - 950) / 500;
  const hl = highlightMap(luma, { threshold: 0.92, strength: 1 });
  ok("non-specular area is screen-neutral black", hl.slice(0, 900).every((v) => v === 0));
  ok("speculars light up", hl[999] > 0.5, `${hl[999].toFixed(3)}`);
  ok("highlight stays in [0,1]", hl.every((v) => v >= 0 && v <= 1));

  const flatLuma = new Float32Array(N).fill(0.5);
  ok("a surface with no headroom yields an all-neutral map",
     highlightMap(flatLuma, {}).every((v) => v === 0));
  ok("strength 0 is fully neutral", highlightMap(luma, { strength: 0 }).every((v) => v === 0));
}

// --- highPassWithLow returns the lighting the shadow map needs
{
  const W = 256, H = 8;
  const luma = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    luma[y * W + x] = 0.5 + 0.3 * Math.cos((Math.PI * x) / W) + 0.02 * Math.sin(x);
  }
  const { height: hp, low } = highPassWithLow(luma, W, H, 32);
  ok("low component tracks the broad lighting",
     low[4 * W + 10] > low[4 * W + 245], `${low[4 * W + 10].toFixed(3)} > ${low[4 * W + 245].toFixed(3)}`);
  ok("highPass and highPassWithLow agree",
     highPass(luma, W, H, 32).every((v, i) => Math.abs(v - hp[i]) < 1e-9));

  const zero = highPassWithLow(luma, W, H, 0);
  ok("radius 0 makes luminance its own low component",
     zero.low.every((v, i) => v === luma[i]));
}

console.log(fails ? `\n${fails} FAILURE(S)` : "\nall passed");
process.exit(fails ? 1 : 0);
