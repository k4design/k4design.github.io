# Mockup Forge

A Figma plugin that renders your artwork realistically onto product
photography — smart-object compositing, without leaving Figma.

Browse a library of mockups (devices, apparel, packaging, print, branding),
import one onto the canvas, drop your design into the frame it creates, and hit
Render. The design is warped onto the product surface server-side and comes back
as the mockup's new image fill. Your design frame stays editable, so re-rendering
is one click.

There are no accounts. Nothing to sign up for, no tokens, no entitlements.

## Layout

```
packages/shared    Zod schemas shared by both sides: item model, HTTP
                   contracts, postMessage protocol, node naming, geometry
apps/api           Fastify catalog + render service (sharp, TS warp core)
apps/plugin        The Figma plugin — esbuild sandbox bundle + Vite React UI
assets/items       One directory per mockup item: item.json + its layers
assets/golden      Committed reference renders — the regression contract
tools              Authoring, point picking, sample rendering, UI harness
docs               Phase-2 notes
```

## Local development

Requires Node 20+. `sharp` ships prebuilt binaries, so there is no native
toolchain to install.

```bash
npm install
npm run build --workspace @mf/shared
```

Generate the mockup library. The seed photography is synthetic and produced
deterministically from the item specs, so it is not committed — this writes it:

```bash
npm run seed --workspace @mf/api
```

Start the render service:

```bash
npm run dev:api
```

It listens on `http://127.0.0.1:8787`. Check it:

```bash
curl http://localhost:8787/health
```

Build the plugin (or `npm run dev:plugin` to watch both bundles):

```bash
npm run build --workspace @mf/plugin
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and
choose `apps/plugin/manifest.json`. Run it from **Plugins → Development → Mockup
Forge**.

The plugin's API URL lives in its Settings tab, remembered per user via
`clientStorage`, and defaults to `http://localhost:8787`.

Any URL you point it at must also appear in `manifest.json` under
`networkAccess.allowedDomains` — Figma blocks every other origin, and the failure
surfaces as a network error rather than a permission one. Two constraints there
are easy to trip over:

- **Use a hostname, not an IP.** Figma's manifest validator rejects
  `http://127.0.0.1:8787` outright with "must be a valid URL". `localhost` with a
  port is the supported form for local development.
- The server binds to `127.0.0.1`. `localhost` resolves to `::1` first on macOS,
  but Chromium-based clients fall back to IPv4, so this works. If some client
  refuses to, start the API with `HOST=::1`.

### Working without Figma

Two tools make the inner loop fast:

```bash
# Render the whole catalog against a grid test card, into assets/samples/
npx tsx tools/render-sample.ts
npx tsx tools/render-sample.ts mug-ceramic-front-01 --colorize '#20222c'
```

```bash
# Drive the real plugin UI in a browser; a script stands in for the sandbox
npx http-server -p 8099 -s .
# then open http://127.0.0.1:8099/tools/dev-harness.html
```

The harness answers the plugin's messages, fabricates exported design frames,
and displays whatever the render service sends back — the full import → export →
render → apply loop, minus the canvas.

## Adding a mockup

Mockup items are self-contained directories under `assets/items/<id>/`: an
`item.json` plus its layers. Two ways to make one.

**From a photograph.** Open `tools/pick-points.html` in a browser, load your
photo, and click the corners of the surface — top-left, top-right, bottom-right,
bottom-left of the artwork as it sits on the product. Copy the output and pass it
to the authoring tool, which derives the alpha mask and lighting maps from that
geometry so they cannot disagree with the warp:

```bash
npx tsx tools/author-item.ts \
  --id desk-poster-01 --name "Poster on Desk" \
  --category print --viewpoint scene \
  --base ~/photos/desk.jpg \
  --corners "0.21,0.18 0.78,0.25 0.74,0.82 0.19,0.75" \
  --aspect 0.7071
```

Curved and fabric surfaces use `--rect "x,y w,h"` plus `--cylinder 0.65` or
`--fabric --displacement 14`. Run `npx tsx tools/author-item.ts --help` for the
full set, and `--dry-run` to see the JSON without writing files.

**As code.** Add a spec to `apps/api/src/seed/specs.ts` and re-run the seed. The
ten shipped items work this way: each declares its warp geometry first and draws
its product art from those same numbers, so the artwork and the warp cannot
drift apart.

## Testing

```bash
npm test           # all workspaces
```

- `packages/shared` — item schema validation, geometry builders, aspect
  tolerance, message protocol (26 tests)
- `apps/api` — warp maths against known fixtures, compositor blending and
  colorize maths, plus a golden-image render of every catalog item (50 tests)

The golden suite renders each item at 600px against a procedurally drawn test
card — no fonts, so it is reproducible across machines — and compares to the
committed reference in `assets/golden/`. On failure it writes `<id>.actual.png`
and a magenta `<id>.diff.png` beside the reference.

If a change to the renderer is intended, update the references deliberately and
review the image diff in the commit:

```bash
MF_UPDATE_GOLDEN=1 npm test --workspace @mf/api
```

## Endpoints

| Method | Path                     | Purpose                                       |
| ------ | ------------------------ | --------------------------------------------- |
| GET    | `/health`                | Version, catalog size, feature flags          |
| GET    | `/catalog`               | Paged items — `category`, `viewpoint`, `q`, `cursor`, `limit` |
| GET    | `/items/:id`             | Client-safe item detail (no warp geometry)    |
| POST   | `/render`                | Composite designs onto an item, returns PNG   |
| POST   | `/render/video`          | Phase 2, gated behind `MF_VIDEO=1`            |
| GET    | `/assets/*`              | Item thumbnails and previews (CDN in prod)    |

Errors carry a machine-readable code — `aspect_mismatch`, `payload_too_large`,
`unsupported_media`, `rate_limited`, `render_timeout` — which the plugin turns
into specific recovery advice rather than a generic failure.

## Configuration

Server settings come from the environment and are validated at boot; an invalid
value fails the process rather than being silently defaulted.

| Variable             | Default              | Notes                                  |
| -------------------- | -------------------- | -------------------------------------- |
| `PORT` / `HOST`      | `8787` / `127.0.0.1` |                                        |
| `ASSET_DIR`          | `./assets`           | Item packages; an S3-compatible mount in production |
| `ASSET_BASE_URL`     | —                    | Set to serve thumbnails from a CDN     |
| `PUBLIC_URL`         | —                    | Public origin, for building asset URLs |
| `RATE_LIMIT_RENDERS` | `30`                 | Per IP, per `RATE_LIMIT_WINDOW`; `/render` only |
| `RENDER_TIMEOUT_MS`  | `20000`              |                                        |
| `MF_VIDEO`           | `0`                  | Phase-2 video rendering                |
| `LOG_LEVEL`          | `info`               |                                        |

## Deployment

The service is stateless: the catalog is read at boot and never mutated at
runtime, and renders hold nothing between requests. It runs anywhere that takes a
container — Fly.io, Render, Cloud Run — with item assets on an S3-compatible
mount and a CDN in front of `/assets`.

Renders are CPU-bound and single-threaded per request, so scale on cores and keep
`RENDER_TIMEOUT_MS` below your platform's request timeout.

## Documentation

- [DECISIONS.md](DECISIONS.md) — every open choice in the brief, and why it went the way it did
- [docs/VIDEO.md](docs/VIDEO.md) — phase-2 video rendering: what exists, what is missing
