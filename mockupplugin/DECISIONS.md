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

## Video (phase 2)

**Video reuses the still pipeline frame by frame.** A warp is a pure function of
(design pixels, item geometry) with no state between renders, so `renderVideo`
is a loop over `renderItem` rather than a second renderer. This is the reason
geometry is normalized.

**The endpoint returns 501 instead of enqueuing.** The ffmpeg orchestration is
real and gated behind `MF_VIDEO`, but there is no upload route and no object
storage, so a finished MP4 has nowhere to live. Reporting that honestly beats
accepting jobs that cannot complete. `docs/VIDEO.md` lists what remains,
including the switch from frame dumps on disk to a piped rawvideo stream.
