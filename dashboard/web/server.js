#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchRaw } = require('./lib/monday');
const { derive } = require('./lib/derive');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

/* ---------- config + token ---------- */

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
}

// Token resolution order: env var, then a local .env file (gitignored).
function loadToken() {
  if (process.env.MONDAY_API_TOKEN) return process.env.MONDAY_API_TOKEN.trim();
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^\s*MONDAY_API_TOKEN\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return null;
}

const config = loadConfig();
const TOKEN = loadToken();
const PORT = Number(process.env.PORT) || config.port || 4173;

/* ---------- snapshot cache ---------- */

let cache = { at: 0, payload: null, error: null };
let inflight = null;

function sampleRaw() {
  const p = path.join(ROOT, 'raw.sample.json');
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  raw.demo = true;
  return raw;
}

async function getSnapshot(force = false) {
  const ttl = (config.serverCacheSeconds ?? 15) * 1000;
  if (!force && cache.payload && Date.now() - cache.at < ttl) return cache.payload;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      let raw;
      if (TOKEN) {
        raw = await fetchRaw(TOKEN, config);
      } else {
        raw = sampleRaw();
        if (!raw) throw new Error('No MONDAY_API_TOKEN set and no raw.sample.json to fall back on.');
      }
      const payload = derive(raw, config, new Date());
      payload.tokenPresent = !!TOKEN;
      payload.pollSeconds = config.pollSeconds;
      cache = { at: Date.now(), payload, error: null };
      return payload;
    } catch (err) {
      cache.error = err.message;
      // Serve the last good snapshot rather than blanking the wallboard on a
      // transient API hiccup; the client shows a stale badge.
      if (cache.payload) {
        return { ...cache.payload, error: err.message, stale: true };
      }
      const fallback = sampleRaw();
      if (fallback) {
        const payload = derive(fallback, config, new Date());
        payload.tokenPresent = !!TOKEN;
        payload.pollSeconds = config.pollSeconds;
        payload.error = err.message;
        return payload;
      }
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/* ---------- static files ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const full = path.join(PUBLIC, rel);
  if (!full.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      // no-store, not no-cache: this is a local dev tool that gets edited live,
      // and a stale stylesheet looks exactly like "my changes didn't apply".
      'Cache-Control': 'no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.end(data);
  });
}

function json(res, code, body) {
  const text = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

/* ---------- server ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/snapshot') {
    try {
      const payload = await getSnapshot(url.searchParams.get('force') === '1');
      json(res, 200, payload);
    } catch (err) {
      json(res, 500, { error: err.message });
    }
    return;
  }

  if (url.pathname === '/api/health') {
    json(res, 200, {
      ok: true,
      tokenPresent: !!TOKEN,
      boards: config.boards.length,
      lastFetch: cache.at ? new Date(cache.at).toISOString() : null,
      lastError: cache.error,
    });
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  const mode = TOKEN ? 'LIVE' : 'DEMO (bundled sample data)';
  console.log('');
  console.log(`  Creative Director Dashboard  —  ${mode}`);
  console.log(`  http://localhost:${PORT}`);
  const active = config.boards.filter((b) => !b._disabled);
  const parked = config.boards.filter((b) => b._disabled);
  console.log(`  Boards: ${active.map((b) => b.label).join(', ')}`);
  if (parked.length) {
    console.log(`  Skipping (_disabled): ${parked.map((b) => b.label).join(', ')}`);
  }
  if (!TOKEN) {
    console.log('');
    console.log('  No MONDAY_API_TOKEN found — serving the bundled sample.');
    console.log('  For live data, put your token in monday-dashboard/.env:');
    console.log('    MONDAY_API_TOKEN=your_token_here');
  }
  console.log('');
});
