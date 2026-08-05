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
