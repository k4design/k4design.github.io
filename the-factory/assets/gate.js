/* ============================================================
   Client-side password gate.

   HONEST LIMITS — read before putting anything here:
   this keeps casual visitors out, nothing more. The password
   hash and every guide file are public in view-source, so a
   determined person reads the guides. Treat these pages as
   "internal, not secret": no API keys, tokens, client names,
   or unreleased deal details in a guide. If a plugin needs a
   secret, write "ask Kyle for the key" instead of printing it.
   The noindex meta + robots.txt do the real work of keeping
   these out of search results.

   TO CHANGE THE PASSWORD
   1. Get the hash of the new password. In a browser console:
        crypto.subtle.digest('SHA-256', new TextEncoder().encode('newpassword'))
          .then(b => console.log([...new Uint8Array(b)]
            .map(x => x.toString(16).padStart(2,'0')).join('')))
   2. Paste it into PASSWORD_SHA256 below. That's it.
   ============================================================ */

const PASSWORD_SHA256 =
  'b42ea9b2d0cf52e4620d7d8c06c4478aa32cb0cbbee21fdf69a7cdce1c33aba4'; // "skunkworks"

const SESSION_KEY = 'k4-the-factory';

/* Depth-aware paths so guides/ pages resolve the same links as the root. */
const ROOT = location.pathname.includes('/guides/') ? '../' : './';

/* Guides open both standalone and inside the index's right-hand pane.
   Flag the framed case so a guide can drop the chrome the library is
   already showing (its own back link, its own name and version). */
if (window.top !== window.self) {
  document.documentElement.classList.add('framed');
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Opened straight off disk (file://)? Skip the gate. Whoever has the
   files already has the guides, so a password there protects nothing
   and would only get in the way of previewing a change locally. */
const IS_LOCAL_FILE = location.protocol === 'file:';

/* Private-mode browsers can throw on sessionStorage. Never let that
   break the page — treat it as "not unlocked yet" and re-prompt. */
function stored() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
}

const isUnlocked = () => IS_LOCAL_FILE || stored() === PASSWORD_SHA256;

/* Called from every page except login: bounce out if locked.
   Runs in <head> before paint, so gated content never flashes. */
function requireUnlock() {
  if (isUnlocked()) return;
  /* Remember where they were heading, relative to the library root,
     so a bookmarked guide URL survives the trip through login. */
  const parts = location.pathname.split('/');
  const back = (ROOT === '../' ? 'guides/' : '') + parts.pop() + location.hash;
  location.replace(ROOT + 'login.html?next=' + encodeURIComponent(back));
}

/* Called from login.html only. */
async function attemptUnlock(password) {
  const hash = await sha256Hex(password);
  if (hash !== PASSWORD_SHA256) return false;
  try { sessionStorage.setItem(SESSION_KEY, hash); } catch (e) { /* re-prompts */ }
  return true;
}

/* Where to land after a successful unlock. Only a bare filename or
   a guides/ filename is honoured, so ?next= can't redirect off-site. */
function nextDestination() {
  const raw = new URLSearchParams(location.search).get('next') || '';
  return /^(guides\/)?[\w.-]+\.html(#[\w-]*)?$/.test(raw) && !raw.startsWith('login.')
    ? raw
    : 'index.html';
}

function lock() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clear */ }
  location.replace(ROOT + 'login.html');
}
