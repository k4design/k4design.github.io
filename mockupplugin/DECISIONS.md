# Decisions

Choices the build prompt left open, and why they landed where they did.
Newest sections first within each milestone.

## Repo and tooling

**npm workspaces, not pnpm.** pnpm is not installed on the target machine and
the dependency graph here is small (three packages). npm workspaces hoist and
symlink `@mf/shared` well enough, with no extra toolchain to install.

**Three packages: `packages/shared`, `apps/api`, `apps/plugin`.** Everything
that crosses a boundary — the item model, the HTTP contracts, the postMessage
protocol — lives in `@mf/shared` as Zod schemas, and both sides import the same
objects. There is no second copy of any contract to drift.

**TypeScript strict, plus `noUncheckedIndexedAccess`.** The warp code is dense
with array indexing (mesh grids, pixel buffers); unchecked index access is
exactly the class of bug that produces silently wrong geometry rather than a
crash.

## Rendering stack

**Node + Fastify + sharp, with the warp implemented in TypeScript.** The
alternative was Python/FastAPI with OpenCV, which gives `warpPerspective` and
`remap` for free. Node won because:

- one language across plugin and server means the item schema, the aspect-ratio
  tolerance rule and the placeholder maths are literally the same code, not two
  implementations that have to agree;
- OpenCV would be the only heavy native dependency, and the warp we need is a
  few hundred lines (homography solve + inverse-map sampling + piecewise affine
  over a triangulated mesh);
- sharp already covers everything else — decode, encode, resize, alpha
  compositing, blend modes — and is a well-behaved native dep on Fly/Render/
  Cloud Run.

The cost is that pixel loops run in JS rather than optimised C++. The warp
samples per output pixel over the surface's bounding box only, not the whole
canvas, which keeps a 3000px render inside the 4s p95 target. If that stops
holding, the sampling loop is the isolated hot spot to move to WASM.

**Inverse mapping, not forward splatting.** For every destination pixel the
renderer solves back to a source coordinate and samples bilinearly. Forward
mapping leaves holes wherever the transform stretches; inverse mapping cannot.

## API shape

**Base64 PNG in JSON, not multipart.** The plugin iframe already holds the
export as bytes and has to `JSON.stringify` the rest of the request anyway
(item id, surface ids, colorize hex values). One JSON body keeps the contract
Zod-validatable end to end, at the cost of ~33% upload inflation. Design
exports are typically well under 2 MB, and the cap is 16 MB decoded per
surface.

**`designs` is an array.** The prompt describes one surface per render. Items
can legitimately carry several (a laptop with screen + keyboard decal, a
two-sided business card), and rendering them in one pass avoids compositing the
same base photo repeatedly. Single-surface is just an array of one.

**Warp geometry never leaves the server.** `GET /items/:id` returns what the
plugin needs to build a correct design frame — placeholder aspect, recommended
pixel size, colorize defaults — and nothing else. Control points and asset
paths stay server-side, so the mockup library is not trivially scrapeable.

**Offset cursors.** The catalog is a static ordered list rebuilt at deploy
time, so pages cannot shift under a paginating client and there is nothing to
gain from keyset pagination.

**No accounts, no tokens.** Per the brief. CORS is wide open because the plugin
iframe has a null origin and cannot be allow-listed; since there are no
cookies, sessions or credentials anywhere in the system, that grants a browser
nothing a plain HTTP client did not already have. Abuse protection is
anonymous per-IP rate limiting on `/render` only.

## Plugin architecture

**Bindings live in `pluginData`, names are cosmetic.** Every link — item frame
to design frame, design frame to surface id, colorize swatch to layer id — is
stored with `setPluginData` under `mf:*` keys. Node names carry an `[MF]`
prefix for human recognition only; renaming or moving a node cannot break a
render.

**A render replaces an image fill, never a node.** The user's design frame is
theirs. The renderer only ever swaps the item frame's `fills` array, so a
re-render is non-destructive and the design stays editable.

**Aspect ratio is the contract, not pixels.** Users scale frames freely. The
placeholder declares an aspect; the recommended pixel size is only export
guidance. Drift beyond 2% raises a warning rather than refusing to render,
because a slightly-off ratio is usually intentional cropping.

**Both sides validate every message.** The sandbox can mutate the user's
document, so it treats iframe messages as untrusted input and Zod-parses them
before dispatch; the iframe does the same in reverse, since it also receives
unrelated `window.message` traffic.

**`localhost`, never `127.0.0.1`, in `allowedDomains`.** Figma's manifest
validator rejects IP-literal origins with "must be a valid URL", so the
loopback IP cannot be declared at all — which makes it useless as the plugin's
default API URL, however well it works from curl. The default is
`http://localhost:8787` and the API still binds to `127.0.0.1`; Chromium falls
back from `::1` to IPv4, and `HOST=::1` is the escape hatch if anything does not.

**Vite single-file build for the UI.** Figma loads the UI from one local HTML
file, so CSS and JS are inlined and code splitting is off. The sandbox bundle
is built separately with esbuild as an IIFE, because the sandbox has no DOM, no
`fetch` and no dynamic import — all network calls happen in the iframe and
cross to the sandbox as base64.

## Data model details

**All geometry is normalized to 0..1.** An item can then be re-rendered at any
output resolution without re-authoring, and `outputWidth` becomes a free
quality/speed dial.

**Mesh point-count validation is a helper, not a `.refine()`.** Zod 3's
discriminated unions only accept plain object schemas as members, so the
`(rows+1)*(cols+1)` check runs in `MockupItemSchema.superRefine` and is exported
as `meshPointCountError` for the authoring tool.

**`"blend": "multiply+screen split"` from the prompt became two layers.** A
single string encoding two blend passes is ambiguous to implement and to
validate. An item that needs both authors two overlay layers with explicit
`multiply` and `screen` blends, in draw order.

**Declaration order is draw order.** The brief's example item lists the surface
before the colorize layer, while its pipeline description composites colorize
first. Rather than pick one and hard-code an implicit ordering by layer type,
the renderer walks `layers` in the order the item declares them. The seed items
declare base → colorize → surface → overlay, which matches the described
pipeline, and an item that genuinely needs an overlay beneath a surface can say
so without a special case.

**Colorize is a ratio against the layer's authored default, not a multiply.** A
plain multiply can only darken, so a dark cap could never be recoloured white; a
plain replace discards the shading that makes the render look photographic. The
item already declares a `default` colour, so normalizing the masked pixels
against it and multiplying by the requested colour preserves shading as ratios
and works in both directions. Requesting the default is exactly the identity.

## Publishing

**Two build profiles, one source of truth for the origin.** The public origin
lives only in `manifest.production.json`'s first allowedDomains entry;
`build:prod` compiles it into both bundles as `__MF_API_BASE__`, so the
manifest and the code cannot disagree. Dev builds keep localhost and the
Settings URL field; production hides the field entirely, because the manifest
blocks every other origin anyway — a URL box that can only break the plugin is
not a feature. Stored config from older installs is normalized to the compiled
origin so nobody stays pinned to a dead one.

**The catalog bakes into the Docker image.** `catalog/store.ts` already
treats the catalog as immutable per deploy; baking the generated assets into
the image makes that literal — a deploy IS a catalog release, with no volume,
bucket, or cache invalidation to get wrong. Catalog updates never touch the
plugin, which matters because plugin changes trigger Community re-review and
server changes do not.

**Batches get a sibling rate limiter, not a nested one.** fastify hooks
inherit into child scopes, so nesting the batch limiter inside the still
limiter would double-bill every batch against the still budget. Verified: the
13th batch in a minute 429s while `/render` keeps answering.

**Width requests clamp instead of rejecting.** A client asking for 8000px
means "as sharp as possible"; on a public service the cap (3000 — the largest
catalog canvas) is what that means, and an error would just be a worse way to
say the same thing.

## Seed catalog

**Photography is generated, not sourced, and not committed.** The brief said
quality matters less than exercising every code path. Generating it from the same
constants that define the warp means the artwork, the alpha mask and the lighting
maps are all derived from one source of truth and cannot drift apart. Because
generation is deterministic, `assets/items/*/*.png` stays out of git and a fresh
clone runs `npm run seed` — verified to reproduce byte-identical output that
still matches the committed goldens.

**Wrinkle displacement is procedural, not SVG.** `feTurbulence` support varies
between rasterizers, and fabric detail needs directional creases rather than
plain noise. A small value-noise function with a deterministic hash gives
reproducible maps and creases that read as cloth.

## Testing

**Goldens are rendered at 600px, not full resolution.** Every code path — each
warp family, masks, lighting, colorize, overlays — runs identically at either
size, but 600px references are small enough to belong in git and to eyeball in a
review. Full-resolution goldens would be ~40 MB of binaries nobody inspects.

**The golden test card is drawn procedurally, with no text.** SVG text pulls in
host fonts, and a font substitution would change every reference on a different
machine. The pattern is chosen to make regressions visible rather than plausible:
a grid catches shear, distinct corner colours catch flips, and a diagonal catches
transposition.

**The comparison tolerates 0.2% of pixels differing by more than 6/255.**
libvips versions differ very slightly in resampling, so exact equality would fail
spuriously on a different machine. The threshold was checked against a real
regression: injecting a 3px offset into the homography sampler fails all six
homography items by 1.2–5.7% of pixels, three orders of magnitude clear of the
tolerance — and correctly leaves the four mesh items passing, since they do not
use that code path.

**A missing golden fails rather than silently passing.** The suite writes the
reference so it can be reviewed, then fails, because a test that invents its own
expected value on first run is not a test.

## Video

**Client-side pipeline, not server-side ffmpeg.** The milestone-7 scaffold went
the server route and stalled exactly where predicted: uploads, object storage,
job queue. The shipped design runs everything in the plugin UI iframe — decode
via `<video>` seeks, warp via `POST /render/batch`, encode via WASM — because
the iframe is a full browser context and the warp is per-frame stateless. The
server stays account-less and storage-less, and the clip never leaves the
user's machine except as design frames. The ffmpeg scaffold was deleted rather
than kept "just in case" (git history has it).

**WASM H.264, because WebCodecs does not exist in plugin iframes.** They are
not secure contexts. `h264-mp4-encoder` is the same library the sibling
frame-to-mp4 plugin proved inside Figma; its web build defines a script-scoped
`var HME`, so it is imported `?raw` and injected as a classic script tag —
under Vite's ESM the var would otherwise be module-scoped and invisible.

**The preview is the export.** Rather than a bespoke frame player, the pipeline
encodes immediately and plays the finished MP4 blob in a `<video>` element —
native scrubbing, looping and realtime playback for free, and "Download" saves
the identical bytes it previewed.

**Batching is a rate-limit and sampler decision, not a bandwidth one.**
30 frames per request means a 240-frame clip is 8 requests instead of 240
against a 30/min per-IP cap, and the mesh sampler (triangulation + index
raster) is solved once per batch. `renderSequence` is held to pixel-exact
agreement with `renderItem` by test, so the batch path cannot drift into being
a second renderer.

**Interleaved, not staged.** Decode → render → encode proceeds batch by batch,
so one batch of frames is the peak memory, not the whole clip.
