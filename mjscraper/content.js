// Card harvester + thumbnail fetcher for the Midjourney explore grid.
//
// This script does NOT scroll. Midjourney's feed only paginates in response to
// trusted input events, and nothing a content script can do produces one:
//
//   window.scrollBy        no-op — body is overflow-y:hidden, the window has
//                          nothing to scroll (the scroller is div#pageScroll)
//   #pageScroll.scrollTop  moves the view, even to the very bottom, but loads
//                          nothing — card count stays flat
//   synthetic WheelEvent   ignored; doesn't even move the scroll position
//   real mouse wheel       "Loading more..." — 21 cards -> 42
//
// So scrolling is driven from the service worker via chrome.debugger, which can
// dispatch trusted wheel events. All this file does is report cards and fetch
// bytes when asked.
//
// No ES imports: MV3 content scripts don't support them.

// Loads two ways — declaratively on page load, and via executeScript when the
// worker finds no listener (any tab opened before the extension was installed).
// The sentinel makes the second path a no-op instead of a redeclaration error.
if (window.__mjGrabberLoaded) {
  // already present in this tab
} else {
  window.__mjGrabberLoaded = true;

const CARD_RE = /^\/jobs\/([0-9a-f-]{36})\?index=(\d+)/;

// Cards already reported this run. The grid keeps every loaded card in the DOM
// (they're absolutely positioned in a tall container rather than recycled), so
// each harvest re-sees everything — this is what makes it incremental.
let seen = new Set();

/** The element that actually scrolls. Confirmed to be div#pageScroll. */
function scroller() {
  const byId = document.getElementById('pageScroll');
  if (byId) return byId;
  // Fall back to the tallest scrollable container holding cards, in case that
  // id changes.
  let best = null;
  for (const el of document.querySelectorAll('div')) {
    if (!/auto|scroll|overlay/.test(getComputedStyle(el).overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 50) continue;
    if (!el.querySelector('a[href^="/jobs/"]')) continue;
    if (!best || el.scrollHeight > best.scrollHeight) best = el;
  }
  return best;
}

function harvest() {
  const fresh = [];
  for (const a of document.querySelectorAll('a[href^="/jobs/"]')) {
    const m = CARD_RE.exec(a.getAttribute('href') || '');
    if (!m) continue;
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push({ id: m[1], index: Number(m[2]) });
  }
  const el = scroller();
  return {
    cards: fresh,
    total: seen.size,
    atBottom: el ? el.scrollHeight - el.clientHeight - el.scrollTop < 400 : false,
    loadingMore: document.body.innerText.includes('Loading more'),
  };
}

/**
 * Fetch thumbnails here in the page, not in the worker.
 *
 * cdn.midjourney.com sits behind bot protection that 403s anything without a
 * browser fingerprint and the site's cookies — verified: curl and Node get 403
 * under every combination of User-Agent, Referer, Origin and Accept, while a
 * fetch from this context returns 200.
 *
 * Plain fetch, deliberately: the CDN sends no explicit
 * Access-Control-Allow-Origin, so adding credentials:'include' makes the
 * request fail CORS outright ("Failed to fetch"). Also verified both ways.
 *
 * Returns base64 with no data: prefix. The API key never comes down here.
 */
async function fetchThumbs(urls) {
  return Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const bytes = new Uint8Array(await res.arrayBuffer());
      // A single spread into btoa overflows the stack on larger images; chunk it.
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return { b64: btoa(bin) };
    } catch (e) {
      return { error: String(e?.message || e).slice(0, 120) };
    }
  }));
}

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.cmd === 'fetchThumbs') {
    fetchThumbs(msg.urls).then((results) => respond({ ok: true, results }));
    return true;
  }
  if (msg?.cmd === 'harvest') {
    respond({ ok: true, ...harvest() });
  } else if (msg?.cmd === 'resetSeen') {
    seen = new Set();
    respond({ ok: true });
  } else if (msg?.cmd === 'ping') {
    const el = scroller();
    respond({
      ok: true,
      width: window.innerWidth,
      height: window.innerHeight,
      hasScroller: Boolean(el),
      scrollerId: el?.id || null,
    });
  }
  return true;
});

} // end __mjGrabberLoaded guard
