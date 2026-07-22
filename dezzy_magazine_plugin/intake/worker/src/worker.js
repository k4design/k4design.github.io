/**
 * Dezzy Property Intake — Cloudflare Worker API.
 *
 * Metadata in D1 (env.DB), image bytes in R2 (env.BUCKET). The browser is a
 * thin client; images are uploaded to / served from R2 through this Worker
 * (egress-free within Cloudflare), and save-state zips are built server-side.
 *
 * Endpoints (all under /api):
 *   GET    /api/health
 *   GET    /api/projects                     list (cards: fields + photoCount + thumbPhotoId)
 *   POST   /api/projects                     create -> {id,...}
 *   GET    /api/projects/:id                 project + photos[]
 *   PATCH  /api/projects/:id                 update {values?,package?,status?,assignee?}
 *   DELETE /api/projects/:id                 delete project + its images
 *   POST   /api/projects/:id/submit          assign ticket + submittedAt, mark submitted
 *   GET    /api/projects/:id/savestate       download plugin save-state zip
 *   POST   /api/projects/:id/photos          multipart: meta(JSON)+file+thumb -> photo row
 *   PATCH  /api/photos/:id                   update {category?,sort?}
 *   DELETE /api/photos/:id                   delete photo + its images
 *   GET    /api/photos/:id/original          stream original bytes
 *   GET    /api/photos/:id/thumb             stream thumbnail bytes
 *   POST   /api/ai                           proxy to Anthropic (photo tagging)
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // Optional Cloudflare Access gate. When REQUIRE_AUTH="true", every request
    // must carry an Access-authenticated identity (put Access in front of the
    // Worker route in the Cloudflare dashboard). Off by default so it works
    // before you configure Access.
    if (String(env.REQUIRE_AUTH) === "true" &&
        !request.headers.get("Cf-Access-Authenticated-User-Email")) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    try {
      return await route(request, env, cors);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500, cors);
    }
  },
};

// ------------------------------------------------------------------ routing
async function route(request, env, cors) {
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, "");
  const m = request.method;
  const seg = p.split("/").filter(Boolean); // ["api","projects","id",...]

  if (p === "" || p === "/" || p === "/api" || p === "/api/health")
    return json({ ok: true, service: "dezzy-intake", api: "/api/*" }, 200, cors);

  // Diagnostic: is the AI key bound to THIS running worker? (length only, never the value)
  if (p === "/api/ai-status" && m === "GET")
    return json({ ai_key_present: !!env.ANTHROPIC_API_KEY, ai_key_len: (env.ANTHROPIC_API_KEY || "").length }, 200, cors);

  // /api/projects ...
  if (seg[0] === "api" && seg[1] === "projects") {
    if (seg.length === 2 && m === "GET") return listProjects(env, cors);
    if (seg.length === 2 && m === "POST") return createProject(request, env, cors);
    const id = seg[2];
    if (id && seg.length === 3 && m === "GET") return getProject(env, cors, id);
    if (id && seg.length === 3 && m === "PATCH") return patchProject(request, env, cors, id);
    if (id && seg.length === 3 && m === "DELETE") return deleteProject(env, cors, id);
    if (id && seg[3] === "submit" && m === "POST") return submitProject(env, cors, id);
    if (id && seg[3] === "savestate" && m === "GET") return saveState(env, cors, id);
    if (id && seg[3] === "photos" && m === "POST") return addPhoto(request, env, cors, id);
  }

  // /api/photos ...
  if (seg[0] === "api" && seg[1] === "photos") {
    const id = seg[2];
    if (id && seg.length === 3 && m === "PATCH") return patchPhoto(request, env, cors, id);
    if (id && seg.length === 3 && m === "DELETE") return deletePhoto(env, cors, id);
    if (id && seg[3] === "original" && m === "GET") return streamPhoto(env, cors, id, "original");
    if (id && seg[3] === "thumb" && m === "GET") return streamPhoto(env, cors, id, "thumb");
  }

  if (p === "/api/ai" && m === "POST") return aiProxy(request, env, cors);

  return json({ error: "not found" }, 404, cors);
}

// ------------------------------------------------------------------ helpers
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function keyOrig(photo) { return `photos/${photo.id}.${photo.ext || "jpg"}`; }
function keyThumb(photo) { return `photos/${photo.id}.thumb.jpg`; }
function projectRow(r) {
  return {
    id: r.id, status: r.status, package: r.package, submitted: !!r.submitted,
    ticket: r.ticket || null, assignee: r.assignee || "",
    values: safeJson(r.values_json), createdAt: r.created_at, updatedAt: r.updated_at,
    submittedAt: r.submitted_at || null,
  };
}
function safeJson(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }

// ------------------------------------------------------------------ projects
async function listProjects(env, cors) {
  const { results: projs } = await env.DB.prepare(
    "SELECT * FROM projects ORDER BY updated_at DESC").all();
  const { results: phs } = await env.DB.prepare(
    "SELECT id, project_id, category, sort FROM photos").all();
  const byProj = new Map();
  for (const ph of phs || []) {
    const list = byProj.get(ph.project_id) || [];
    list.push(ph); byProj.set(ph.project_id, list);
  }
  const out = (projs || []).map((r) => {
    const photos = (byProj.get(r.id) || []).sort((a, b) => a.sort - b.sort);
    const thumb = photos.find((x) => x.category === "exterior")
      || photos.find((x) => x.category === "cover")
      || photos.find((x) => x.category === "hero") || photos[0];
    return { ...projectRow(r), photoCount: photos.length, thumbPhotoId: thumb ? thumb.id : null };
  });
  return json({ projects: out }, 200, cors);
}

async function createProject(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const now = Date.now();
  const id = uid();
  await env.DB.prepare(
    "INSERT INTO projects (id,status,package,submitted,assignee,values_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(id, "draft", body.package || "", 0, "", JSON.stringify(body.values || {}), now, now)
    .run();
  return getProject(env, cors, id);
}

async function getProject(env, cors, id) {
  const r = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!r) return json({ error: "not found" }, 404, cors);
  const { results: phs } = await env.DB.prepare(
    "SELECT id,filename,category,ext,sort FROM photos WHERE project_id=? ORDER BY sort").bind(id).all();
  return json({ project: projectRow(r), photos: phs || [] }, 200, cors);
}

async function patchProject(request, env, cors, id) {
  const body = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!r) return json({ error: "not found" }, 404, cors);
  const sets = [], vals = [];
  if ("values" in body) { sets.push("values_json=?"); vals.push(JSON.stringify(body.values || {})); }
  if ("package" in body) { sets.push("package=?"); vals.push(body.package || ""); }
  if ("status" in body) { sets.push("status=?"); vals.push(body.status || "draft"); }
  if ("assignee" in body) { sets.push("assignee=?"); vals.push(body.assignee || ""); }
  sets.push("updated_at=?"); vals.push(Date.now());
  vals.push(id);
  await env.DB.prepare(`UPDATE projects SET ${sets.join(",")} WHERE id=?`).bind(...vals).run();
  return getProject(env, cors, id);
}

async function deleteProject(env, cors, id) {
  const { results: phs } = await env.DB.prepare(
    "SELECT id,ext FROM photos WHERE project_id=?").bind(id).all();
  for (const ph of phs || []) {
    await env.BUCKET.delete(keyOrig(ph)).catch(() => {});
    await env.BUCKET.delete(keyThumb(ph)).catch(() => {});
  }
  await env.DB.prepare("DELETE FROM photos WHERE project_id=?").bind(id).run();
  await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
  return json({ ok: true }, 200, cors);
}

async function submitProject(env, cors, id) {
  const r = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!r) return json({ error: "not found" }, 404, cors);
  let ticket = r.ticket, submittedAt = r.submitted_at, status = r.status;
  if (!ticket) ticket = await nextTicket(env);
  if (!submittedAt) submittedAt = Date.now();
  if (status === "draft") status = "submitted";
  await env.DB.prepare(
    "UPDATE projects SET submitted=1, ticket=?, submitted_at=?, status=?, updated_at=? WHERE id=?")
    .bind(ticket, submittedAt, status, Date.now(), id).run();
  return getProject(env, cors, id);
}

async function nextTicket(env) {
  const row = await env.DB.prepare(
    "UPDATE counters SET value=value+1 WHERE name='ticket' RETURNING value").first();
  const n = row ? row.value : 1;
  return "DZ-" + String(n).padStart(4, "0");
}

// ------------------------------------------------------------------ photos
async function addPhoto(request, env, cors, projectId) {
  const proj = await env.DB.prepare("SELECT id FROM projects WHERE id=?").bind(projectId).first();
  if (!proj) return json({ error: "project not found" }, 404, cors);
  const form = await request.formData();
  const meta = safeJson(form.get("meta"));
  const file = form.get("file");
  const thumb = form.get("thumb");
  if (!file) return json({ error: "missing file" }, 400, cors);
  const id = uid();
  const ext = (meta.ext || "jpg").toLowerCase();
  const photo = { id, ext };
  await env.BUCKET.put(keyOrig(photo), file.stream ? file.stream() : await file.arrayBuffer(),
    { httpMetadata: { contentType: file.type || "image/jpeg" } });
  if (thumb) await env.BUCKET.put(keyThumb(photo),
    thumb.stream ? thumb.stream() : await thumb.arrayBuffer(),
    { httpMetadata: { contentType: "image/jpeg" } });
  await env.DB.prepare(
    "INSERT INTO photos (id,project_id,filename,category,ext,sort,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(id, projectId, meta.filename || "", meta.category || "uncategorized", ext,
      Number(meta.sort) || 0, Date.now()).run();
  await touch(env, projectId);
  return json({ photo: { id, filename: meta.filename || "", category: meta.category || "uncategorized", ext, sort: Number(meta.sort) || 0 } }, 200, cors);
}

async function patchPhoto(request, env, cors, id) {
  const body = await request.json().catch(() => ({}));
  const ph = await env.DB.prepare("SELECT * FROM photos WHERE id=?").bind(id).first();
  if (!ph) return json({ error: "not found" }, 404, cors);
  const sets = [], vals = [];
  if ("category" in body) { sets.push("category=?"); vals.push(body.category || "uncategorized"); }
  if ("sort" in body) { sets.push("sort=?"); vals.push(Number(body.sort) || 0); }
  if (!sets.length) return json({ ok: true }, 200, cors);
  vals.push(id);
  await env.DB.prepare(`UPDATE photos SET ${sets.join(",")} WHERE id=?`).bind(...vals).run();
  await touch(env, ph.project_id);
  return json({ ok: true }, 200, cors);
}

async function deletePhoto(env, cors, id) {
  const ph = await env.DB.prepare("SELECT * FROM photos WHERE id=?").bind(id).first();
  if (!ph) return json({ ok: true }, 200, cors);
  await env.BUCKET.delete(keyOrig(ph)).catch(() => {});
  await env.BUCKET.delete(keyThumb(ph)).catch(() => {});
  await env.DB.prepare("DELETE FROM photos WHERE id=?").bind(id).run();
  await touch(env, ph.project_id);
  return json({ ok: true }, 200, cors);
}

async function streamPhoto(env, cors, id, which) {
  const ph = await env.DB.prepare("SELECT * FROM photos WHERE id=?").bind(id).first();
  if (!ph) return json({ error: "not found" }, 404, cors);
  const key = which === "thumb" ? keyThumb(ph) : keyOrig(ph);
  const obj = await env.BUCKET.get(key);
  if (!obj) return json({ error: "image missing" }, 404, cors);
  const headers = new Headers(cors);
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(obj.body, { headers });
}

async function touch(env, projectId) {
  await env.DB.prepare("UPDATE projects SET updated_at=? WHERE id=?").bind(Date.now(), projectId).run();
}

// ------------------------------------------------------------------ save-state zip
// Field keys must match the Dezzy Magazine plugin's data.csv exactly.
const FIELD_KEYS = [
  "street","street2","cityState","city","state","zip","price","tagline","description",
  "communityDescription","bedrooms","bathrooms","sqft","lotSize","yearBuilt",
  "feature1","feature2","feature3","feature4","feature5","feature6","feature7","feature8","feature9",
  "featuresBulleted","name","agentTitle","phone","email",
];
for (let n = 1; n <= 8; n++) { FIELD_KEYS.push(`caption.${n}.title`, `caption.${n}.body`); }

// category -> filename base for the plugin's auto-assign (matches the app).
const CAT_FILE = {
  uncategorized:"photo", exterior:"exterior", entry:"entry", living:"living", kitchen:"kitchen",
  dining:"dining", master:"master", masterbath:"master bath", secondary:"secondary bedroom",
  secondarybath:"secondary bath", office:"office", amenities:"amenities", garage:"garage",
  outdoor:"outdoor", interior:"interior", floorplan:"floorplan", cover:"cover", hero:"hero", agent:"headshot",
};

function csvCell(v) { v = String(v == null ? "" : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function buildDataCsv(values) {
  const rows = [["field", "value"]];
  for (const k of FIELD_KEYS) rows.push([k, values[k] || ""]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const CRC_TABLE = (() => { const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function buildZip(files) {
  const enc = new TextEncoder();
  const parts = files.map((f) => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data) }));
  let total = 0;
  for (const p of parts) total += 30 + p.name.length + p.data.length;
  for (const p of parts) total += 46 + p.name.length;
  total += 22;
  const out = new Uint8Array(total); const dv = new DataView(out.buffer); let p = 0;
  const w16 = (v) => { dv.setUint16(p, v, true); p += 2; };
  const w32 = (v) => { dv.setUint32(p, v >>> 0, true); p += 4; };
  const wb = (u) => { out.set(u, p); p += u.length; };
  const offsets = [];
  for (const f of parts) { offsets.push(p);
    w32(0x04034b50); w16(20); w16(0x0800); w16(0); w16(0); w16(0);
    w32(f.crc); w32(f.data.length); w32(f.data.length); w16(f.name.length); w16(0); wb(f.name); wb(f.data); }
  const cdStart = p;
  for (let i = 0; i < parts.length; i++) { const f = parts[i];
    w32(0x02014b50); w16(20); w16(20); w16(0x0800); w16(0); w16(0); w16(0);
    w32(f.crc); w32(f.data.length); w32(f.data.length);
    w16(f.name.length); w16(0); w16(0); w16(0); w16(0); w32(0); w32(offsets[i]); wb(f.name); }
  const cdSize = p - cdStart;
  w32(0x06054b50); w16(0); w16(0); w16(parts.length); w16(parts.length); w32(cdSize); w32(cdStart); w16(0);
  return out;
}

async function saveState(env, cors, id) {
  const r = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!r) return json({ error: "not found" }, 404, cors);
  const { results: phs } = await env.DB.prepare(
    "SELECT * FROM photos WHERE project_id=? ORDER BY sort").bind(id).all();
  const files = [{ name: "data.csv", data: new TextEncoder().encode(buildDataCsv(safeJson(r.values_json))) }];
  const counter = {}, used = new Set();
  for (const ph of phs || []) {
    const base = CAT_FILE[ph.category] || "photo";
    const n = (counter[base] = (counter[base] || 0) + 1);
    let name = `${base}-${String(n).padStart(2, "0")}.${ph.ext || "jpg"}`;
    while (used.has(name)) name = `${base}-${String(n).padStart(2, "0")}-${uid().slice(0, 4)}.${ph.ext || "jpg"}`;
    used.add(name);
    const obj = await env.BUCKET.get(keyOrig(ph));
    if (!obj) continue;
    files.push({ name: `images/${name}`, data: new Uint8Array(await obj.arrayBuffer()) });
  }
  const zip = buildZip(files);
  const addr = (safeJson(r.values_json).street || "property").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "property";
  const headers = new Headers(cors);
  headers.set("content-type", "application/zip");
  headers.set("content-disposition", `attachment; filename="dezzy-save-${addr}.zip"`);
  return new Response(zip, { headers });
}

// ------------------------------------------------------------------ AI proxy
async function aiProxy(request, env, cors) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "AI not configured on server" }, 501, cors);
  const body = await request.text();
  if (body.length > 40 * 1024 * 1024) return json({ error: "request too large" }, 413, cors);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body,
  });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { ...cors, "content-type": "application/json" } });
}
