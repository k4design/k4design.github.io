/**
 * Creative Direction dashboard API — Cloudflare Worker.
 *
 *   GitHub Pages (static UI) ──fetch──► this Worker ──► monday GraphQL
 *                                          ▲
 *                              MONDAY_API_TOKEN lives only here
 *
 * GitHub Pages can't run code, so the token-holding proxy lives here instead.
 * The UI and the iOS app both call this; neither ever sees the monday token.
 *
 * It imports lib/ from ../../web directly rather than keeping its own copy, so
 * the metrics can never drift from the local server's. Wrangler bundles them.
 */

import { fetchRaw } from '../../web/lib/monday.js';
import { derive } from '../../web/lib/derive.js';
import config from '../../web/config.json';

// Survives for the life of a warm isolate, sparing the monday API when several
// clients poll. A cold start just refetches.
let cache = { at: 0, payload: null };

/* ---------------- CORS ----------------
   The UI is served from a different origin than this Worker, so the browser
   preflights the custom X-Dashboard-Key header. Allow only the configured
   origins — never "*", which would let any site read the board. */

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const ok = allowed.includes(origin);

  const headers = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Dashboard-Key, Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    // The response differs per origin, so caches must key on it.
    Vary: 'Origin',
  };
  if (ok) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Board contents are private; never let a shared cache hold them.
      'Cache-Control': 'private, no-store',
      ...extra,
    },
  });
}

/* ---------------- access gate ----------------
   Fails closed: with no DASHBOARD_ACCESS_KEY configured the Worker refuses to
   serve, so a half-configured deploy is broken and obvious rather than a public
   endpoint serving your board. */

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

/** Constant-time compare over digests, so neither the key nor its length leaks. */
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function checkAccess(request, env) {
  const expected = env.DASHBOARD_ACCESS_KEY;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      message:
        'DASHBOARD_ACCESS_KEY is not set on this Worker, so access cannot be verified ' +
        'and it is refusing to serve board data. Set it with: wrangler secret put DASHBOARD_ACCESS_KEY',
    };
  }
  if (expected.length < 20) {
    return { ok: false, status: 503, message: 'DASHBOARD_ACCESS_KEY is too short. Use 20+ random characters.' };
  }

  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  const given = request.headers.get('X-Dashboard-Key') || bearer?.[1] || '';

  if (!sameBytes(await sha256(given), await sha256(expected))) {
    return { ok: false, status: 401, message: 'Invalid or missing access key.' };
  }
  return { ok: true };
}

/* ---------------- handler ---------------- */

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    // Preflight for the custom header.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json(405, { error: 'Method not allowed.' }, cors);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api/snapshot' && url.pathname !== '/') {
      return json(404, { error: 'Not found. The dashboard API lives at /api/snapshot.' }, cors);
    }

    // Gate first: never touch monday, never warm the cache, for an unauthorised caller.
    const gate = await checkAccess(request, env);
    if (!gate.ok) {
      return json(gate.status, { error: gate.message, needsKey: gate.status === 401 }, cors);
    }

    if (!env.MONDAY_API_TOKEN) {
      return json(
        500,
        {
          error:
            'MONDAY_API_TOKEN is not set on this Worker. Set it with: ' +
            'wrangler secret put MONDAY_API_TOKEN',
        },
        cors
      );
    }

    const force = url.searchParams.get('force') === '1';
    const ttlMs = (config.serverCacheSeconds ?? 15) * 1000;

    if (!force && cache.payload && Date.now() - cache.at < ttlMs) {
      return json(200, cache.payload, { ...cors, 'X-Snapshot-Cache': 'warm' });
    }

    try {
      const raw = await fetchRaw(env.MONDAY_API_TOKEN, config);
      const payload = derive(raw, config, new Date());
      payload.tokenPresent = true;
      payload.pollSeconds = config.pollSeconds;
      payload.hosted = 'cloudflare';

      cache = { at: Date.now(), payload };
      return json(200, payload, { ...cors, 'X-Snapshot-Cache': 'cold' });
    } catch (err) {
      // Keep the last good snapshot on screen rather than blanking the board.
      if (cache.payload) {
        return json(200, { ...cache.payload, error: err.message, stale: true }, cors);
      }
      return json(502, { error: `monday API request failed: ${err.message}` }, cors);
    }
  },
};
