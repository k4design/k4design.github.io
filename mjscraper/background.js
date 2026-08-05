// Run orchestration, Claude vision batching, and downloads.
//
// All Claude calls live here so the API key never enters a page context. Run
// state lives here too, so closing the panel doesn't kill an in-flight run.

import {
  thumbUrl, fullUrl, downloadPath, estimateCost, modelById, DEFAULT_MODEL,
} from './lib/mj.js';
const BATCH_SIZE = 6;       // thumbnails per request
const MAX_INFLIGHT = 2;     // concurrent vision requests
const MAX_RETRIES = 4;

const blank = () => ({
  active: false,
  model: DEFAULT_MODEL,
  subject: '',
  target: 0,
  maxCards: 0,
  maxMs: 0,
  startedAt: 0,
  tabId: null,
  scanned: 0,
  judged: 0,
  matches: 0,
  downloaded: 0,
  errors: 0,
  refusals: 0,
  feedDone: false,   // scroll loop ended; drain finishes the remaining queue
  inTokens: 0,
  outTokens: 0,
  stopReason: null,
  log: [],
});

let state = blank();
let queue = [];       // job refs awaiting judgement
let inflight = 0;
let draining = false;

function log(line) {
  state.log.unshift(`${new Date().toLocaleTimeString()}  ${line}`);
  if (state.log.length > 120) state.log.length = 120;
}

// ---------------------------------------------------------------- vision

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          match: { type: 'boolean' },
          slug: { type: 'string' },
        },
        required: ['index', 'match', 'slug'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdicts'],
  additionalProperties: false,
};

function judgePrompt(subject, n) {
  return [
    `You are shown ${n} images, numbered 0 to ${n - 1} in the order given.`,
    '',
    `Subject to match: "${subject}"`,
    '',
    'For each image return:',
    '  index — its position in the list',
    '  match — true only if the image genuinely depicts the subject. Judge what is',
    '          actually in the picture. Be strict: a loose thematic association is',
    '          not a match.',
    '  slug  — 3 to 6 plain lowercase words describing what the image actually',
    '          shows, for use as a filename. No punctuation. Fill this in for',
    '          every image, including non-matches.',
    '',
    'Return a verdict for every image, in order.',
  ].join('\n');
}

/**
 * Ask the content script for thumbnail bytes.
 *
 * The worker can't fetch these itself: cdn.midjourney.com is behind bot
 * protection that 403s requests without the browser's fingerprint and cookies
 * (verified — curl/Node get 403 under every header combination; a page-context
 * fetch gets 200). So the page fetches, and the worker keeps the API key.
 *
 * Returns one entry per ref, `null` where the thumbnail couldn't be fetched.
 */
async function fetchThumbBlocks(refs) {
  const urls = refs.map((r) => thumbUrl(r.id, r.index));
  const res = await chrome.tabs.sendMessage(state.tabId, { cmd: 'fetchThumbs', urls });
  if (!res?.ok) throw new Error('content script did not return thumbnails');
  return res.results.map((r) =>
    r.b64
      ? { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: r.b64 } }
      : { error: r.error || 'unknown' },
  );
}

async function callClaude(apiKey, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required when calling the API from a browser-ish context; the service
        // worker sends an Origin header, which the API rejects without this.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new Error(`api ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const after = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(after) && after > 0
      ? after * 1000
      : Math.min(30000, 1000 * 2 ** attempt);
    log(`api ${res.status} — retrying in ${Math.round(waitMs / 1000)}s`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

async function judgeBatch(apiKey, refs) {
  const fetched = await fetchThumbBlocks(refs);
  const blocks = [];
  const kept = [];
  fetched.forEach((entry, i) => {
    if (entry.error) {
      state.errors++;
      log(`thumb failed ${refs[i].id.slice(0, 8)}: ${entry.error}`);
    } else {
      blocks.push(entry);
      kept.push(refs[i]);
    }
  });
  if (!kept.length) return [];

  // Build the request to the selected model's capabilities. Sending a parameter
  // a model doesn't accept is a 400, so these are conditional rather than
  // uniform: `effort` errors on Haiku 4.5, and Haiku 4.5 predates the
  // thinking-disabled config (it doesn't think unless asked, so we say nothing).
  const m = modelById(state.model);
  const body = {
    model: m.id,
    max_tokens: 1024,
    output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    messages: [{
      role: 'user',
      content: [...blocks, { type: 'text', text: judgePrompt(state.subject, kept.length) }],
    }],
  };
  // A yes/no visual match needs no reasoning tokens. Disabling thinking is
  // legal only at effort `high` or below, and `low` is what we want anyway.
  if (m.noThink) body.thinking = { type: 'disabled' };
  if (m.effort) body.output_config.effort = 'low';

  const data = await callClaude(apiKey, body);

  if (data.usage) {
    state.inTokens += data.usage.input_tokens || 0;
    state.outTokens += data.usage.output_tokens || 0;
  }

  // Opus 5's classifiers decline with HTTP 200 and possibly empty content.
  // Check this before touching content, and treat a decline as "no matches"
  // rather than letting it take down the run.
  if (data.stop_reason === 'refusal') {
    state.refusals++;
    log(`batch refused (${data.stop_details?.category ?? 'no category'}) — skipping ${kept.length}`);
    return [];
  }

  const text = (data.content || []).find((b) => b.type === 'text')?.text;
  if (!text) {
    state.errors++;
    log('batch returned no text block — skipping');
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    state.errors++;
    log('batch returned unparseable JSON — skipping');
    return [];
  }

  const out = [];
  for (const v of parsed.verdicts || []) {
    const ref = kept[v.index];
    if (!ref) continue;
    if (v.match) out.push({ ...ref, slug: v.slug });
  }
  return out;
}

// ---------------------------------------------------------------- downloads

function download(ref) {
  return new Promise((resolve) => {
    chrome.downloads.download(
      {
        url: fullUrl(ref.id, ref.index),
        filename: downloadPath(state.subject, ref.slug, ref.id),
        conflictAction: 'uniquify',
        // Must be explicit. With saveAs omitted, Chrome follows the global
        // "Ask where to save each file before downloading" preference, which
        // raises a file chooser per image — one dialog per match. Passing false
        // overrides that preference for this extension only, leaving normal
        // browser downloads to keep prompting.
        saveAs: false,
      },
      (id) => {
        if (chrome.runtime.lastError || id === undefined) {
          state.errors++;
          log(`download failed ${ref.id.slice(0, 8)}: ${chrome.runtime.lastError?.message ?? 'unknown'}`);
        } else {
          state.downloaded++;
        }
        resolve();
      },
    );
  });
}

// ---------------------------------------------------------------- run loop

function limitHit() {
  if (!state.active) return 'stopped';
  if (state.matches >= state.target) return 'target reached';
  if (state.scanned >= state.maxCards) return 'card limit reached';
  if (Date.now() - state.startedAt >= state.maxMs) return 'time limit reached';
  return null;
}

async function drain() {
  if (draining) return;
  draining = true;

  while (state.active && (queue.length || inflight)) {
    const reason = limitHit();
    if (reason) { finish(reason); break; }

    if (!queue.length || inflight >= MAX_INFLIGHT) {
      await new Promise((r) => setTimeout(r, 150));
      continue;
    }

    const batch = queue.splice(0, BATCH_SIZE);
    inflight++;
    const apiKey = state.apiKey;

    (async () => {
      try {
        const matches = await judgeBatch(apiKey, batch);
        state.judged += batch.length;
        state.matches += matches.length;
        if (matches.length) {
          log(`${matches.length}/${batch.length} matched — ${matches.map((m) => m.slug).join(', ')}`);
          for (const m of matches) await download(m);
        }
      } catch (e) {
        state.errors++;
        log(`batch error: ${e.message}`);
      } finally {
        inflight--;
      }
    })();
  }

  draining = false;

  // The scroll loop stops as soon as the feed stops yielding cards, but batches
  // may still have been in flight at that moment. Whoever empties the queue
  // last closes out the run.
  if (state.active && state.feedDone && !queue.length && !inflight) {
    finish('end of feed');
  }
}

function finish(reason) {
  if (!state.active) return;
  state.active = false;
  state.stopReason = reason;
  queue = [];
  if (state.tabId != null) detachDebugger(state.tabId);
  const cost = estimateCost(state.model, state.inTokens, state.outTokens);
  log(
    `Done — ${reason}. scanned ${state.scanned}, judged ${state.judged}, ` +
    `matched ${state.matches}, downloaded ${state.downloaded}, ` +
    `errors ${state.errors}, refusals ${state.refusals}, ~$${cost.toFixed(3)}`,
  );
}

/** Content script alive in this tab? Returns its ping payload, or null. */
async function ping(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { cmd: 'ping' });
    return res?.ok ? res : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------- trusted scrolling

// Midjourney's feed only paginates on trusted input. chrome.debugger is the one
// way an extension can produce that: Input.dispatchMouseEvent goes in through
// the same path as real input, so the page can't tell the difference. Everything
// cheaper was tried and fails — see the note at the top of content.js.

let attached = false;

async function attachDebugger(tabId) {
  if (attached) return;
  await chrome.debugger.attach({ tabId }, '1.3');
  attached = true;
}

async function detachDebugger(tabId) {
  if (!attached) return;
  attached = false;
  try { await chrome.debugger.detach({ tabId }); } catch {}
}

/**
 * One round of wheel scrolling. Sent as a burst of ordinary-sized ticks rather
 * than one huge delta, to look like a real wheel and to let the feed's loader
 * keep up.
 */
async function wheel(tabId, x, y, totalDelta) {
  const TICK = 120;                                  // ~one physical wheel notch
  const ticks = Math.max(1, Math.round(totalDelta / TICK));
  for (let i = 0; i < ticks; i++) {
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x, y,
      deltaX: 0,
      deltaY: TICK,
      modifiers: 0,
      pointerType: 'mouse',
    });
    await new Promise((r) => setTimeout(r, 50));
  }
}

// Consecutive rounds yielding no new cards before we call it the end of the feed.
const DRY_LIMIT = 6;
const SETTLE_MS = 900;   // let the feed load after a scroll burst

async function scrollLoop(tabId, viewport) {
  const x = Math.round(viewport.width / 2);
  const y = Math.round(viewport.height / 2);
  const step = Math.round(viewport.height * 0.85);
  let dry = 0;

  while (state.active) {
    let h;
    try {
      h = await chrome.tabs.sendMessage(tabId, { cmd: 'harvest' });
    } catch {
      log('lost the tab — stopping');
      finish('tab closed or navigated');
      return;
    }
    if (!h?.ok) { finish('harvest failed'); return; }

    if (h.cards.length) {
      state.scanned += h.cards.length;
      queue.push(...h.cards);
      dry = 0;
      drain();
    } else if (!h.loadingMore) {
      // Only count a round as dry once the feed isn't visibly still loading.
      if (++dry >= DRY_LIMIT) {
        log(`no new cards in ${DRY_LIMIT} rounds — feed appears exhausted`);
        if (!queue.length && !inflight) finish('end of feed');
        else state.feedDone = true;
        return;
      }
    }

    if (limitHit()) return;

    try {
      await wheel(tabId, x, y, step);
    } catch (e) {
      log(`scroll failed: ${e.message}`);
      finish('scrolling failed');
      return;
    }
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  }
}

async function start(cfg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.midjourney\.com\//.test(tab.url || '')) {
    return { ok: false, error: 'Open a midjourney.com explore tab first.' };
  }

  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) return { ok: false, error: 'Add your Anthropic API key first.' };

  state = blank();
  state.active = true;
  state.apiKey = apiKey;
  // modelById falls back to the default, so a stale id in storage (from a
  // renamed or retired model) can't put the run into a 404 loop.
  state.model = modelById(cfg.model).id;
  state.subject = cfg.subject;
  state.target = cfg.target;
  state.maxCards = cfg.maxCards;
  state.maxMs = cfg.maxMinutes * 60_000;
  state.startedAt = Date.now();
  state.tabId = tab.id;
  queue = [];
  log(
    `Started — ${state.model}, subject "${cfg.subject}", target ${cfg.target}, ` +
    `caps ${cfg.maxCards} cards / ${cfg.maxMinutes} min`,
  );

  // A tab that was already open when the extension was installed or reloaded
  // has no content script in it, because declarative injection only happens on
  // page load. Rather than ask for a manual reload, inject on demand. The
  // sentinel in content.js makes a redundant injection a no-op.
  let vp = await ping(tab.id);
  if (!vp) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch (e) {
      state.active = false;
      return { ok: false, error: `Could not inject into the tab: ${e.message}` };
    }
    vp = await ping(tab.id);
    if (!vp) {
      state.active = false;
      return { ok: false, error: 'Injected but got no response — try reloading the explore tab.' };
    }
    log('injected content script into an already-open tab');
  }

  if (!vp.hasScroller) {
    state.active = false;
    return { ok: false, error: 'No scrollable feed found — is this the explore page?' };
  }

  await chrome.tabs.sendMessage(tab.id, { cmd: 'resetSeen' });

  try {
    await attachDebugger(tab.id);
  } catch (e) {
    state.active = false;
    return {
      ok: false,
      error: /already attached|Another debugger/i.test(e.message)
        ? 'Close DevTools on the explore tab first — the debugger can only attach once.'
        : `Could not attach the debugger: ${e.message}`,
    };
  }

  log(`scrolling via trusted wheel events (${vp.width}x${vp.height})`);
  scrollLoop(tab.id, vp);
  drain();
  return { ok: true };
}

// The UI is a side panel rather than a popup, because a popup closes the instant
// it loses focus — and this run steals focus constantly (the debugger dispatches
// wheel events into the tab). Chrome offers no way to keep a popup open, so the
// panel is the only way to stay visible for the whole run. It persists until the
// user closes it.
//
// setPanelBehavior makes a toolbar click open the panel; it's set on both
// install and startup because the service worker can be torn down and revived.
function enablePanel() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.warn('side panel unavailable:', e.message));
}
chrome.runtime.onInstalled.addListener(enablePanel);
chrome.runtime.onStartup.addListener(enablePanel);
enablePanel();

// The content script is purely request/response — the worker pulls harvests
// and pushes wheel events, so there are no inbound card notifications.
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.cmd === 'start') {
    start(msg.cfg).then(respond);
    return true;
  } else if (msg?.cmd === 'stop') {
    finish('stopped by user');
    respond({ ok: true });
  } else if (msg?.cmd === 'state') {
    const { apiKey, ...safe } = state;
    respond({
      ...safe,
      hasKey: Boolean(apiKey),
      queued: queue.length,
      cost: estimateCost(state.model, state.inTokens, state.outTokens),
      elapsedMs: state.startedAt ? Date.now() - state.startedAt : 0,
    });
  }
  return true;
});
