# Creative Direction API — Cloudflare Worker

The dashboard's server, on Cloudflare instead of your Mac.

```
GitHub Pages (static UI) ──fetch──► this Worker ──► monday GraphQL
iOS app ───────────────────────────►    ▲
                                        │
                    MONDAY_API_TOKEN lives only here
```

## Why this exists

GitHub Pages serves static files and cannot run code. The dashboard needs a
server for two reasons a browser can't cover:

1. **Holding the monday token.** Anything in a Pages repo is world-readable, and
   your token carries `me:write` — full write access to the monday account.
2. **Calling the monday API.** Browsers are blocked by CORS regardless.

So Pages hosts the UI and this Worker is the API. Nothing about the dashboard's
logic changes: it imports `../web/lib/monday.js` and `../web/lib/derive.js`
**directly** rather than keeping copies, so the numbers can never drift from the
local server's.

## Setup

### 1. Set the two secrets

Interactive prompts — the values never touch your shell history or this repo:

```bash
cd dashboard/worker
wrangler secret put MONDAY_API_TOKEN
wrangler secret put DASHBOARD_ACCESS_KEY
```

`DASHBOARD_ACCESS_KEY` is your own invention; 20+ random characters. Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2. Deploy

```bash
wrangler deploy
```

Wrangler prints the URL, of the form
`https://creative-direction-api.<your-subdomain>.workers.dev`.

### 3. Point the UI at it

In `dashboard/web/public/index.html`, set:

```js
window.DASHBOARD_API = "https://creative-direction-api.<your-subdomain>.workers.dev";
```

Leave it `""` for local development, where `node server.js` serves both halves.

### 4. Point the iOS app at it

App → Settings (gear): **Server** = the Worker URL, **Access key** = the same
value you set above. That combination works over cellular with your Mac shut.

### 5. Check the allowed origins

`wrangler.jsonc` lists which browser origins may read the API. Update it if the
UI is served from anywhere other than `https://k4design.github.io`, then redeploy.

An **origin is scheme + host + port only** — a project path like
`/dashboard/web/public` is not part of it, so no path belongs in this list. The
iOS app is native and exempt from CORS entirely.

## Security posture

- **Fails closed.** With no `DASHBOARD_ACCESS_KEY` set, the Worker returns 503
  and serves nothing. A half-configured deploy is broken and obvious rather than
  a public endpoint exposing your board.
- **Constant-time key comparison** over SHA-256 digests, so neither the key nor
  its length leaks by timing.
- **CORS is an allowlist**, never `*`. An unlisted origin gets no
  `Access-Control-Allow-Origin` header at all.
- **The gate runs before anything else** — an unauthorised request never reaches
  monday and never warms the cache.
- Responses are `Cache-Control: private, no-store`; board data is never held by
  a shared cache.

A shared key stops anyone who merely has the URL, which is the real risk here.
It is not per-user auth, and rotating it means updating the secret plus every
client. For stronger control, put Cloudflare Access in front of the Worker.

## Verified

| Check | Result |
|---|---|
| `wrangler deploy --dry-run` bundles | 38.4 KiB / 11.7 KiB gzipped |
| CommonJS `lib/` imports work at runtime | Worker boots and serves |
| No key → 401 | pass |
| Wrong key → 401 | pass |
| Correct key → gate opens | pass |
| No `DASHBOARD_ACCESS_KEY` → 503, no data | pass |
| Preflight from `k4design.github.io` → allowed | pass |
| Preflight from another origin → no allow header | pass |

Not yet done: a real `wrangler deploy` (needs your secrets), and an end-to-end
call against monday through the deployed Worker.

## Commands

```bash
wrangler dev --port 8791     # local, reads .dev.vars
wrangler deploy --dry-run    # validate the bundle
wrangler deploy              # ship it
wrangler tail                # live logs
wrangler secret list         # which secrets are set (not their values)
```

`.dev.vars` holds local secrets and is gitignored. Never commit it.
