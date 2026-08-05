# Claude Code Build Prompt: Figma Mockup Rendering Plugin

You are building a production-grade Figma plugin called **Mockup Forge** (working title). It lets designers browse a library of product mockups (devices, apparel, packaging, print, branding), import a mockup item onto their Figma canvas, drop their own design into a placeholder frame, and click one button to render their artwork realistically warped onto the product surface. Think smart-object compositing, but living entirely inside Figma with server-side rendering.

Build the full system: the Figma plugin (UI + sandbox code), the rendering backend, and the catalog service. Work in a monorepo. Ask me clarifying questions only if something below is genuinely ambiguous; otherwise make sensible decisions and document them in a DECISIONS.md.

---

## 1. Architecture overview

Three components:

1. **Figma plugin** — TypeScript. Split per Figma's architecture:
   - `code.ts` (main thread / sandbox): all canvas operations — node creation, frame exports, image fills, selection handling, clientStorage.
   - `ui.html` + `ui.tsx` (iframe): the library browser, auth screens, render controls. React + Vite. Communicates with the sandbox via `postMessage`.
   - `manifest.json` with `networkAccess.allowedDomains` scoped to our API and CDN only.
2. **Rendering API** — Node (Fastify) or Python (FastAPI), your call. Receives the user's flattened design as PNG bytes plus a mockup item ID, composites it onto the product photo using that item's warp definition, returns the rendered PNG.
3. **Catalog service + CDN** — serves the mockup library: item metadata (JSON), thumbnails, base photography layers, warp/displacement assets. Can be the same API service with a CDN in front; keep the data model clean enough to split later.

---

## 2. The mockup item data model (this is the heart of the product)

Each mockup item is a package of layered assets plus render instructions:

```
{
  "id": "mug-ceramic-front-01",
  "name": "Ceramic Mug, Front View",
  "category": "packaging",        // devices | apparel | packaging | print | branding
  "viewpoint": "front",           // front | angled | flat-lay | in-hand | floating | scene
  "canvas": { "width": 3000, "height": 2250 },   // full-res render size
  "layers": [
    { "type": "base",     "src": "base.png" },            // product photo
    { "type": "surface",  "id": "design",  ... },          // renderable — see below
    { "type": "colorize", "id": "mugColor", "mask": "body-mask.png", "default": "#FFFFFF" },
    { "type": "overlay",  "src": "shadows-highlights.png", "blend": "multiply+screen split" }
  ]
}
```

A **surface layer** is a renderable region and carries its warp definition:

- `placeholder`: aspect ratio + recommended pixel size for the user's design frame (e.g. 1024×768).
- `warp`: one of:
  - `homography` — 4-point perspective transform (flat surfaces: phone screens, posters, business cards).
  - `mesh` — an N×M grid mesh warp (curved/soft surfaces: mugs, bottles, t-shirts, flags). Store the mesh as normalized control points.
  - `displacement` — mesh or homography plus a grayscale displacement map for fabric wrinkles and texture.
- `lighting`: optional multiply and screen maps applied after the warp so the design inherits the photo's shadows and highlights.
- `mask`: alpha mask clipping the warped design to the visible surface.

Ship **10 seed items** covering all warp types so the pipeline is provable end to end: phone (front + angled), laptop, mug, t-shirt, tote bag, bottle label, poster, business card, billboard. Generate or source placeholder photography — quality matters less than exercising every code path. Include a small authoring script (`tools/author-item.ts`) that lets me define the 4 corner points or mesh grid over a base photo and spits out the item JSON.

## 3. Plugin UX and canvas mechanics

**Library browser (iframe UI):**
- Grid of thumbnails, infinite scroll, fetched from the catalog API.
- Search by name; filter dropdowns for category and viewpoint.
- Clicking a tile imports the item.

**Import behavior (sandbox):**
- Fetch the item's base render (a flattened preview PNG at working resolution) and place it as a frame named `[MF] Mug Ceramic Front 01`.
- For each surface layer, create a companion **design frame** next to the item, sized to the placeholder aspect ratio, named `[MF] Design → mug-ceramic-front-01 / design`, with a light checkerboard fill and a text hint layer ("Place your design here, then click Render").
- For each colorize layer, create a small swatch rectangle the user can recolor; read its fill at render time.
- Store the binding between item instance and its frames in `setPluginData` on the nodes (item ID, surface ID, instance GUID) so renaming or moving nodes doesn't break the link.

**Render flow:**
1. User selects a design frame (or the item frame — resolve either direction via pluginData).
2. Sandbox exports the design frame: `exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: recommendedWidth } })`.
3. UI posts the bytes + item ID + surface ID + colorize values to `POST /render`.
4. Show progress state in the UI (this can take a few seconds).
5. On response, sandbox swaps the item frame's image fill with the returned render. Never destroy the user's design frame — it stays editable for re-renders.
6. Support **Render Selected Frame** (single) and **Render All in Selection** (batch).

**Resize tolerance:** users will scale item frames and design frames. Render must key off aspect ratio, not absolute pixels — validate aspect ratio within a small tolerance and warn in the UI if the design frame's ratio has drifted from the placeholder ratio.

**No accounts:** the plugin requires no login, signup, or user accounts of any kind. All catalog and render endpoints are open. Do not build auth screens, token storage, session handling, or entitlement checks. If the API needs basic abuse protection, use anonymous rate limiting by IP only.

## 4. Rendering backend

`POST /render` pipeline (use `sharp` + custom WASM/canvas warp, or Python with OpenCV — your call, document the choice):

1. Validate the request payload (item exists, PNG within size limits).
2. Load item assets from storage (cache hot items in memory).
3. Warp the user PNG per the surface's warp definition (homography via perspective transform; mesh via piecewise triangulated affine warp; apply displacement map if present).
4. Apply the surface alpha mask.
5. Apply lighting: multiply the shadow map, screen the highlight map over the warped design only.
6. Composite: base photo → colorize layers (tint masked regions to requested hex, preserving luminosity) → warped design(s) → overlay layers.
7. Return PNG. Target < 4s p95 for a 3000px canvas; include a `renderId` for logging.

Also expose:
- `GET /catalog?category=&viewpoint=&q=&cursor=` — paged item metadata + thumbnail URLs.
- `GET /items/:id` — full item definition (minus raw warp assets; those stay server-side).

## 5. Video mockups (phase 2, scaffold now)

Design the surface/warp model so a video source is a drop-in: same warp per frame. Scaffold `POST /render/video` that accepts an MP4 upload, applies the warp frame-by-frame (ffmpeg pipeline), and returns a download URL for MP4/WEBM. In the plugin, since Figma can't play video on canvas, the UI presents a preview thumbnail + download link. Do not fully build this yet — stub the endpoint, write the ffmpeg pipeline behind a feature flag, and leave a TODO doc.

## 6. Quality bar and non-negotiables

- TypeScript strict mode everywhere. Zod-validate every API boundary and every postMessage payload.
- The plugin must never lose user work: renders replace fills, never delete or overwrite user frames.
- Graceful failure states in the UI: offline, render timeout, aspect-ratio mismatch, oversized upload.
- Unit tests for the warp math (known homography in/out fixtures) and an integration test that renders all 10 seed items and diff-checks against golden images.
- README with local dev setup: run API locally, load plugin via Figma's "import from manifest," seed the catalog.
- Keep the catalog and rendering stateless enough to deploy on Fly.io/Render/Cloud Run with object storage (S3-compatible) for assets.

## 7. Milestones (work in this order, commit per milestone)

1. Monorepo scaffold, manifest, empty plugin loads in Figma with hello-world UI ↔ sandbox messaging.
2. Catalog API + seed items + library browser with search/filter.
3. Import mechanics: item frame + bound design frames + pluginData linking.
4. Render pipeline for homography surfaces (phone, poster, business card) end to end.
5. Mesh + displacement warps (mug, t-shirt, tote), colorize layers, lighting maps.
6. Batch render, resize tolerance + UI warnings, anonymous rate limiting.
7. Golden-image test suite, error states, README, video-render scaffold.

Start with milestone 1. At the end of each milestone, summarize what was built, what deviated from this spec and why, and what's next.
