/**
 * Generates the panel icons required by manifest.json.
 *
 * UXP needs at least one icon entry or Photoshop refuses to load the plugin
 * ("Expected atleast a single entry in the icons list"). Rather than commit
 * opaque binaries, this writes them from scratch with a minimal PNG encoder —
 * Node's zlib is the only dependency.
 *
 *   node tools/make-icons.mjs
 *
 * Motif: two offset sine waves — a displaced surface. Kept to two thin strokes
 * because the icon is drawn at 23px; three was unreadable mush at that size.
 *
 * Emitted twice: white ink for the dark panel themes, near-black for the light
 * ones. A single white icon disappears entirely on Photoshop's lightest theme.
 *
 * `tools/preview-icon.mjs` renders this same function large and flattened onto
 * grey so the shape can be checked without squinting.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

// ---------- minimal PNG encoder (RGBA, 8-bit) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** @param {Uint8Array} rgba length = width*height*4 */
export function encodePng(rgba, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) per scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- the icon itself ----------

const SS = 4; // supersampling factor per axis, for antialiasing

/**
 * Render the icon motif as RGBA at any size. Exported so the preview tool draws
 * exactly what ships, instead of a duplicate that can drift out of sync.
 * @param {number} size
 * @param {number} [ink=255] grey level of the stroke (255 = white, 34 = near-black)
 * @returns {Uint8Array} length size*size*4
 */
export function renderIcon(size, ink = 255) {
  const rgba = new Uint8Array(size * size * 4);
  const period = size;              // one full wave across the icon
  const amp = size * 0.085;
  const halfStroke = size * 0.038;
  const centers = [0.34, 0.66].map((f) => f * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const wave = Math.sin((2 * Math.PI * px) / period) * amp;
          for (const cy of centers) {
            if (Math.abs(py - (cy + wave)) < halfStroke) { hits++; break; }
          }
        }
      }
      const alpha = Math.round((hits / (SS * SS)) * 255);
      const p = (y * size + x) * 4;
      rgba[p] = ink;
      rgba[p + 1] = ink;
      rgba[p + 2] = ink;
      rgba[p + 3] = alpha;
    }
  }
  return rgba;
}

// Only write files when run directly, so preview-icon.mjs can import the render
// function without side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(OUT_DIR, { recursive: true });
  const variants = [
    ["dark", 255],  // white ink, for the dark panel themes
    ["light", 34],  // near-black ink, for the light panel themes
  ];
  for (const [variant, ink] of variants) {
    for (const [size, suffix] of [[23, ""], [46, "@2x"]]) {
      const name = `${variant}${suffix}.png`;
      const png = encodePng(renderIcon(size, ink), size, size);
      writeFileSync(join(OUT_DIR, name), png);
      console.log(`wrote icons/${name}  ${size}x${size}  ${png.length} bytes`);
    }
  }
}
