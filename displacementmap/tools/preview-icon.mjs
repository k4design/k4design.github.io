/**
 * Renders the panel icon large and flattened onto panel-grey so the glyph can
 * actually be judged, and alongside it a true-size 23px tile for a reality check.
 *
 *   node tools/preview-icon.mjs [outPath]
 *
 * Imports renderIcon/encodePng from make-icons.mjs so this previews exactly what
 * ships rather than a copy that can drift.
 */

import { writeFileSync } from "node:fs";
import { renderIcon, encodePng } from "./make-icons.mjs";

const BG = 45; // Photoshop dark panel grey

/** Composite white-on-transparent RGBA onto opaque grey. */
function flatten(rgba, size) {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const p = i * 4;
    const a = rgba[p + 3] / 255;
    const v = Math.round(BG + (255 - BG) * a);
    out[p] = out[p + 1] = out[p + 2] = v;
    out[p + 3] = 255;
  }
  return out;
}

/** Nearest-neighbour upscale, so we see the real 23px pixel grid magnified. */
function upscale(rgba, size, factor) {
  const big = size * factor;
  const out = new Uint8Array(big * big * 4);
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const sp = (((y / factor) | 0) * size + ((x / factor) | 0)) * 4;
      const dp = (y * big + x) * 4;
      out[dp] = rgba[sp];
      out[dp + 1] = rgba[sp + 1];
      out[dp + 2] = rgba[sp + 2];
      out[dp + 3] = rgba[sp + 3];
    }
  }
  return out;
}

const outPath = process.argv[2] || "icon-preview.png";

// The 23px icon magnified 12x with nearest-neighbour: this is the honest view of
// what Photoshop will draw, aliasing and all.
const SIZE = 23;
const FACTOR = 12;
const magnified = upscale(flatten(renderIcon(SIZE), SIZE), SIZE, FACTOR);
writeFileSync(outPath, encodePng(magnified, SIZE * FACTOR, SIZE * FACTOR));
console.log(`wrote ${outPath} — ${SIZE}px icon at ${FACTOR}x on panel grey`);
