/**
 * Anthropic proxy for the Property Intake site (Cloudflare Worker).
 *
 * Keeps your Anthropic API key server-side so it never ships to the browser.
 * The intake page POSTs a normal /v1/messages body to this worker; the worker
 * adds the key + version header and forwards it to Anthropic.
 *
 * ── Deploy (Cloudflare) ──────────────────────────────────────────────
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker.
 *   2. Paste this file as the worker code and Deploy.
 *   3. Worker → Settings → Variables → add a SECRET named ANTHROPIC_API_KEY
 *      (encrypted), value = your key from console.anthropic.com.
 *   4. Set ALLOWED_ORIGIN below to your site, e.g. "https://k4design.github.io".
 *   5. In the intake page → ⚙ AI settings → Mode "Proxy URL" → paste the
 *      worker URL (https://<name>.<subdomain>.workers.dev).
 *
 * The same shape works on Vercel/Netlify/Deno/any tiny Node server — just read
 * the key from an env var and forward the JSON body to
 * https://api.anthropic.com/v1/messages with these three headers.
 */

// Lock this down in production. "*" allows any site to use your key/quota.
const ALLOWED_ORIGIN = "*"; // e.g. "https://k4design.github.io"

// Guard against abuse. Large enough for a base64 PDF (a ~28MB PDF is ~38MB
// base64) plus the JSON envelope; downscaled images are far smaller.
const MAX_BODY_BYTES = 40 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return new Response("POST only", { status: 405, headers: cors });
    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "Proxy missing ANTHROPIC_API_KEY" }, 500, cors);

    const body = await request.text();
    if (body.length > MAX_BODY_BYTES)
      return json({ error: "Request too large" }, 413, cors);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "content-type": "application/json" },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
