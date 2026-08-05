# Mockup Forge

A Figma plugin that renders your artwork realistically onto product
photography — smart-object compositing, without leaving Figma.

Browse a library of mockups (devices, apparel, packaging, print, branding),
import one onto the canvas, drop your design into the frame it creates, and hit
Render. The design is warped onto the product surface server-side and comes
back as the mockup's new image fill. Your design frame stays editable, so
re-rendering is one click.

## Layout

```
packages/shared    Zod schemas shared by both sides: item model, HTTP
                   contracts, postMessage protocol, node naming
apps/api           Fastify catalog + render service (sharp, TS warp core)
apps/plugin        The Figma plugin — esbuild sandbox bundle + Vite React UI
assets/items       One directory per mockup item: item.json + its layers
tools              Authoring helpers (define warp geometry over a base photo)
```

## Local development

Requires Node 20+.

```bash
npm install
npm run build --workspace @mf/shared
```

Start the render service:

```bash
npm run dev:api
```

It listens on `http://127.0.0.1:8787`. Check it:

```bash
curl http://127.0.0.1:8787/health
```

Build the plugin (or `npm run dev:plugin` to watch both bundles):

```bash
npm run build --workspace @mf/plugin
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and
choose `apps/plugin/manifest.json`. Run it from **Plugins → Development →
Mockup Forge**.

The plugin's API URL is set in its Settings tab and remembered per user via
`clientStorage`. Any URL you point it at must also appear in
`manifest.json` under `networkAccess.allowedDomains` — Figma blocks every other
origin, and the failure looks like a network error rather than a permission
one.

## Endpoints

| Method | Path                | Purpose                                      |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/health`           | Version, catalog size, feature flags         |
| GET    | `/catalog`          | Paged item metadata — `category`, `viewpoint`, `q`, `cursor`, `limit` |
| GET    | `/items/:id`        | Full client-safe item detail                 |
| POST   | `/render`           | Composite designs onto an item, returns PNG  |
| POST   | `/render/video`     | Phase 2, gated behind `MF_VIDEO=1`           |
| GET    | `/assets/*`         | Item thumbnails and previews (CDN in prod)   |

## Configuration

All server settings come from the environment and are validated at boot; an
invalid value fails the process rather than being silently defaulted.

| Variable            | Default                | Notes                                    |
| ------------------- | ---------------------- | ---------------------------------------- |
| `PORT` / `HOST`     | `8787` / `127.0.0.1`   |                                          |
| `ASSET_DIR`         | `./assets`             | Item packages; an S3-compatible mount in production |
| `ASSET_BASE_URL`    | —                      | Set to serve thumbnails from a CDN       |
| `PUBLIC_URL`        | —                      | Public origin, for building asset URLs   |
| `RATE_LIMIT_RENDERS`| `30`                   | Per IP, per `RATE_LIMIT_WINDOW`          |
| `RENDER_TIMEOUT_MS` | `20000`                |                                          |
| `MF_VIDEO`          | `0`                    | Phase-2 video rendering                  |

## Documentation

- [DECISIONS.md](DECISIONS.md) — every open choice in the brief and its rationale
