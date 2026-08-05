#!/usr/bin/env node
'use strict';

/**
 * Re-bake raw.sample.json from your live boards.
 *
 *   node tools/capture.js
 *
 * Useful for refreshing the offline/demo snapshot, or for grabbing a
 * point-in-time copy of the boards before a big reshuffle.
 */

const fs = require('fs');
const path = require('path');
const { fetchRaw } = require('../lib/monday');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

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

(async () => {
  const token = loadToken();
  if (!token) {
    console.error('No MONDAY_API_TOKEN found (env var or monday-dashboard/.env).');
    process.exit(1);
  }

  const out = path.join(ROOT, 'raw.sample.json');
  const raw = await fetchRaw(token, config);
  raw.demo = true;
  fs.writeFileSync(out, JSON.stringify(raw, null, 1));

  console.log(`Captured ${raw.items.length} items from ${raw.boards.length} boards → ${path.relative(process.cwd(), out)}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
