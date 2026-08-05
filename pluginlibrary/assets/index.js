/* ============================================================
   Library index — categorised list on the left, selected guide in
   a frame on the right. Reads the PLUGINS / CATEGORIES lists from
   plugins.js; adding a plugin means one entry there plus a guide
   file, and nothing here needs touching.

   No fetch anywhere, so this works opened straight off disk.
   ============================================================ */

const app         = document.getElementById('app');
const list        = document.getElementById('list');
const emptyState  = document.getElementById('emptyState');
const search      = document.getElementById('search');
const count       = document.getElementById('count');
const pane        = document.getElementById('pane');
const paneBar     = document.getElementById('paneBar');
const frame       = document.getElementById('frame');
const placeholder = document.getElementById('placeholder');
const where       = document.getElementById('where');
const openFull    = document.getElementById('openFull');
const backToList  = document.getElementById('backToList');

const esc = (s) => String(s).replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 2026-07-28 -> JUL 2026. Dates stay plain strings so they sort
   correctly as-is; only display needs formatting. */
function formatUpdated(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const months = ['jan','feb','mar','apr','may','jun',
                  'jul','aug','sep','oct','nov','dec'];
  return `${months[+m[2] - 1]} ${m[1]}`;
}

/* Retired last, then newest first. */
function byStatusThenDate(a, b) {
  const retired = p => (p.status === 'retired' ? 1 : 0);
  return retired(a) - retired(b) ||
         String(b.updated).localeCompare(String(a.updated));
}

/* Categories render in the order CATEGORIES declares. Anything using
   an undeclared category still shows up, grouped at the end, rather
   than silently vanishing from the library. */
function groupsFor(plugins) {
  const declared = typeof CATEGORIES !== 'undefined' ? CATEGORIES : [];
  const extras = [...new Set(plugins.map(p => p.category || 'Uncategorised'))]
    .filter(c => !declared.includes(c))
    .sort();

  return [...declared, ...extras]
    .map(name => ({
      name,
      items: plugins
        .filter(p => (p.category || 'Uncategorised') === name)
        .sort(byStatusThenDate),
    }))
    .filter(g => g.items.length);
}

function matches(p, q) {
  if (!q) return true;
  const haystack = [p.name, p.tagline, p.owner, p.category, ...(p.tags || [])]
    .join(' ').toLowerCase();
  return q.split(/\s+/).every(term => haystack.includes(term));
}

/* Initials for the icon slot when a plugin has no logo yet. Short words
   ("to", "of") are skipped so "Frame to MP4" reads FM, not FT. */
function initials(name) {
  const words = String(name).split(/\s+/).filter(w => w.length > 2);
  return (words.length ? words : String(name).split(/\s+/))
    .slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* `icon` in plugins.js is either an image path or a single emoji. */
function iconHtml(p) {
  if (!p.icon) return `<span class="ico">${esc(initials(p.name))}</span>`;
  const isImage = /[./]/.test(p.icon);
  return isImage
    ? `<span class="ico has-img"><img src="${esc(p.icon)}" alt=""></span>`
    : `<span class="ico is-emoji">${esc(p.icon)}</span>`;
}

function itemHtml(p) {
  return `
    <button class="item${p.status === 'retired' ? ' is-retired' : ''}"
            type="button" data-slug="${esc(p.slug)}">
      ${iconHtml(p)}
      <span class="row">
        <span class="nm">${esc(p.name)}</span>
        <span class="pill ${esc(p.status || '')}">${esc(p.status || '')}</span>
      </span>
      <span class="sub">${esc(p.tagline || '')}</span>
    </button>`;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const hits = PLUGINS.filter(p => matches(p, q));

  list.innerHTML = groupsFor(hits).map(g => `
    <section class="cat">
      <h2 class="cat-name">${esc(g.name)} <span class="n">${g.items.length}</span></h2>
      ${g.items.map(itemHtml).join('')}
    </section>`).join('');

  emptyState.hidden = hits.length > 0;
  count.textContent = `${hits.length} plugin${hits.length === 1 ? '' : 's'}`;
  markCurrent();
}

/* --- selection ------------------------------------------------- */

let currentSlug = null;

function markCurrent() {
  list.querySelectorAll('.item').forEach(el => {
    el.setAttribute('aria-current', String(el.dataset.slug === currentSlug));
  });
}

function select(slug, { push = true } = {}) {
  const p = PLUGINS.find(x => x.slug === slug);
  if (!p) return;

  currentSlug = slug;
  frame.src = p.guide;
  frame.hidden = false;
  paneBar.hidden = false;
  placeholder.hidden = true;
  /* version is optional — not every plugin numbers its releases */
  where.textContent = [
    p.name,
    p.version ? `v${p.version}` : null,
    p.updated ? `updated ${formatUpdated(p.updated)}` : null,
  ].filter(Boolean).join(' · ');
  openFull.href = p.guide;
  document.title = `${p.name} — Plugin Library`;

  /* On narrow screens the two panes become one at a time. */
  app.classList.add('showing-guide');
  pane.scrollTop = 0;

  if (push && location.hash.slice(1) !== slug) location.hash = slug;
  markCurrent();
}

function showList() {
  app.classList.remove('showing-guide');
}

/* --- routing: the hash is the selected plugin, so a guide can be
       linked, bookmarked, and survives a reload ------------------ */

function syncFromHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (slug && slug !== currentSlug) select(slug, { push: false });
}

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.item');
  if (btn) select(btn.dataset.slug);
});

backToList.addEventListener('click', showList);
search.addEventListener('input', render);
window.addEventListener('hashchange', syncFromHash);

render();
syncFromHash();
