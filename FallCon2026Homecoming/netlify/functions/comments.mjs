/**
 * Shared comment store for review.html.
 *
 * Each pin is a THREAD: an opening comment plus replies. Anyone reviewing the
 * page may edit or delete anything -- there are no owners and no auth. That is
 * deliberate, and it means a delete is permanent for everybody.
 *
 * GET    /.netlify/functions/comments?page=<id>   -> { comments: [...] }
 * POST   /.netlify/functions/comments             -> { comments: [...] }
 *        body: { page, note:  { id, text, name, anchor, created } }   upsert thread
 *        body: { page, threadId, reply: { id, text, name, created } } upsert reply
 * DELETE /.netlify/functions/comments             -> { comments: [...] }
 *        body: { page, id }                        delete a whole thread
 *        body: { page, threadId, replyId }         delete one reply
 *
 * Storage is Netlify Blobs: no database to provision, no third-party account,
 * and it is scoped to this site automatically.
 */
import { getStore } from '@netlify/blobs';

const MAX_NOTES   = 500;        // a runaway client cannot fill the store
const MAX_REPLIES = 200;        // per thread
const MAX_TEXT  = 4000;
const MAX_NAME  = 80;

/* the page may be opened from the Netlify URL or a custom domain */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'cache-control': 'no-store'
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...CORS }
});

/* 204 must not carry a body -- constructing one with JSON throws. */
const noContent = () => new Response(null, { status: 204, headers: CORS });

const clean = (s, max) => String(s == null ? '' : s).slice(0, max);

/* One blob per page, so several review pages can share this function. */
const keyFor = (page) => 'notes-' + (clean(page, 60).replace(/[^a-zA-Z0-9_-]/g, '_') || 'default');

export default async (req) => {
  if (req.method === 'OPTIONS') return noContent();

  const url = new URL(req.url);
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return json(405, { error: 'Method not allowed' });

  /* Validate the payload BEFORE touching storage, so a bad request reads as a
     400 rather than a storage error. */
  let body = {};
  if (req.method !== 'GET') {
    body = await req.json().catch(() => ({}));
    if (req.method === 'POST') {
      const n = body.note || body.reply || {};
      if (!n.id || !clean(n.text, MAX_TEXT).trim()) return json(400, { error: 'A comment needs an id and some text.' });
      if (body.reply && !body.threadId) return json(400, { error: 'A reply needs the thread it belongs to.' });
    }
  }

  try {
    /* Inside the try: without the Netlify runtime this throws, and callers
       should see the JSON error below rather than an unhandled crash. */
    const store = getStore({ name: 'fallcon-review', consistency: 'strong' });

    if (req.method === 'GET') {
      const key = keyFor(url.searchParams.get('page'));
      const notes = (await store.get(key, { type: 'json' })) || [];
      return json(200, { comments: notes });
    }

    const key = keyFor(body.page);
    let notes = (await store.get(key, { type: 'json' })) || [];

    const asEntry = (n) => ({
      id: clean(n.id, 40),
      text: clean(n.text, MAX_TEXT),
      name: clean(n.name, MAX_NAME),
      created: clean(n.created, 40) || new Date().toISOString(),
      updated: new Date().toISOString()
    });

    if (req.method === 'POST' && body.reply) {
      const t = notes.find((x) => x.id === clean(body.threadId, 40));
      if (!t) return json(404, { error: 'That comment thread no longer exists.' });
      const reply = asEntry(body.reply);
      t.replies = Array.isArray(t.replies) ? t.replies : [];
      const i = t.replies.findIndex((x) => x.id === reply.id);
      if (i >= 0) t.replies[i] = reply; else t.replies.push(reply);
      if (t.replies.length > MAX_REPLIES) t.replies = t.replies.slice(-MAX_REPLIES);
    } else if (req.method === 'POST') {
      const n = body.note;
      const i = notes.findIndex((x) => x.id === clean(n.id, 40));
      const note = Object.assign(asEntry(n), {
        anchor: {
          id:    clean(n.anchor?.id, 60),
          label: clean(n.anchor?.label, 60),
          xPct:  Number(n.anchor?.xPct) || 0,
          yPct:  Number(n.anchor?.yPct) || 0,
          pageY: Number(n.anchor?.pageY) || 0
        },
        /* an edit must not wipe the discussion hanging off the thread */
        replies: (i >= 0 && Array.isArray(notes[i].replies)) ? notes[i].replies : []
      });
      if (i >= 0) notes[i] = note; else notes.push(note);
      if (notes.length > MAX_NOTES) notes = notes.slice(-MAX_NOTES);
    } else if (body.replyId) {
      const t = notes.find((x) => x.id === clean(body.threadId, 40));
      if (t && Array.isArray(t.replies)) {
        t.replies = t.replies.filter((x) => x.id !== clean(body.replyId, 40));
      }
    } else {
      notes = notes.filter((x) => x.id !== clean(body.id, 40));   // whole thread
    }

    /* older records predate threads */
    notes.forEach((n) => { if (!Array.isArray(n.replies)) n.replies = []; });

    notes.sort((a, b) => (a.anchor?.pageY || 0) - (b.anchor?.pageY || 0));
    await store.setJSON(key, notes);
    return json(200, { comments: notes });
  } catch (err) {
    return json(500, { error: 'Comment store unavailable: ' + (err && err.message) });
  }
};
