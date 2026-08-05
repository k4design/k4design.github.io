/**
 * Generates the Figma Community listing artwork into apps/plugin/community/:
 *
 *   icon.png        128×128   plugin icon
 *   thumbnail.png   1920×1080 cover
 *   carousel-*.png  1920×1080 feature boards
 *
 * Everything is composed from the plugin's own visual language (the guide
 * page's violet→pink→amber gradient and ⌗ mark) plus real renders from
 * assets/samples — run `tools/render-sample.ts` first so those exist.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SAMPLES = path.join(ROOT, 'assets', 'samples');
const OUT = path.join(ROOT, 'apps', 'plugin', 'community');

const GRAD = { from: '#8b6cff', mid: '#f472b6', to: '#fbbf24' };
const BG = '#05060a';

/** The ⌗ mark drawn as geometry — no font dependence for the icon. */
function markSvg(size: number, stroke: number, color: string): string {
  const a = size * 0.31;
  const b = size * 0.69;
  const lo = size * 0.14;
  const hi = size * 0.86;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  return [
    line(lo, a, hi, a),
    line(lo, b, hi, b),
    line(a, lo, a, hi),
    line(b, lo, b, hi),
  ].join('');
}

const gradientDef = (id: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stop-color="${GRAD.from}"/>
     <stop offset="0.55" stop-color="${GRAD.mid}"/>
     <stop offset="1" stop-color="${GRAD.to}"/>
   </linearGradient>`;

async function icon(): Promise<void> {
  const size = 128;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>${gradientDef('g')}</defs>
    <rect width="${size}" height="${size}" rx="28" fill="url(#g)"/>
    ${markSvg(size, 9, '#ffffff')}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'icon.png'));
}

interface Tile {
  file: string;
  /** Crop focus, 0..1 of source height. */
  focusY?: number;
}

/** A dark board with a headline and a row of sample renders. */
async function board(
  name: string,
  headline: string,
  gradientWord: string,
  sub: string,
  tiles: Tile[],
): Promise<void> {
  const W = 1920;
  const H = 1080;
  const tileTop = 470;
  const tileHeight = 500;
  const gap = 24;
  const margin = 90;
  const tileWidth = Math.floor((W - margin * 2 - gap * (tiles.length - 1)) / tiles.length);

  // Headline is two-tone: plain text plus a gradient word, mirroring the hero.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      ${gradientDef('g')}
      <radialGradient id="glow" cx="50%" cy="0%" r="80%">
        <stop offset="0" stop-color="#8b6cff" stop-opacity="0.22"/>
        <stop offset="0.5" stop-color="#f472b6" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g transform="translate(${margin}, 120)">
      <rect width="64" height="64" rx="16" fill="url(#g)"/>
      ${markSvg(64, 5, '#ffffff')}
    </g>
    <text x="${margin + 92}" y="168" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#f2f4f8">Mockup Forge</text>
    <text x="${margin}" y="300" font-family="Helvetica, Arial, sans-serif" font-size="86" font-weight="800" letter-spacing="-2" fill="#f2f4f8">${headline}<tspan fill="url(#g)" dx="20">${gradientWord}</tspan></text>
    <text x="${margin}" y="378" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#8b93a5">${sub}</text>
  </svg>`;

  const composites: sharp.OverlayOptions[] = [];
  for (const [index, tile] of tiles.entries()) {
    const source = sharp(path.join(SAMPLES, tile.file));
    const meta = await source.metadata();
    const scale = tileWidth / (meta.width ?? tileWidth);
    const scaledHeight = Math.round((meta.height ?? tileHeight) * scale);
    let image = source.resize({ width: tileWidth });
    if (scaledHeight > tileHeight) {
      const focus = tile.focusY ?? 0.45;
      const top = Math.max(
        0,
        Math.min(scaledHeight - tileHeight, Math.round(scaledHeight * focus - tileHeight / 2)),
      );
      image = sharp(await image.png().toBuffer()).extract({
        left: 0,
        top,
        width: tileWidth,
        height: tileHeight,
      });
    }
    const rounded = Buffer.from(
      `<svg width="${tileWidth}" height="${Math.min(tileHeight, scaledHeight)}"><rect width="100%" height="100%" rx="18"/></svg>`,
    );
    composites.push({
      input: await image
        .composite([{ input: rounded, blend: 'dest-in' }])
        .png()
        .toBuffer(),
      left: margin + index * (tileWidth + gap),
      top: tileTop,
    });
  }

  await sharp(Buffer.from(svg))
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
}

await fs.mkdir(OUT, { recursive: true });
await icon();

await board(
  'thumbnail.png',
  'Your design, on the',
  'real thing.',
  'Photorealistic mockups rendered inside Figma — devices, apparel, packaging, print, even video.',
  [
    { file: 'phone-front-01.png', focusY: 0.5 },
    { file: 'mug-ceramic-front-01.png', focusY: 0.48 },
    { file: 'tshirt-flatlay-01.png', focusY: 0.48 },
    { file: 'billboard-street-01.png', focusY: 0.42 },
  ],
);

await board(
  'carousel-warps.png',
  'Real warps, not',
  'skews.',
  'Perspective for flat surfaces, cylindrical wrap for mugs and bottles, fabric displacement for apparel.',
  [
    { file: 'laptop-open-01.png', focusY: 0.42 },
    { file: 'mug-ceramic-front-01.png', focusY: 0.48 },
    { file: 'tshirt-flatlay-01.png', focusY: 0.48 },
  ],
);

await board(
  'carousel-colorize.png',
  'Recolour the',
  'product.',
  'Shading and texture survive — tints apply as ratios, so a white mug goes black believably.',
  [
    { file: 'mug-ceramic-front-01.png', focusY: 0.48 },
    { file: 'mug-ceramic-front-01-1d2733.png', focusY: 0.48 },
    { file: 'tshirt-flatlay-01-1d2733.png', focusY: 0.48 },
  ],
);

await board(
  'carousel-video.png',
  'Video, playing on the',
  'mockup.',
  'Drop in a clip, watch it warped onto the product, export an MP4 — encoded locally.',
  [{ file: 'curved-display-01.png', focusY: 0.5 }],
);

console.log(`✓ Wrote icon + thumbnail + carousel boards to ${OUT}`);
