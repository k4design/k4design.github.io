# Deploying the render service

The service is stateless — the catalog is generated during the image build and
read once at boot, renders hold nothing between requests — so it runs anywhere
that takes a container. The plugin's production build compiles in the origin
from `apps/plugin/manifest.production.json`, so **the app name here and the
manifest must agree** before anything ships.

## Fly.io (the configured path)

One-time setup:

```bash
brew install flyctl
fly auth login
# fly.toml is committed; --copy-config keeps it, --no-deploy lets you review
fly launch --copy-config --no-deploy
```

Deploy (also how you ship catalog updates — a deploy IS a catalog release):

```bash
fly deploy
```

Verify:

```bash
curl https://mockup-forge.fly.dev/health
# {"ok":true,"version":"0.1.0","items":11,...}
MF_API=https://mockup-forge.fly.dev npx tsx tools/render-sample.ts mug-ceramic-front-01
```

Notes:

- `fly.toml` sets `auto_stop_machines`/`min_machines_running = 0`: the machine
  sleeps when idle and wakes in under a second, which is why this costs a few
  dollars a month instead of an always-on VM.
- Renders are CPU-bound. If p95 render time degrades under real traffic, the
  first lever is a bigger machine (`fly scale vm shared-cpu-4x`), not more
  machines — a second machine only helps concurrent users, not a slow render.
- If the app name `mockup-forge` is taken, pick another, then update
  `PUBLIC_URL` in fly.toml **and** `allowedDomains` in
  `manifest.production.json`, and rebuild the plugin (`npm run build:prod`).

## Cloud Run (the $0-at-hobby-traffic alternative)

```bash
gcloud run deploy mockup-forge \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --port 8787 \
  --memory 1Gi --cpu 2 \
  --set-env-vars "PUBLIC_URL=https://<service-url>,MAX_OUTPUT_WIDTH=3000,RATE_LIMIT_BATCHES=12"
```

Cold starts are 1–3s (vs <1s on Fly); scale-to-zero is free. The two-step
dance: deploy once to learn the service URL, set `PUBLIC_URL` and the plugin
manifest to it, deploy again.

## Updating the catalog

1. Edit `apps/api/src/seed/specs.ts` (or author items with
   `tools/author-item.ts` / a measurement script and commit their **source
   photos** under `assets/sources/`).
2. `npm test` — the golden suite pins existing items; new items need a golden
   reviewed and committed on first run.
3. `fly deploy`. Item JSON and imagery are baked into the image; the plugin
   needs no update and no re-review — it only ever reads the catalog API.

## Environment reference

The full table lives in the README. Production-relevant:

| Variable             | fly.toml value | Purpose                                  |
| -------------------- | -------------- | ---------------------------------------- |
| `PUBLIC_URL`         | the app origin | Absolute asset URLs in catalog responses |
| `MAX_OUTPUT_WIDTH`   | `3000`         | Clamp on requested render width          |
| `RATE_LIMIT_RENDERS` | `30`           | Stills per minute per IP                 |
| `RATE_LIMIT_BATCHES` | `12`           | Video batches per minute per IP          |

## What is deliberately NOT here

- **Object storage / CDN service** — platform proxy caching plus the 7-day
  immutable asset headers cover launch traffic; revisit if bandwidth bills say
  otherwise.
- **A job queue** — nothing outlives a request.
- **Accounts** — per the product spec. The abuse levers are the rate limits
  and the width clamp above.
