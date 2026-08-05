import {
  cylinderMesh,
  fabricMesh,
  meshOutline,
  pt,
  quad,
  quadPoints,
  rectQuad,
  svgPoints,
  warpGeometry,
  type Category,
  type Point,
  type Quad,
  type Viewpoint,
  type Warp,
} from '@mf/shared';
import type { Size, WrinkleOptions } from './raster.js';

/**
 * The ten seed items.
 *
 * Each spec declares its warp geometry *first* and then draws its product art
 * from those same numbers, so the artwork, the alpha mask and the warp can
 * never drift apart. The generator derives masks, lighting maps and
 * displacement maps from the geometry — nothing is hand-positioned twice.
 */

export interface SeedSurface {
  id: string;
  label: string;
  aspect: number;
  recommendedWidth: number;
  recommendedHeight: number;
  warp: Warp;
  /** Lighting maps to bake for this surface. */
  shadow?: { direction?: 'horizontal' | 'vertical' | 'radial'; strength?: number };
  highlight?: { strength?: number; sweep?: number };
  /** Feather radius for the alpha mask, in canvas pixels. */
  feather?: number;
  /** Present when the warp is `displacement`. */
  wrinkle?: WrinkleOptions & { size?: Size };
}

export interface SeedColorize {
  id: string;
  label: string;
  default: string;
  /** Normalized polygons defining the recolourable region. */
  regions: Point[][];
  feather?: number;
}

export interface SeedOverlay {
  name: string;
  blend: 'multiply' | 'screen' | 'normal' | 'overlay' | 'soft-light';
  opacity?: number;
  svg: string;
}

export interface SeedSpec {
  id: string;
  name: string;
  category: Category;
  viewpoint: Viewpoint;
  tags: string[];
  canvas: Size;
  surfaces: SeedSurface[];
  colorize?: SeedColorize[];
  /** Product photography beneath the design. */
  baseSvg: string;
  /** Layers composited above the warped design. */
  overlays?: SeedOverlay[];
  /**
   * How the surface region is drawn in the pre-render preview: a flat colour
   * standing in for "your design goes here".
   */
  emptyFill?: string;
}

/* ------------------------------------------------------------------ */
/* Drawing primitives                                                  */
/* ------------------------------------------------------------------ */

const P = (points: Point[], size: Size): string =>
  svgPoints(points.map((p) => pt(p.x * size.width, p.y * size.height)));

/** Normalized helpers, since every spec works in 0..1 and draws in pixels. */
const nx = (v: number, size: Size) => v * size.width;
const ny = (v: number, size: Size) => v * size.height;

function studioBackdrop(size: Size, hue: { top: string; bottom: string }): string {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="${hue.top}"/>
      <stop offset="1" stop-color="${hue.bottom}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="42%" r="72%">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.16"/>
    </radialGradient>
  </defs>
  <rect width="${size.width}" height="${size.height}" fill="url(#bg)"/>
  <rect width="${size.width}" height="${size.height}" fill="url(#vignette)"/>`;
}

/** Soft contact shadow beneath a product. */
function contactShadow(size: Size, cx: number, cy: number, rx: number, ry: number, opacity = 0.3): string {
  return `<ellipse cx="${nx(cx, size)}" cy="${ny(cy, size)}" rx="${nx(rx, size)}" ry="${ny(
    ry,
    size,
  )}" fill="#000000" opacity="${opacity}" filter="url(#shadowBlur)"/>`;
}

const SHADOW_BLUR_DEF = (size: Size) =>
  `<filter id="shadowBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.round(
    Math.min(size.width, size.height) * 0.022,
  )}"/></filter>`;

/** Polygon outline of any warp, in normalized space. */
export function surfacePolygon(warp: Warp): Point[] {
  const geometry = warpGeometry(warp);
  return geometry.kind === 'homography' ? quadPoints(geometry.corners) : meshOutline(geometry);
}

/* ------------------------------------------------------------------ */
/* 1. Phone, front                                                     */
/* ------------------------------------------------------------------ */

function phoneFront(): SeedSpec {
  const canvas: Size = { width: 2400, height: 3000 };
  // Screen rectangle drives the body: the bezel is a fixed inset around it.
  const screen = rectQuad(0.288, 0.086, 0.424, 0.828);
  const bezel = 0.0125;
  const body = {
    x: screen.tl.x - bezel,
    y: screen.tl.y - bezel * (canvas.width / canvas.height),
    w: screen.tr.x - screen.tl.x + bezel * 2,
    h: screen.bl.y - screen.tl.y + bezel * 2 * (canvas.width / canvas.height),
  };

  const bodyRect = `x="${nx(body.x, canvas)}" y="${ny(body.y, canvas)}" width="${nx(
    body.w,
    canvas,
  )}" height="${ny(body.h, canvas)}" rx="${nx(0.052, canvas)}"`;

  return {
    id: 'phone-front-01',
    name: 'Smartphone, Front',
    category: 'devices',
    viewpoint: 'front',
    tags: ['phone', 'mobile', 'screen', 'app', 'ios'],
    canvas,
    emptyFill: '#101318',
    surfaces: [
      {
        id: 'screen',
        label: 'Screen',
        aspect: 1179 / 2556,
        recommendedWidth: 1179,
        recommendedHeight: 2556,
        warp: { kind: 'homography', corners: screen },
        shadow: { direction: 'vertical', strength: 0.18 },
        highlight: { strength: 0.22, sweep: 0.24 },
        feather: 2,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#f2f4f7', bottom: '#dfe3ea' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stop-color="#3d4249"/>
          <stop offset="0.42" stop-color="#8f979f"/>
          <stop offset="0.5" stop-color="#c9ced4"/>
          <stop offset="0.58" stop-color="#8f979f"/>
          <stop offset="1" stop-color="#2f3439"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.5, 0.945, 0.24, 0.022, 0.34)}
      <rect ${bodyRect} fill="url(#metal)"/>
      <rect x="${nx(body.x + 0.006, canvas)}" y="${ny(body.y + 0.005, canvas)}" width="${nx(
        body.w - 0.012,
        canvas,
      )}" height="${ny(body.h - 0.01, canvas)}" rx="${nx(0.046, canvas)}" fill="#0b0d10"/>
      <polygon points="${P(quadPoints(screen), canvas)}" fill="#05070a"/>`,
    overlays: [
      {
        name: 'overlay-glass.png',
        blend: 'screen',
        opacity: 0.5,
        svg: `<defs><linearGradient id="glare" x1="0" y1="0" x2="0.7" y2="1">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/>
                <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.04"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(
                [screen.tl, pt(screen.tr.x, screen.tr.y), pt(screen.tl.x, screen.tl.y + 0.42)],
                canvas,
              )}" fill="url(#glare)"/>
              <rect x="${nx(screen.tl.x, canvas)}" y="${ny(screen.tl.y, canvas)}" width="${nx(
                screen.tr.x - screen.tl.x,
                canvas,
              )}" height="${ny(0.006, canvas)}" fill="#ffffff" opacity="0.12"/>`,
      },
      {
        name: 'overlay-notch.png',
        blend: 'normal',
        svg: `<rect x="${nx(0.44, canvas)}" y="${ny(0.098, canvas)}" width="${nx(
          0.12,
          canvas,
        )}" height="${ny(0.021, canvas)}" rx="${ny(0.0105, canvas)}" fill="#05070a"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 2. Phone, angled / floating                                         */
/* ------------------------------------------------------------------ */

function phoneAngled(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2400 };
  // A three-quarter view: the right edge is nearer, so it is taller.
  const screen = quad(pt(0.352, 0.152), pt(0.664, 0.088), pt(0.694, 0.836), pt(0.386, 0.928));
  const outset = (p: Point, dx: number, dy: number) => pt(p.x + dx, p.y + dy);
  const bodyPoly = [
    outset(screen.tl, -0.013, -0.014),
    outset(screen.tr, 0.013, -0.014),
    outset(screen.br, 0.013, 0.014),
    outset(screen.bl, -0.013, 0.014),
  ];

  return {
    id: 'phone-angled-01',
    name: 'Smartphone, Angled',
    category: 'devices',
    viewpoint: 'floating',
    tags: ['phone', 'mobile', 'screen', 'app', 'perspective'],
    canvas,
    emptyFill: '#0e1116',
    surfaces: [
      {
        id: 'screen',
        label: 'Screen',
        aspect: 1179 / 2556,
        recommendedWidth: 1179,
        recommendedHeight: 2556,
        warp: { kind: 'homography', corners: screen },
        shadow: { direction: 'horizontal', strength: 0.34 },
        highlight: { strength: 0.3, sweep: 0.2 },
        feather: 2.5,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#eceff4', bottom: '#cdd3dc' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#23272c"/>
          <stop offset="0.5" stop-color="#7c848d"/>
          <stop offset="1" stop-color="#33383e"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.53, 0.96, 0.22, 0.03, 0.28)}
      <polygon points="${P(bodyPoly, canvas)}" fill="url(#edge)"/>
      <polygon points="${P(quadPoints(screen), canvas)}" fill="#05070a"/>`,
    overlays: [
      {
        name: 'overlay-glass.png',
        blend: 'screen',
        opacity: 0.55,
        svg: `<defs><linearGradient id="glare" x1="0" y1="0" x2="1" y2="0.8">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.02"/>
                <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.3"/>
                <stop offset="0.52" stop-color="#ffffff" stop-opacity="0.05"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(quadPoints(screen), canvas)}" fill="url(#glare)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 3. Laptop, open                                                     */
/* ------------------------------------------------------------------ */

function laptopOpen(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2000 };
  // Lid leans back, so the top edge is narrower than the bottom.
  const screen = quad(pt(0.276, 0.118), pt(0.724, 0.118), pt(0.756, 0.652), pt(0.244, 0.652));
  const lid = [
    pt(screen.tl.x - 0.014, screen.tl.y - 0.026),
    pt(screen.tr.x + 0.014, screen.tr.y - 0.026),
    pt(screen.br.x + 0.016, screen.br.y + 0.03),
    pt(screen.bl.x - 0.016, screen.bl.y + 0.03),
  ];
  const deck = [pt(0.16, 0.688), pt(0.84, 0.688), pt(0.905, 0.79), pt(0.095, 0.79)];

  return {
    id: 'laptop-open-01',
    name: 'Laptop, Open',
    category: 'devices',
    viewpoint: 'angled',
    tags: ['laptop', 'macbook', 'screen', 'website', 'desktop'],
    canvas,
    emptyFill: '#12151a',
    surfaces: [
      {
        id: 'screen',
        label: 'Screen',
        aspect: 16 / 10,
        recommendedWidth: 2560,
        recommendedHeight: 1600,
        warp: { kind: 'homography', corners: screen },
        shadow: { direction: 'vertical', strength: 0.2 },
        highlight: { strength: 0.24, sweep: 0.18 },
        feather: 2,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#f4f5f8', bottom: '#d9dde4' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c3c8ce"/>
          <stop offset="1" stop-color="#9aa1a9"/>
        </linearGradient>
        <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b9bec5"/>
          <stop offset="1" stop-color="#e2e5e9"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.5, 0.815, 0.42, 0.035, 0.26)}
      <polygon points="${P(lid, canvas)}" fill="url(#alu)"/>
      <polygon points="${P(quadPoints(screen), canvas)}" fill="#05070a"/>
      <polygon points="${P(deck, canvas)}" fill="url(#deck)"/>
      <rect x="${nx(0.42, canvas)}" y="${ny(0.694, canvas)}" width="${nx(0.16, canvas)}" height="${ny(
        0.012,
        canvas,
      )}" rx="${ny(0.006, canvas)}" fill="#9aa1a9" opacity="0.7"/>`,
    overlays: [
      {
        name: 'overlay-glass.png',
        blend: 'screen',
        opacity: 0.42,
        svg: `<defs><linearGradient id="glare" x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.24"/>
                <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.03"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(quadPoints(screen), canvas)}" fill="url(#glare)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 4. Ceramic mug — mesh + colorize                                    */
/* ------------------------------------------------------------------ */

function ceramicMug(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2250 };
  const bodyLeft = 0.335;
  const bodyRight = 0.635;
  const bodyTop = 0.235;
  const bodyBottom = 0.775;

  // The printable area insets from the mug's silhouette.
  const label = rectQuad(bodyLeft + 0.028, bodyTop + 0.075, bodyRight - bodyLeft - 0.056, 0.375);
  const mesh = cylinderMesh(label, { cols: 14, rows: 6, wrap: 0.66, edgeCurve: 0.026 });

  const bodyPoly: Point[] = [
    pt(bodyLeft, bodyTop),
    pt(bodyRight, bodyTop),
    pt(bodyRight - 0.014, bodyBottom),
    pt(bodyLeft + 0.014, bodyBottom),
  ];

  return {
    id: 'mug-ceramic-front-01',
    name: 'Ceramic Mug, Front View',
    category: 'packaging',
    viewpoint: 'front',
    tags: ['mug', 'cup', 'ceramic', 'coffee', 'merch', 'curved'],
    canvas,
    emptyFill: '#e8e9ec',
    surfaces: [
      {
        id: 'design',
        label: 'Wrap',
        aspect: 1024 / 768,
        recommendedWidth: 1024,
        recommendedHeight: 768,
        warp: mesh,
        shadow: { direction: 'horizontal', strength: 0.5 },
        highlight: { strength: 0.26, sweep: 0.3 },
        feather: 4,
      },
    ],
    colorize: [
      {
        id: 'mugColor',
        label: 'Mug body',
        default: '#ffffff',
        regions: [bodyPoly],
        feather: 3,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#f7f6f4', bottom: '#e4e1dc' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="ceramic" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c9c9cd"/>
          <stop offset="0.16" stop-color="#f4f4f6"/>
          <stop offset="0.45" stop-color="#ffffff"/>
          <stop offset="0.82" stop-color="#e2e2e6"/>
          <stop offset="1" stop-color="#b9b9bf"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.49, 0.79, 0.17, 0.026, 0.3)}
      <!-- handle sits behind the body so the body edge stays clean -->
      <path d="M ${nx(bodyRight - 0.004, canvas)} ${ny(0.36, canvas)}
               C ${nx(0.755, canvas)} ${ny(0.335, canvas)}, ${nx(0.765, canvas)} ${ny(0.63, canvas)}, ${nx(
                 bodyRight - 0.008,
                 canvas,
               )} ${ny(0.6, canvas)}"
            fill="none" stroke="#dcdce0" stroke-width="${nx(0.028, canvas)}" stroke-linecap="round"/>
      <path d="M ${nx(bodyLeft, canvas)} ${ny(bodyTop, canvas)}
               L ${nx(bodyRight, canvas)} ${ny(bodyTop, canvas)}
               L ${nx(bodyRight - 0.014, canvas)} ${ny(bodyBottom, canvas)}
               Q ${nx(0.485, canvas)} ${ny(bodyBottom + 0.022, canvas)}, ${nx(
                 bodyLeft + 0.014,
                 canvas,
               )} ${ny(bodyBottom, canvas)} Z"
            fill="url(#ceramic)"/>
      <ellipse cx="${nx((bodyLeft + bodyRight) / 2, canvas)}" cy="${ny(bodyTop, canvas)}" rx="${nx(
        (bodyRight - bodyLeft) / 2,
        canvas,
      )}" ry="${ny(0.032, canvas)}" fill="#e9e9ed"/>
      <ellipse cx="${nx((bodyLeft + bodyRight) / 2, canvas)}" cy="${ny(bodyTop + 0.004, canvas)}" rx="${nx(
        (bodyRight - bodyLeft) / 2 - 0.014,
        canvas,
      )}" ry="${ny(0.024, canvas)}" fill="#4a3a30" opacity="0.85"/>`,
    overlays: [
      {
        name: 'overlay-sheen.png',
        blend: 'screen',
        opacity: 0.4,
        svg: `<defs><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="0.2" stop-color="#ffffff" stop-opacity="0.34"/>
                <stop offset="0.34" stop-color="#ffffff" stop-opacity="0.02"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(bodyPoly, canvas)}" fill="url(#sheen)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 5. Bottle label — mesh + colorize cap                               */
/* ------------------------------------------------------------------ */

function bottleLabel(): SeedSpec {
  const canvas: Size = { width: 2250, height: 3000 };
  const label = rectQuad(0.352, 0.402, 0.296, 0.286);
  const mesh = cylinderMesh(label, { cols: 14, rows: 5, wrap: 0.7, edgeCurve: 0.012 });
  const capPoly: Point[] = [pt(0.428, 0.072), pt(0.572, 0.072), pt(0.568, 0.163), pt(0.432, 0.163)];

  return {
    id: 'bottle-label-01',
    name: 'Glass Bottle with Label',
    category: 'packaging',
    viewpoint: 'front',
    tags: ['bottle', 'label', 'drink', 'glass', 'curved', 'packaging'],
    canvas,
    emptyFill: '#f0efec',
    surfaces: [
      {
        id: 'label',
        label: 'Label',
        aspect: 1000 / 1000,
        recommendedWidth: 1200,
        recommendedHeight: 1200,
        warp: mesh,
        shadow: { direction: 'horizontal', strength: 0.46 },
        highlight: { strength: 0.3, sweep: 0.26 },
        feather: 3,
      },
    ],
    colorize: [
      { id: 'capColor', label: 'Cap', default: '#2f3a44', regions: [capPoly], feather: 2 },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#f3f5f6', bottom: '#dfe4e6' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#9fb3ae"/>
          <stop offset="0.18" stop-color="#d6e2de"/>
          <stop offset="0.46" stop-color="#eef4f2"/>
          <stop offset="0.8" stop-color="#c3d2cd"/>
          <stop offset="1" stop-color="#87999a"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.5, 0.905, 0.13, 0.018, 0.3)}
      <path d="M ${nx(0.44, canvas)} ${ny(0.1, canvas)}
               L ${nx(0.56, canvas)} ${ny(0.1, canvas)}
               L ${nx(0.56, canvas)} ${ny(0.24, canvas)}
               C ${nx(0.6, canvas)} ${ny(0.3, canvas)}, ${nx(0.652, canvas)} ${ny(0.33, canvas)}, ${nx(
                 0.652,
                 canvas,
               )} ${ny(0.4, canvas)}
               L ${nx(0.652, canvas)} ${ny(0.86, canvas)}
               Q ${nx(0.652, canvas)} ${ny(0.895, canvas)}, ${nx(0.617, canvas)} ${ny(0.895, canvas)}
               L ${nx(0.383, canvas)} ${ny(0.895, canvas)}
               Q ${nx(0.348, canvas)} ${ny(0.895, canvas)}, ${nx(0.348, canvas)} ${ny(0.86, canvas)}
               L ${nx(0.348, canvas)} ${ny(0.4, canvas)}
               C ${nx(0.348, canvas)} ${ny(0.33, canvas)}, ${nx(0.4, canvas)} ${ny(0.3, canvas)}, ${nx(
                 0.44,
                 canvas,
               )} ${ny(0.24, canvas)} Z"
            fill="url(#glass)"/>
      <polygon points="${P(capPoly, canvas)}" fill="#39434d"/>
      <!-- paper the label sits on, so an unrendered bottle still reads correctly -->
      <polygon points="${P(meshOutline(mesh), canvas)}" fill="#f6f5f2"/>`,
    overlays: [
      {
        name: 'overlay-sheen.png',
        blend: 'screen',
        opacity: 0.45,
        svg: `<defs><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0.1" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="0.24" stop-color="#ffffff" stop-opacity="0.4"/>
                <stop offset="0.36" stop-color="#ffffff" stop-opacity="0.03"/>
                <stop offset="0.86" stop-color="#ffffff" stop-opacity="0.14"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <rect x="${nx(0.348, canvas)}" y="${ny(0.24, canvas)}" width="${nx(
                0.304,
                canvas,
              )}" height="${ny(0.655, canvas)}" fill="url(#sheen)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 6. T-shirt — displacement + colorize                                */
/* ------------------------------------------------------------------ */

function tshirtFlatlay(): SeedSpec {
  const canvas: Size = { width: 3000, height: 3000 };
  const chest = rectQuad(0.352, 0.318, 0.296, 0.33);
  const mesh = fabricMesh(chest, { cols: 10, rows: 10, sag: 0.022, drift: 0.009 });
  const shirtPoly: Point[] = [
    pt(0.318, 0.202),
    pt(0.395, 0.166),
    pt(0.45, 0.208),
    pt(0.55, 0.208),
    pt(0.605, 0.166),
    pt(0.682, 0.202),
    pt(0.79, 0.318),
    pt(0.712, 0.396),
    pt(0.7, 0.83),
    pt(0.3, 0.83),
    pt(0.288, 0.396),
    pt(0.21, 0.318),
  ];

  return {
    id: 'tshirt-flatlay-01',
    name: 'T-Shirt, Flat Lay',
    category: 'apparel',
    viewpoint: 'flat-lay',
    tags: ['tshirt', 'shirt', 'apparel', 'merch', 'fabric', 'print'],
    canvas,
    emptyFill: '#dcdcdc',
    surfaces: [
      {
        id: 'chest',
        label: 'Chest print',
        aspect: 1,
        recommendedWidth: 1400,
        recommendedHeight: 1400,
        warp: { kind: 'displacement', geometry: mesh, map: 'displace-chest.png', scale: 16, vector: false },
        shadow: { direction: 'radial', strength: 0.34 },
        highlight: { strength: 0.16, sweep: 0.34 },
        feather: 6,
        wrinkle: { seed: 7, scale: 7, octaves: 5, contrast: 0.7, creaseAngle: 1.1, creaseStrength: 0.4, creaseFrequency: 7 },
      },
    ],
    colorize: [
      { id: 'shirtColor', label: 'Shirt', default: '#f4f4f4', regions: [shirtPoly], feather: 4 },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#eceae6', bottom: '#dad6d0' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="cotton" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.5" stop-color="#f3f3f3"/>
          <stop offset="1" stop-color="#dedede"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.5, 0.845, 0.24, 0.026, 0.22)}
      <polygon points="${P(shirtPoly, canvas)}" fill="url(#cotton)"/>
      <path d="M ${nx(0.45, canvas)} ${ny(0.208, canvas)} Q ${nx(0.5, canvas)} ${ny(
        0.256,
        canvas,
      )}, ${nx(0.55, canvas)} ${ny(0.208, canvas)}" fill="none" stroke="#cfcfcf" stroke-width="${nx(
        0.007,
        canvas,
      )}"/>`,
    overlays: [
      {
        name: 'overlay-folds.png',
        blend: 'multiply',
        opacity: 0.42,
        svg: `<defs><linearGradient id="fold" x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0" stop-color="#ffffff"/>
                <stop offset="0.3" stop-color="#c9c9c9"/>
                <stop offset="0.42" stop-color="#ffffff"/>
                <stop offset="0.7" stop-color="#d4d4d4"/>
                <stop offset="1" stop-color="#ffffff"/>
              </linearGradient>
              <filter id="soften"><feGaussianBlur stdDeviation="${Math.round(canvas.width * 0.01)}"/></filter></defs>
              <rect width="${canvas.width}" height="${canvas.height}" fill="#ffffff"/>
              <g filter="url(#soften)"><polygon points="${P(shirtPoly, canvas)}" fill="url(#fold)"/></g>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 7. Tote bag — displacement + colorize                               */
/* ------------------------------------------------------------------ */

function toteBag(): SeedSpec {
  const canvas: Size = { width: 2400, height: 3000 };
  const panel = rectQuad(0.332, 0.412, 0.336, 0.29);
  const mesh = fabricMesh(panel, { cols: 10, rows: 8, sag: 0.014, drift: 0.006 });
  const bagPoly: Point[] = [pt(0.28, 0.318), pt(0.72, 0.318), pt(0.745, 0.845), pt(0.255, 0.845)];

  return {
    id: 'tote-bag-front-01',
    name: 'Canvas Tote Bag',
    category: 'apparel',
    viewpoint: 'front',
    tags: ['tote', 'bag', 'canvas', 'merch', 'fabric', 'eco'],
    canvas,
    emptyFill: '#ded6c6',
    surfaces: [
      {
        id: 'front',
        label: 'Front panel',
        aspect: 1,
        recommendedWidth: 1200,
        recommendedHeight: 1200,
        warp: { kind: 'displacement', geometry: mesh, map: 'displace-front.png', scale: 11, vector: false },
        shadow: { direction: 'radial', strength: 0.3 },
        highlight: { strength: 0.14, sweep: 0.3 },
        feather: 5,
        wrinkle: { seed: 21, scale: 9, octaves: 4, contrast: 0.6, creaseAngle: 0.35, creaseStrength: 0.3, creaseFrequency: 11 },
      },
    ],
    colorize: [
      { id: 'bagColor', label: 'Canvas', default: '#e5dcc9', regions: [bagPoly], feather: 3 },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#f0eee9', bottom: '#dcd8d1' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="canvasfab" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stop-color="#d8cfba"/>
          <stop offset="0.4" stop-color="#eee6d5"/>
          <stop offset="1" stop-color="#cdc3ad"/>
        </linearGradient>
      </defs>
      ${contactShadow(canvas, 0.5, 0.858, 0.23, 0.02, 0.26)}
      <path d="M ${nx(0.37, canvas)} ${ny(0.322, canvas)}
               C ${nx(0.372, canvas)} ${ny(0.17, canvas)}, ${nx(0.472, canvas)} ${ny(0.17, canvas)}, ${nx(
                 0.472,
                 canvas,
               )} ${ny(0.322, canvas)}"
            fill="none" stroke="#cfc5ae" stroke-width="${nx(0.022, canvas)}" stroke-linecap="round"/>
      <path d="M ${nx(0.528, canvas)} ${ny(0.322, canvas)}
               C ${nx(0.528, canvas)} ${ny(0.17, canvas)}, ${nx(0.628, canvas)} ${ny(0.17, canvas)}, ${nx(
                 0.63,
                 canvas,
               )} ${ny(0.322, canvas)}"
            fill="none" stroke="#cfc5ae" stroke-width="${nx(0.022, canvas)}" stroke-linecap="round"/>
      <polygon points="${P(bagPoly, canvas)}" fill="url(#canvasfab)"/>
      <rect x="${nx(0.28, canvas)}" y="${ny(0.318, canvas)}" width="${nx(0.44, canvas)}" height="${ny(
        0.016,
        canvas,
      )}" fill="#c6bca5" opacity="0.8"/>`,
    overlays: [
      {
        name: 'overlay-folds.png',
        blend: 'multiply',
        opacity: 0.38,
        svg: `<defs><linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#bfbfbf"/>
                <stop offset="0.22" stop-color="#ffffff"/>
                <stop offset="0.55" stop-color="#e8e8e8"/>
                <stop offset="0.8" stop-color="#ffffff"/>
                <stop offset="1" stop-color="#c4c4c4"/>
              </linearGradient>
              <filter id="soften"><feGaussianBlur stdDeviation="${Math.round(canvas.width * 0.012)}"/></filter></defs>
              <rect width="${canvas.width}" height="${canvas.height}" fill="#ffffff"/>
              <g filter="url(#soften)"><polygon points="${P(bagPoly, canvas)}" fill="url(#fold)"/></g>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 8. Framed poster on a wall                                          */
/* ------------------------------------------------------------------ */

function posterWall(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2250 };
  // Slight perspective: the wall recedes to the right.
  const art = quad(pt(0.318, 0.148), pt(0.672, 0.196), pt(0.672, 0.828), pt(0.318, 0.876));
  const frame = [
    pt(art.tl.x - 0.016, art.tl.y - 0.022),
    pt(art.tr.x + 0.016, art.tr.y - 0.022),
    pt(art.br.x + 0.016, art.br.y + 0.022),
    pt(art.bl.x - 0.016, art.bl.y + 0.022),
  ];

  return {
    id: 'poster-wall-01',
    name: 'Framed Poster on Wall',
    category: 'print',
    viewpoint: 'scene',
    tags: ['poster', 'frame', 'print', 'wall', 'art', 'a2'],
    canvas,
    emptyFill: '#e9e6e1',
    surfaces: [
      {
        id: 'art',
        label: 'Artwork',
        aspect: 2 / 3,
        recommendedWidth: 1600,
        recommendedHeight: 2400,
        warp: { kind: 'homography', corners: art },
        shadow: { direction: 'horizontal', strength: 0.22 },
        highlight: { strength: 0.12, sweep: 0.22 },
        feather: 2,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#efece7', bottom: '#ded9d2' })}
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0.1">
          <stop offset="0" stop-color="#8a6a4b"/>
          <stop offset="0.5" stop-color="#b28c64"/>
          <stop offset="1" stop-color="#7d5f43"/>
        </linearGradient>
      </defs>
      <ellipse cx="${nx(0.52, canvas)}" cy="${ny(0.52, canvas)}" rx="${nx(0.21, canvas)}" ry="${ny(
        0.39,
        canvas,
      )}" fill="#000000" opacity="0.16" filter="url(#shadowBlur)"/>
      <polygon points="${P(frame, canvas)}" fill="url(#wood)"/>
      <polygon points="${P(quadPoints(art), canvas)}" fill="#f6f4f0"/>`,
    overlays: [
      {
        name: 'overlay-glass.png',
        blend: 'screen',
        opacity: 0.28,
        svg: `<defs><linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
                <stop offset="0.35" stop-color="#ffffff" stop-opacity="0.02"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(quadPoints(art), canvas)}" fill="url(#glare)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 9. Business cards — two surfaces                                    */
/* ------------------------------------------------------------------ */

function businessCards(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2250 };
  // Two cards at slightly different angles, front and back.
  const front = quad(pt(0.208, 0.316), pt(0.512, 0.246), pt(0.556, 0.6), pt(0.252, 0.67));
  const back = quad(pt(0.488, 0.404), pt(0.792, 0.35), pt(0.826, 0.706), pt(0.522, 0.76));

  return {
    id: 'business-card-flatlay-01',
    name: 'Business Cards, Flat Lay',
    category: 'branding',
    viewpoint: 'flat-lay',
    tags: ['business card', 'stationery', 'branding', 'print', 'identity'],
    canvas,
    emptyFill: '#f2f1ee',
    surfaces: [
      {
        id: 'front',
        label: 'Front',
        aspect: 85 / 55,
        recommendedWidth: 1063,
        recommendedHeight: 688,
        warp: { kind: 'homography', corners: front },
        shadow: { direction: 'horizontal', strength: 0.16 },
        highlight: { strength: 0.1, sweep: 0.26 },
        feather: 2,
      },
      {
        id: 'back',
        label: 'Back',
        aspect: 85 / 55,
        recommendedWidth: 1063,
        recommendedHeight: 688,
        warp: { kind: 'homography', corners: back },
        shadow: { direction: 'horizontal', strength: 0.2 },
        highlight: { strength: 0.1, sweep: 0.3 },
        feather: 2,
      },
    ],
    baseSvg: `
      ${studioBackdrop(canvas, { top: '#eae7e1', bottom: '#d5d1ca' })}
      <defs>${SHADOW_BLUR_DEF(canvas)}</defs>
      <g opacity="0.28" filter="url(#shadowBlur)">
        <polygon points="${P(
          quadPoints(front).map((p) => pt(p.x + 0.006, p.y + 0.012)),
          canvas,
        )}" fill="#000000"/>
        <polygon points="${P(
          quadPoints(back).map((p) => pt(p.x + 0.006, p.y + 0.012)),
          canvas,
        )}" fill="#000000"/>
      </g>
      <polygon points="${P(quadPoints(front), canvas)}" fill="#fbfaf8"/>
      <polygon points="${P(quadPoints(back), canvas)}" fill="#fbfaf8"/>`,
    overlays: [
      {
        name: 'overlay-paper.png',
        blend: 'multiply',
        opacity: 0.3,
        svg: `<defs><linearGradient id="grain" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffffff"/>
                <stop offset="0.6" stop-color="#ededed"/>
                <stop offset="1" stop-color="#dedede"/>
              </linearGradient></defs>
              <rect width="${canvas.width}" height="${canvas.height}" fill="#ffffff"/>
              <polygon points="${P(quadPoints(front), canvas)}" fill="url(#grain)"/>
              <polygon points="${P(quadPoints(back), canvas)}" fill="url(#grain)"/>`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 10. Billboard                                                       */
/* ------------------------------------------------------------------ */

function billboard(): SeedSpec {
  const canvas: Size = { width: 3000, height: 2000 };
  // Strong perspective — the left edge is much nearer than the right.
  const face = quad(pt(0.116, 0.196), pt(0.83, 0.324), pt(0.83, 0.712), pt(0.116, 0.742));
  const frame = [
    pt(face.tl.x - 0.012, face.tl.y - 0.026),
    pt(face.tr.x + 0.012, face.tr.y - 0.026),
    pt(face.br.x + 0.012, face.br.y + 0.026),
    pt(face.bl.x - 0.012, face.bl.y + 0.026),
  ];

  return {
    id: 'billboard-street-01',
    name: 'Street Billboard',
    category: 'print',
    viewpoint: 'scene',
    tags: ['billboard', 'ooh', 'outdoor', 'advertising', 'street', 'large format'],
    canvas,
    emptyFill: '#dfe3e6',
    surfaces: [
      {
        id: 'face',
        label: 'Billboard face',
        aspect: 48 / 14,
        recommendedWidth: 2400,
        recommendedHeight: 700,
        warp: { kind: 'homography', corners: face },
        shadow: { direction: 'horizontal', strength: 0.28 },
        highlight: { strength: 0.14, sweep: 0.16 },
        feather: 3,
      },
    ],
    baseSvg: `
      <defs>
        ${SHADOW_BLUR_DEF(canvas)}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7fa8cd"/>
          <stop offset="0.62" stop-color="#c3d6e5"/>
          <stop offset="1" stop-color="#e4ebef"/>
        </linearGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5b6266"/>
          <stop offset="0.5" stop-color="#868e93"/>
          <stop offset="1" stop-color="#4e555a"/>
        </linearGradient>
      </defs>
      <rect width="${canvas.width}" height="${canvas.height}" fill="url(#sky)"/>
      <rect x="0" y="${ny(0.78, canvas)}" width="${canvas.width}" height="${ny(
        0.22,
        canvas,
      )}" fill="#6f7478"/>
      <rect x="0" y="${ny(0.78, canvas)}" width="${canvas.width}" height="${ny(
        0.008,
        canvas,
      )}" fill="#8d9296"/>
      <rect x="${nx(0.3, canvas)}" y="${ny(0.71, canvas)}" width="${nx(0.036, canvas)}" height="${ny(
        0.29,
        canvas,
      )}" fill="url(#steel)"/>
      <rect x="${nx(0.62, canvas)}" y="${ny(0.72, canvas)}" width="${nx(0.03, canvas)}" height="${ny(
        0.28,
        canvas,
      )}" fill="url(#steel)"/>
      <polygon points="${P(frame, canvas)}" fill="url(#steel)"/>
      <polygon points="${P(quadPoints(face), canvas)}" fill="#e7ebee"/>`,
    overlays: [
      {
        name: 'overlay-sun.png',
        blend: 'screen',
        opacity: 0.34,
        svg: `<defs><linearGradient id="sun" x1="0" y1="0" x2="1" y2="0.3">
                <stop offset="0" stop-color="#fff4dc" stop-opacity="0.34"/>
                <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.04"/>
                <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient></defs>
              <polygon points="${P(quadPoints(face), canvas)}" fill="url(#sun)"/>`,
      },
    ],
  };
}

export const SEED_SPECS: SeedSpec[] = [
  phoneFront(),
  phoneAngled(),
  laptopOpen(),
  ceramicMug(),
  bottleLabel(),
  tshirtFlatlay(),
  toteBag(),
  posterWall(),
  businessCards(),
  billboard(),
];

/** Re-exported so the generator can build masks without importing geometry twice. */
export { quadPoints, meshOutline, type Quad };
