/**
 * Renders one or more catalog items against a generated test design and writes
 * the results to disk. This is the fast feedback loop for warp work — no Figma,
 * no plugin, just the pipeline.
 *
 *   npx tsx tools/render-sample.ts                       # every item
 *   npx tsx tools/render-sample.ts mug-ceramic-front-01  # one item
 *   MF_API=http://127.0.0.1:8787 npx tsx tools/render-sample.ts --width 1200
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const API = process.env.MF_API ?? 'http://127.0.0.1:8787';
const OUT_DIR = process.env.MF_OUT ?? path.resolve(import.meta.dirname, '../assets/samples');

/**
 * A test card: a bold grid with corner markers and a centre cross. Warp errors
 * are obvious against straight lines and hard to see against photography.
 */
function testDesign(width: number, height: number, label: string): string {
  const step = Math.max(24, Math.round(Math.min(width, height) / 8));
  const lines: string[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ffffff" stroke-width="2" opacity="0.55"/>`);
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ffffff" stroke-width="2" opacity="0.55"/>`);
  }

  const marker = Math.round(Math.min(width, height) * 0.09);
  const corners = [
    [0, 0, '#ff3b30'],
    [width - marker, 0, '#34c759'],
    [width - marker, height - marker, '#ffcc00'],
    [0, height - marker, '#0a84ff'],
  ] as const;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1b1f3b"/>
        <stop offset="0.55" stop-color="#3b2b6b"/>
        <stop offset="1" stop-color="#0f2b46"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    ${lines.join('')}
    <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#ffffff" stroke-width="5"/>
    <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#ffffff" stroke-width="5"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.16}" fill="none" stroke="#ffffff" stroke-width="6"/>
    ${corners.map(([x, y, fill]) => `<rect x="${x}" y="${y}" width="${marker}" height="${marker}" fill="${fill}"/>`).join('')}
    <text x="${width / 2}" y="${height * 0.86}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(
      Math.min(width, height) * 0.075,
    )}" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>
  </svg>`;
}

interface Surface {
  id: string;
  label?: string;
  placeholder: { aspect: number; recommendedWidth: number; recommendedHeight: number };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const widthArg = argv.indexOf('--width');
  const outputWidth = widthArg >= 0 ? Number(argv[widthArg + 1]) : undefined;
  const ids = argv.filter((a) => !a.startsWith('--') && a !== String(outputWidth));

  const catalogResponse = await fetch(`${API}/catalog?limit=60`);
  if (!catalogResponse.ok) {
    throw new Error(`Catalog request failed (${catalogResponse.status}). Is the API running at ${API}?`);
  }
  const { items } = (await catalogResponse.json()) as { items: { id: string; name: string }[] };
  const targets = ids.length ? items.filter((i) => ids.includes(i.id)) : items;
  if (targets.length === 0) throw new Error(`No matching items. Known: ${items.map((i) => i.id).join(', ')}`);

  await fs.mkdir(OUT_DIR, { recursive: true });
  let failures = 0;

  for (const item of targets) {
    const detail = (await (await fetch(`${API}/items/${item.id}`)).json()) as {
      surfaces: Surface[];
      colorize: { id: string; default: string }[];
    };

    const designs = [];
    for (const surface of detail.surfaces) {
      const w = Math.min(1400, surface.placeholder.recommendedWidth);
      const h = Math.round(w / surface.placeholder.aspect);
      const png = await sharp(Buffer.from(testDesign(w, h, surface.label ?? surface.id)))
        .png()
        .toBuffer();
      designs.push({ surfaceId: surface.id, design: png.toString('base64'), width: w, height: h });
    }

    const body = {
      itemId: item.id,
      designs,
      colorize: {},
      ...(outputWidth ? { outputWidth } : {}),
    };

    const started = Date.now();
    const response = await fetch(`${API}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      failures += 1;
      console.error(`${item.id.padEnd(28)} FAILED ${response.status} ${await response.text()}`);
      continue;
    }

    const result = (await response.json()) as {
      png: string;
      width: number;
      height: number;
      ms: number;
      warnings: { message: string }[];
    };
    const file = path.join(OUT_DIR, `${item.id}.png`);
    await fs.writeFile(file, Buffer.from(result.png, 'base64'));
    console.log(
      `${item.id.padEnd(28)} ${String(result.width).padStart(4)}x${String(result.height).padEnd(
        4,
      )} render ${String(result.ms).padStart(5)}ms  round-trip ${String(Date.now() - started).padStart(5)}ms${
        result.warnings.length ? `  ⚠ ${result.warnings.map((w) => w.message).join('; ')}` : ''
      }`,
    );
  }

  console.log(`\nWrote ${targets.length - failures} render(s) to ${OUT_DIR}`);
  if (failures > 0) process.exit(1);
}

await main();
