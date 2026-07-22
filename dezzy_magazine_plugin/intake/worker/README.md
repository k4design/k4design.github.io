# Dezzy Property Intake — Cloudflare backend

Shared storage for the intake app: project/photo **metadata in D1**, image **bytes in R2**,
served by one **Worker**. The app becomes a thin client that talks to this API.

## Prerequisites
- A Cloudflare account (free). Enabling R2 requires a card on file (you'll stay in the free tier).
- Node + Wrangler: `npm install -g wrangler` then `wrangler login`.

## One-time setup (from this `worker/` folder)

```sh
# 1. Object storage for images. Add --jurisdiction eu if you want EU data residency
#    (decide now — jurisdiction can't be changed later).
wrangler r2 bucket create dezzy-intake-photos            # or: --jurisdiction eu

# 2. Metadata database.
wrangler d1 create dezzy-intake
#    -> copy the printed database_id into wrangler.toml (REPLACE_WITH_YOUR_D1_DATABASE_ID)

# 3. Create the tables (remote = the deployed DB).
wrangler d1 execute dezzy-intake --remote --file=schema.sql

# 4. (Optional) AI photo tagging — store your Anthropic key server-side:
wrangler secret put ANTHROPIC_API_KEY

# 5. Deploy.
wrangler deploy
```

Deploy prints your API base URL, e.g. `https://dezzy-intake.<subdomain>.workers.dev`.

## Wire the app to it
1. In `wrangler.toml`, set `ALLOWED_ORIGIN` to where the page is hosted
   (e.g. `https://k4design.github.io`), then `wrangler deploy` again.
2. Open the intake app → **⚙ Settings** → paste the API base URL. (The app stores it and
   talks to `<base>/api/...`.)

## Auth (recommended)
Put **Cloudflare Access** in front of the Worker route (dashboard → Zero Trust → Access →
Applications), restrict to your team's emails, then set `REQUIRE_AUTH="true"` in
`wrangler.toml` and redeploy. The Worker then rejects any request without an Access identity.
Free for up to 50 users.

## What the API does
- `GET /api/projects` — list for the cards (fields + photo count + thumbnail id)
- `POST /api/projects` / `GET|PATCH|DELETE /api/projects/:id` — project CRUD
- `POST /api/projects/:id/submit` — assign the next `DZ-####` ticket + submission time
- `GET /api/projects/:id/savestate` — build & download the plugin save-state zip (server-side)
- `POST /api/projects/:id/photos` — multipart upload (original + thumbnail) into R2
- `GET /api/photos/:id/original` · `/thumb` — serve image bytes
- `PATCH|DELETE /api/photos/:id` — recategorize / remove
- `POST /api/ai` — proxy to Anthropic for photo auto-tagging (uses the server-side key)

## Cost sanity
R2 storage ~$0.015/GB/mo and **no egress fees** (matters when the design team pulls full-res
shoots). Workers/D1 free tiers cover a small team comfortably. Set a billing alert and you're
effectively at $0.

## Local dev
`wrangler dev` runs the Worker locally; use `--remote` to hit the real R2/D1. Point the app's
API base at the printed localhost URL to test end-to-end.
