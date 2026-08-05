/**
 * Authoring tool: turns a base photograph plus a geometry definition into a
 * complete, ready-to-render item package.
 *
 * It writes item.json and derives the alpha mask, shadow and highlight maps from
 * the geometry you give it, so the mask always agrees with the warp. Point
 * coordinates come from tools/pick-points.html — open a photo there, click the
 * corners, and paste the result here.
 *
 * Flat surface (phone screen, poster, card):
 *
 *   npx tsx tools/author-item.ts \
 *     --id desk-poster-01 --name "Poster on Desk" \
 *     --category print --viewpoint scene \
 *     --base ~/photos/desk.jpg \
 *     --corners "0.21,0.18 0.78,0.24 0.76,0.88 0.19,0.82" \
 *     --aspect 0.7071
 *
 * Curved surface (mug, bottle, can) — a cylindrical wrap over a rectangle:
 *
 *   npx tsx tools/author-item.ts --id can-01 --name "Drinks Can" \
 *     --category packaging --viewpoint front --base can.jpg \
 *     --rect "0.36,0.3 0.28,0.44" --cylinder 0.66 --aspect 1.3333
 *
 * Fabric surface (t-shirt, tote) — mesh sag plus a wrinkle displacement map:
 *
 *   npx tsx tools/author-item.ts --id hoodie-01 --name Hoodie \
 *     --category apparel --viewpoint flat-lay --base hoodie.jpg \
 *     --rect "0.35,0.32 0.3,0.33" --fabric --displacement 14 --aspect 1
 *
 * Add --colorize "shirtColor:#f4f4f4:0.3,0.2 0.7,0.2 0.7,0.9 0.3,0.9" to make a
 * region recolourable. Pass --dry-run to print the item JSON without writing.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  CATEGORIES,
  VIEWPOINTS,
  MockupItemSchema,
  cylinderMesh,
  fabricMesh,
  meshOutline,
  quadPoints,
  denormalize,
  pt,
  quad,
  rectQuad,
  type Category,
  type Layer,
  type Point,
  type Viewpoint,
  type Warp,
} from '@mf/shared';
import {
  highlightMapSvg,
  polygonMaskSvg,
  shadowMapSvg,
  svgToPng,
  thumbnail,
  wrinklePng,
} from '../apps/api/src/seed/raster.js';

interface Args {
  [key: string]: string | boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function required(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`Missing --${key}. Run with --help for examples.`);
  }
  return (value as string).trim();
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** "0.2,0.3 0.8,0.3 0.8,0.9 0.2,0.9" -> four points. */
function parsePoints(raw: string, expected?: number): Point[] {
  const points = raw
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        fail(`Could not read "${pair}" as an x,y pair.`);
      }
      return pt(x!, y!);
    });
  if (expected !== undefined && points.length !== expected) {
    fail(`Expected ${expected} points but got ${points.length}.`);
  }
  for (const point of points) {
    if (point.x < -0.5 || point.x > 1.5 || point.y < -0.5 || point.y > 1.5) {
      fail(
        `Point ${point.x},${point.y} looks like pixels, not a 0..1 fraction. ` +
          `Divide by the photo's width and height first (pick-points.html does this for you).`,
      );
    }
  }
  return points;
}

/** "0.36,0.3 0.28,0.44" -> x,y then width,height. */
function parseRect(raw: string) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 2) fail('--rect wants "x,y w,h", e.g. "0.36,0.3 0.28,0.44".');
  const [origin, size] = parsePoints(raw, 2);
  return rectQuad(origin!.x, origin!.y, size!.x, size!.y);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || Object.keys(args).length === 0) {
    // The file header is the documentation; print it rather than duplicating it.
    const self = await fs.readFile(new URL(import.meta.url), 'utf8');
    const header = self.slice(self.indexOf('/**') + 3, self.indexOf('*/'));
    console.log(header.replace(/^ \* ?/gm, ''));
    return;
  }

  const id = required(args, 'id');
  if (!/^[a-z0-9-]+$/.test(id)) fail(`--id must be kebab-case; got "${id}".`);

  const category = required(args, 'category') as Category;
  if (!CATEGORIES.includes(category)) {
    fail(`--category must be one of: ${CATEGORIES.join(', ')}`);
  }
  const viewpoint = required(args, 'viewpoint') as Viewpoint;
  if (!VIEWPOINTS.includes(viewpoint)) {
    fail(`--viewpoint must be one of: ${VIEWPOINTS.join(', ')}`);
  }

  const basePath = path.resolve(required(args, 'base'));
  const baseImage = sharp(basePath);
  const meta = await baseImage.metadata();
  if (!meta.width || !meta.height) fail(`Could not read image dimensions from ${basePath}.`);
  const canvas = { width: meta.width, height: meta.height };

  const surfaceId = typeof args.surface === 'string' ? args.surface : 'design';
  const aspect = Number(args.aspect ?? 1);
  if (!Number.isFinite(aspect) || aspect <= 0) fail('--aspect must be a positive number (w / h).');

  // Geometry: exactly one of --corners or --rect.
  let warp: Warp;
  if (typeof args.corners === 'string') {
    const [tl, tr, br, bl] = parsePoints(args.corners, 4);
    warp = { kind: 'homography', corners: quad(tl!, tr!, br!, bl!) };
  } else if (typeof args.rect === 'string') {
    const region = parseRect(args.rect);
    const cols = Number(args.cols ?? 12);
    const rows = Number(args.rows ?? 6);
    if (args.fabric) {
      warp = fabricMesh(region, { cols, rows });
    } else {
      const wrap = typeof args.cylinder === 'string' ? Number(args.cylinder) : 0.65;
      warp = cylinderMesh(region, { cols, rows, wrap });
    }
  } else {
    fail('Give either --corners "x,y x,y x,y x,y" (flat) or --rect "x,y w,h" (curved/fabric).');
  }

  const displacementScale = args.displacement !== undefined ? Number(args.displacement) : null;
  if (displacementScale !== null) {
    if (!Number.isFinite(displacementScale)) fail('--displacement wants a pixel amount, e.g. 14.');
    warp = {
      kind: 'displacement',
      geometry: warp.kind === 'displacement' ? warp.geometry : warp,
      map: `displace-${surfaceId}.png`,
      scale: displacementScale,
      vector: false,
    };
  }

  const outline =
    warp.kind === 'homography'
      ? quadPoints(warp.corners)
      : warp.kind === 'mesh'
        ? meshOutline(warp)
        : warp.geometry.kind === 'homography'
          ? quadPoints(warp.geometry.corners)
          : meshOutline(warp.geometry);
  const polygonPx = denormalize(outline, canvas.width, canvas.height);

  const recommendedWidth = Math.round(Number(args.width ?? 1400));
  const layers: Layer[] = [{ type: 'base', src: 'base.png' }];
  const files = new Map<string, Buffer>();

  files.set(
    'base.png',
    await sharp(basePath).flatten({ background: '#ffffff' }).png({ compressionLevel: 9 }).toBuffer(),
  );

  // --colorize "id:#rrggbb:x,y x,y x,y x,y"
  if (typeof args.colorize === 'string') {
    for (const spec of args.colorize.split(',,')) {
      const firstColon = spec.indexOf(':');
      const secondColon = spec.indexOf(':', firstColon + 1);
      if (firstColon < 0 || secondColon < 0) {
        fail('--colorize wants "id:#rrggbb:x,y x,y x,y x,y".');
      }
      const colorizeId = spec.slice(0, firstColon);
      const hex = spec.slice(firstColon + 1, secondColon);
      const region = parsePoints(spec.slice(secondColon + 1));
      const maskName = `mask-color-${colorizeId}.png`;
      files.set(
        maskName,
        await svgToPng(
          polygonMaskSvg(canvas, [denormalize(region, canvas.width, canvas.height)], 2),
        ),
      );
      layers.push({ type: 'colorize', id: colorizeId, mask: maskName, default: hex });
    }
  }

  const maskName = `mask-${surfaceId}.png`;
  files.set(maskName, await svgToPng(polygonMaskSvg(canvas, [polygonPx], Number(args.feather ?? 3))));

  const shadowName = `shadow-${surfaceId}.png`;
  const highlightName = `highlight-${surfaceId}.png`;
  files.set(
    shadowName,
    await svgToPng(
      shadowMapSvg(canvas, [polygonPx], {
        direction: warp.kind === 'homography' ? 'vertical' : 'horizontal',
        strength: Number(args.shadow ?? 0.35),
      }),
    ),
  );
  files.set(
    highlightName,
    await svgToPng(highlightMapSvg(canvas, [polygonPx], { strength: Number(args.highlight ?? 0.2) })),
  );

  if (warp.kind === 'displacement') {
    files.set(
      warp.map,
      await wrinklePng(
        { width: Math.round(canvas.width / 2), height: Math.round(canvas.height / 2) },
        { seed: Number(args.seed ?? 3) },
      ),
    );
  }

  layers.push({
    type: 'surface',
    id: surfaceId,
    ...(typeof args.label === 'string' ? { label: args.label } : {}),
    placeholder: {
      aspect,
      recommendedWidth,
      recommendedHeight: Math.round(recommendedWidth / aspect),
      hint: 'Place your design here, then click Render',
    },
    warp,
    lighting: {
      multiply: shadowName,
      multiplyOpacity: 1,
      screen: highlightName,
      screenOpacity: 1,
    },
    mask: maskName,
    opacity: 1,
    blend: 'normal',
  });

  // Preview: the photograph with the print area blocked in, matching what the
  // seed generator produces so imports look consistent.
  const previewPng = await sharp(files.get('base.png')!)
    .composite([
      {
        input: await svgToPng(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><polygon points="${polygonPx
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ')}" fill="#e8e8e8"/></svg>`,
        ),
        blend: 'over',
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  files.set('preview.png', previewPng);
  files.set('thumbnail.png', await thumbnail(previewPng, 480));

  const item = MockupItemSchema.parse({
    id,
    name: required(args, 'name'),
    category,
    viewpoint,
    tags: typeof args.tags === 'string' ? args.tags.split(',').map((t) => t.trim()) : [],
    canvas,
    thumbnail: 'thumbnail.png',
    preview: 'preview.png',
    layers,
  });

  if (args['dry-run']) {
    console.log(JSON.stringify(item, null, 2));
    console.log(`\n(dry run — would have written ${files.size + 1} files)`);
    return;
  }

  const outDir = path.resolve(
    typeof args.out === 'string' ? args.out : path.resolve('assets/items'),
    id,
  );
  await fs.mkdir(outDir, { recursive: true });
  for (const [name, buffer] of files) await fs.writeFile(path.join(outDir, name), buffer);
  await fs.writeFile(path.join(outDir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);

  console.log(`\n✓ Wrote ${files.size + 1} files to ${outDir}`);
  console.log(`  canvas ${canvas.width}x${canvas.height}, warp ${warp.kind}`);
  console.log('  Restart the API to pick it up, then:');
  console.log(`  npx tsx tools/render-sample.ts ${id}\n`);
}

await main();
