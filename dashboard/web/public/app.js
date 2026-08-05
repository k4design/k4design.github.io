'use strict';

/* ============================================================
   State
   ============================================================ */

const S = {
  data: null,
  prevSignatures: null,
  changedIds: new Set(),
  newIds: new Set(),
  changeLog: [],
  filter: '',
  scope: localStorage.getItem('cd.scope') || 'design',
  expanded: new Set(), // capacity rows the user opened; survives refresh
  expandedSubs: new Set(), // parent cards whose subtask drop-down is open
  showRecurring: localStorage.getItem('cd.recurring') === '1',
  kpiPrev: {},
  booted: false,
  pollMs: 30000,
  timer: null,
  lastSeen: Number(localStorage.getItem('cd.lastSeen')) || Date.now(),
  failures: 0,
  // Shared access key for a deployed (internet-reachable) server. Unused
  // locally — localhost isn't exposed, so the local server doesn't demand it.
  accessKey: localStorage.getItem('cd.key') || '',
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// Feeds the boot cascade its position. The CSS caps the multiplier, so a long
// list never trails off; after boot the class is gone and this is inert.
const idx = (node, i) => {
  if (i != null) node.style.setProperty('--i', i);
  return node;
};

/* ============================================================
   Formatting
   ============================================================ */

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function agoShort(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function clockTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Icons pair with every status colour so hue never carries meaning alone.
const ROLE_ICON = { critical: '▲', serious: '◆', warning: '●', good: '✓', neutral: '○' };

function chip(text, role, extraClass) {
  const c = el('span', `chip${extraClass ? ' ' + extraClass : ''}`);
  if (role && role !== 'neutral') {
    c.dataset.role = role;
    c.appendChild(el('span', 'ic', ROLE_ICON[role] || ''));
  }
  c.appendChild(document.createTextNode(text));
  return c;
}

/**
 * The owner chip, present on every card in every panel and always in the same
 * trailing position, so "who has this?" is one scannable column.
 *
 * Initials badge + full name reads at a glance without the name column
 * swallowing the card: two people named Emily are distinguishable, which
 * initials alone ("EE" / "EL") never are.
 */
// Stable colour slot for a person, from the server-built roster. 0 = neutral.
function slotOf(name) {
  return (S.data?.roster && S.data.roster[name]) || 0;
}

function ownerChip(people) {
  if (!people.length) {
    const c = chip('Unassigned', 'warning');
    c.title = 'Nobody owns this yet';
    return c;
  }

  const [first, ...rest] = people;
  const c = el('span', 'chip who');
  c.dataset.slot = String(slotOf(first));
  c.appendChild(el('span', 'av', initials(first)));
  c.appendChild(document.createTextNode(first));
  if (rest.length) c.appendChild(el('span', 'more', `+${rest.length}`));
  c.title = people.length > 1 ? `Assigned to ${people.join(', ')}` : `Assigned to ${first}`;
  return c;
}

/* ============================================================
   Filtering
   ============================================================ */

function matches(item) {
  if (!S.filter) return true;
  const q = S.filter.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    (item.people || []).some((p) => p.toLowerCase().includes(q)) ||
    (item.boardLabel || '').toLowerCase().includes(q) ||
    (item.status || '').toLowerCase().includes(q) ||
    (item.parentName || '').toLowerCase().includes(q)
  );
}

/* ============================================================
   Card rendering
   ============================================================ */

function itemCard(item, opts = {}) {
  const a = el('a', 'card');
  if (opts.plain) a.classList.add('plain');
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.dataset.itemId = item.id;
  a.title = 'Open in monday.com';
  // Colour-codes the row by its first assignee. A scanning aid only — the
  // initials badge and name below carry the actual identity.
  a.dataset.slot = String(slotOf((item.people || [])[0]));
  idx(a, opts.i);

  // This leaves the app and opens a new tab. Flag it on hover instead of
  // surprising the user — and keep it out of the tab order and screen-reader
  // text, since the link's own label already carries the destination.
  const go = el('span', 'go', '↗');
  go.setAttribute('aria-hidden', 'true');
  a.appendChild(go);

  if (S.changedIds.has(item.id)) a.classList.add('flashed');
  if (S.newIds.has(item.id)) a.classList.add('is-new');

  const top = el('div', 'top');
  if (opts.rank != null) top.appendChild(el('span', 'rank', String(opts.rank)));

  const name = el('span', 'name');
  name.textContent = item.name;
  if (item.isSub && item.parentName) {
    name.textContent = item.name;
    name.title = `${item.parentName} → ${item.name}`;
  }
  top.appendChild(name);
  a.appendChild(top);

  const meta = el('div', 'meta');

  if (item.isSub && item.parentName && !opts.insideParent) {
    meta.appendChild(chip(`in ${item.parentName}`, null, 'board'));
  }

  // reason chips come pre-sorted by severity from the server
  let reasonKinds = new Set();
  if (opts.reasons && item.reasons) {
    for (const r of item.reasons.slice(0, opts.maxReasons || 3)) {
      meta.appendChild(chip(r.text, r.role));
      reasonKinds.add(r.kind);
    }
  }

  if (opts.extraChips) {
    for (const c of opts.extraChips) {
      if (c) meta.appendChild(chip(c.text, c.role, c.cls));
    }
  }

  if (opts.showStatus && item.status) meta.appendChild(chip(item.status, null, 'board'));

  // A Cold listing is deliberately absent from the alert panels; say so wherever
  // it does appear, so its absence elsewhere isn't a mystery.
  if (item.alertSuppressed && item.temperature) {
    const c = chip(`${item.temperature} — no alerts`, null, 'cold');
    c.prepend(el('span', 'ic', '❄'));
    c.title = 'Marked ' + item.temperature + ' on the board, so it is excluded from alerts';
    meta.appendChild(c);
  }

  if (opts.showBoard) meta.appendChild(chip(item.boardLabel, null, 'board'));

  // Owner goes last on every card, so it lands in a consistent place no matter
  // which panel the card is in. Skipped when a reason chip already said
  // "Unassigned", or inside a per-person drawer where it would repeat the
  // heading the user just clicked.
  if (!reasonKinds.has('unassigned') && !opts.hideOwner) {
    meta.appendChild(ownerChip(item.people || []));
  }

  if (meta.childNodes.length) a.appendChild(meta);

  // A parent with subtasks becomes a small group: the card (still a plain link
  // to monday) plus a toggle bar that drops the children down beneath it. The
  // bar is a real <button>, so the link and the toggle never fight.
  if (item.children?.length && !opts.insideParent) {
    const wrap = el('div', 'cardwrap');
    idx(wrap, opts.i);
    wrap.appendChild(a);

    const open = S.expandedSubs.has(item.id);
    const bar = el('button', 'subbar');
    bar.type = 'button';
    bar.setAttribute('aria-expanded', String(open));
    const caret = el('span', 'caret', '▸');
    caret.setAttribute('aria-hidden', 'true');
    bar.appendChild(caret);
    bar.appendChild(
      document.createTextNode(
        `${item.subCount} subtask${item.subCount === 1 ? '' : 's'}` +
          (item.openSubCount !== item.subCount ? ` · ${item.openSubCount} open` : '')
      )
    );
    wrap.appendChild(bar);

    const subs = el('div', 'subs');
    subs.hidden = !open;
    const fill = () => {
      if (subs.childElementCount) return;
      item.children.forEach((child, ci) => {
        subs.appendChild(
          itemCard(child, { plain: true, insideParent: true, showStatus: true, i: ci })
        );
      });
    };
    if (open) fill();

    bar.addEventListener('click', () => {
      const now = !S.expandedSubs.has(item.id);
      if (now) S.expandedSubs.add(item.id);
      else S.expandedSubs.delete(item.id);
      bar.setAttribute('aria-expanded', String(now));
      subs.hidden = !now;
      if (now) fill();
    });

    wrap.appendChild(subs);
    return wrap;
  }
  return a;
}

/**
 * An empty panel has two very different causes, and conflating them is a
 * wayfinding failure: "nothing is stuck" is good news, "your filter hid it" is
 * a dead end. Say which, and when it's the filter, offer the way back.
 */
function emptyState(msg, icon) {
  const e = el('div', 'empty');
  if (S.filter) {
    e.appendChild(el('span', 'big', '⌕'));
    e.appendChild(document.createTextNode(`Nothing here matches “${S.filter}”.`));
    const btn = el('button', 'clear-filter', 'Show everything');
    btn.addEventListener('click', clearFilter);
    e.appendChild(btn);
  } else {
    e.appendChild(el('span', 'big', icon || '✓'));
    e.appendChild(document.createTextNode(msg));
  }
  return e;
}

function renderList(node, items, opts, emptyMsg, emptyIcon) {
  node.replaceChildren();
  const shown = items.filter(matches);
  if (!shown.length) {
    node.appendChild(emptyState(emptyMsg, emptyIcon));
    return 0;
  }
  let rank = 1;
  shown.slice(0, opts.limit || 40).forEach((item, i) => {
    node.appendChild(itemCard(item, { ...opts, i, rank: opts.ranked ? rank++ : undefined }));
  });
  return shown.length;
}

/* ============================================================
   Panels
   ============================================================ */

function renderKpis(d) {
  const h = d.headline;

  const set = (id, val, footId, foot) => {
    const n = $(id);
    const prev = S.kpiPrev[id];
    const moved = prev !== undefined && prev !== val;

    n.textContent = val;
    n.classList.toggle('is-zero', val === 0);
    S.kpiPrev[id] = val;

    // A KPI moving is rare and worth noticing, so it earns a cue — but only
    // on an actual change, never on the 30s repaint. Reset the class and force
    // a reflow so the animation retriggers.
    if (moved) {
      n.classList.remove('changed');
      void n.offsetWidth;
      n.classList.add('changed');
    }

    if (footId && foot != null) $(footId).textContent = foot;
  };

  const oldest = d.review[0];
  set(
    'kpiReview',
    h.needsReview,
    'kpiReviewFoot',
    h.needsReview === 0
      ? 'Queue is clear'
      : oldest
        ? `oldest waiting ${oldest.daysStale}d — ${oldest.name}`
        : ''
  );

  const worst = d.deadlines.overdue[0];
  set('kpiOverdue', h.overdue, 'kpiOverdueFoot', worst ? `worst ${worst.daysOverdue}d late` : 'nothing past due');
  set('kpiStalled', h.blocked);
  set('kpiRot', h.rotting, 'kpiRotFoot', `untouched ${d.thresholds.staleWarnDays}+ days`);
  set(
    'kpiIntake',
    d.intake.length,
    'kpiIntakeFoot',
    h.untriaged ? `${h.untriaged} sitting ${d.thresholds.intakeTriageWarnDays}+ days` : 'all fresh'
  );
}

// Sized so the ranked list fills the tab without scrolling on a standard
// desktop. It's a priority list, not an inventory — the tail isn't the point.
const FOCUS_LIMIT = 10;
const FOCUS_LIMIT_WALL = 7; // wallboard type is larger, so fewer rows fit

function focusLimit() {
  return document.body.classList.contains('wallboard') ? FOCUS_LIMIT_WALL : FOCUS_LIMIT;
}

function renderFocus(d) {
  const lim = focusLimit();
  const n = renderList(
    $('focus'),
    d.focus,
    { ranked: true, reasons: true, maxReasons: 3, showBoard: true, limit: lim },
    'Nothing is urgent. Genuinely.',
    '✓'
  );
  $('focusCount').textContent = !n ? '' : n > lim ? `top ${lim} of ${n}` : String(n);
}

function renderRail(d) {
  const node = $('rail');
  node.replaceChildren();

  const groups = [
    { key: 'overdue', label: 'Overdue', role: 'critical', items: d.deadlines.overdue },
    { key: 'today', label: 'Due today', role: 'serious', items: d.deadlines.today },
    { key: 'thisWeek', label: `Next ${d.thresholds.dueSoonDays} days`, role: null, items: d.deadlines.thisWeek },
    { key: 'later', label: 'Later', role: null, items: d.deadlines.later },
  ];

  let total = 0;
  let i = 0; // cascade runs across groups, not restarting per group
  for (const g of groups) {
    const items = g.items.filter(matches);
    if (!items.length) continue;
    total += items.length;

    const grp = el('div', 'rail-group');
    const head = el('div', 'rail-head');
    if (g.role) head.dataset.role = g.role;
    head.appendChild(document.createTextNode(g.label));
    head.appendChild(el('span', 'n', String(items.length)));
    grp.appendChild(head);

    for (const item of items.slice(0, 12)) {
      const when =
        item.daysToDue < 0
          ? { text: `${item.daysOverdue}d late`, role: 'critical' }
          : item.daysToDue === 0
            ? { text: 'today', role: 'serious' }
            : { text: `in ${item.daysToDue}d`, role: null };
      grp.appendChild(itemCard(item, { plain: true, extraChips: [when], showStatus: true, i: i++ }));
    }
    node.appendChild(grp);
  }

  if (!total) {
    node.appendChild(
      emptyState(
        d.datesTracked ? 'Nothing has a due date yet.' : 'This board has no due-date column.',
        '○'
      )
    );
  }

  const undated = d.hygiene.missingDate.length;
  $('dueCount').textContent = undated ? `${total} dated · ${undated} with no date` : `${total}`;
}

/* ---- capacity: 4-segment stacked bar, validated hues ---- */

const BASE_LANE_GROUPS = [
  { key: 'idle', label: 'Not started', lanes: ['queued', 'parked', 'unset'], sw: 'var(--lane-idle)' },
  { key: 'flight', label: 'In progress', lanes: ['active'], sw: 'var(--lane-flight)' },
  { key: 'you', label: 'With you for review', lanes: ['review'], sw: 'var(--lane-you)' },
  { key: 'stalled', label: 'Blocked or waiting', lanes: ['blocked', 'waiting'], sw: 'var(--lane-stalled)' },
];
const RECURRING_GROUP = { key: 'recurring', label: 'Recurring weekly', lanes: ['recurring'], sw: 'var(--lane-recurring)' };

/** The groups the bar draws right now — recurring joins only when toggled in,
 *  so including/hiding it flows through counts, bars, legend, tooltip and the
 *  Numbers table from this one place. Purple validated all-pairs both modes. */
function laneGroups() {
  return S.showRecurring ? [...BASE_LANE_GROUPS, RECURRING_GROUP] : BASE_LANE_GROUPS;
}

function groupCounts(lanes) {
  const out = {};
  for (const g of laneGroups()) {
    out[g.key] = g.lanes.reduce((sum, l) => sum + (lanes[l] || 0), 0);
  }
  return out;
}

/**
 * What the bar actually draws. Sized from this, never row.total: a server on a
 * different version can count suppressed (Cold) items in the total under a
 * lane no group renders, which would leave bars under-filling their width.
 */
function visibleTotal(counts) {
  return laneGroups().reduce((sum, g) => sum + (counts[g.key] || 0), 0);
}

function renderLoad(d) {
  const node = $('load');
  node.replaceChildren();

  const rows = d.load.filter((r) => !S.filter || r.person.toLowerCase().includes(S.filter.toLowerCase()));
  if (!rows.length) {
    node.appendChild(emptyState('Nobody has open work.', '○'));
    return;
  }

  const max = Math.max(...rows.map((r) => visibleTotal(groupCounts(r.lanes))), 1);

  $('loadHint').textContent = S.showRecurring ? 'open work, recurring included' : 'open work, recurring hidden';

  rows.forEach((row, i) => {
    const counts = groupCounts(row.lanes);
    const visible = visibleTotal(counts);
    if (!visible) return; // e.g. a person with only recurring work, toggle off

    // Each person is a group: the clickable row plus a drawer holding their
    // work. A <button> rather than a div, so it is keyboard-operable and
    // focusable for free.
    const group = el('div', 'load-group');
    const line = idx(el('button', 'load-row'), i);
    line.type = 'button';
    const open = S.expanded.has(row.person);
    line.setAttribute('aria-expanded', String(open));
    line.title = open ? 'Hide this work' : `Show ${row.person}'s ${row.total} open items`;

    const nameCell = el('div', `load-name${row.person === 'Unassigned' ? ' unassigned' : ''}`);
    // Same slot colour as that person's rows, so the two panels read as one system.
    nameCell.dataset.slot = String(row.person === 'Unassigned' ? 0 : slotOf(row.person));
    nameCell.appendChild(document.createTextNode(row.person));
    if (row.overloaded) {
      const w = el('span', 'warn', ROLE_ICON.warning);
      w.title = `${row.wip} active + in-review, above the healthy max of ${d.thresholds.wipHealthyMax}`;
      nameCell.appendChild(w);
    }
    line.appendChild(nameCell);

    const track = el('div', 'bar');
    track.style.width = `${(visible / max) * 100}%`;
    for (const g of laneGroups()) {
      const v = counts[g.key];
      if (!v) continue;
      const seg = el('div', 'seg');
      seg.dataset.lane = g.key;
      seg.style.flexGrow = String(v);
      track.appendChild(seg);
    }
    line.appendChild(track);

    // direct value label — the relief the light-mode contrast WARN requires
    const totalCell = el('div', 'load-total');
    totalCell.appendChild(document.createTextNode(String(visible)));
    if (row.overdue) {
      const f = el('span', 'flag', ` !${row.overdue}`);
      f.title = `${row.overdue} overdue`;
      totalCell.appendChild(f);
    }
    line.appendChild(totalCell);

    // Caret last, so it sits at a consistent edge across rows.
    const caret = el('span', 'caret', '▸');
    caret.setAttribute('aria-hidden', 'true');
    line.appendChild(caret);

    line.addEventListener('mousemove', (ev) => showLoadTip(ev, row, counts, d));
    line.addEventListener('mouseleave', hideTip);

    const drawer = el('div', 'load-drawer');
    drawer.hidden = !open;
    if (open) fillDrawer(drawer, row);

    line.addEventListener('click', () => {
      hideTip();
      const nowOpen = !S.expanded.has(row.person);
      if (nowOpen) S.expanded.add(row.person);
      else S.expanded.delete(row.person);

      line.setAttribute('aria-expanded', String(nowOpen));
      line.title = nowOpen ? 'Hide this work' : `Show ${row.person}'s ${row.total} open items`;
      drawer.hidden = !nowOpen;
      if (nowOpen && !drawer.childElementCount) fillDrawer(drawer, row);
    });

    group.appendChild(line);
    group.appendChild(drawer);
    node.appendChild(group);
  });

  // legend — always present for ≥2 series
  const legend = $('loadLegend');
  legend.replaceChildren();
  for (const g of laneGroups()) {
    const key = el('span', 'key');
    const sw = el('span', 'sw');
    sw.style.setProperty('--sw', g.sw);
    key.appendChild(sw);
    key.appendChild(document.createTextNode(g.label));
    legend.appendChild(key);
  }

  renderLoadTable(d, rows);
}

/** One person's open work, rendered into their expanded drawer. */
function fillDrawer(drawer, row) {
  drawer.replaceChildren();
  const items = row.items.filter((i) => matches(i) && (S.showRecurring || i.lane !== 'recurring'));

  if (!items.length) {
    drawer.appendChild(emptyState('Nothing open for them right now.', '○'));
    return;
  }

  items.forEach((item, i) => {
    const late =
      item.overdue
        ? { text: `${item.daysOverdue}d overdue`, role: 'critical' }
        : item.daysToDue === 0
          ? { text: 'due today', role: 'serious' }
          : item.daysToDue != null
            ? { text: `in ${item.daysToDue}d`, role: null }
            : null;

    drawer.appendChild(
      itemCard(item, {
        plain: true,
        i,
        showStatus: true,
        showBoard: true,
        hideOwner: true,
        extraChips: [late],
      })
    );
  });
}

function renderLoadTable(d, rows) {
  const wrap = $('loadTable');
  wrap.replaceChildren();
  const table = el('table');
  const thead = el('thead');
  const hr = el('tr');
  for (const h of ['Person', ...laneGroups().map((g) => g.label), 'Total', 'Overdue']) {
    const th = el('th', null, h);
    if (h !== 'Person') th.className = 'num';
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const row of rows) {
    const counts = groupCounts(row.lanes);
    const tr = el('tr');
    tr.appendChild(el('td', null, row.person));
    for (const g of laneGroups()) tr.appendChild(el('td', 'num', String(counts[g.key] || 0)));
    tr.appendChild(el('td', 'num', String(row.total)));
    tr.appendChild(el('td', 'num', String(row.overdue)));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

function showLoadTip(ev, row, counts, d) {
  const tip = $('tip');
  tip.replaceChildren();
  tip.appendChild(el('div', 'tt-title', `${row.person} — ${visibleTotal(counts)} open`));
  for (const g of laneGroups()) {
    if (!counts[g.key]) continue;
    const r = el('div', 'tt-row');
    const left = el('span');
    const sw = el('span', 'sw');
    sw.style.background = g.sw;
    sw.style.display = 'inline-block';
    sw.style.marginRight = '6px';
    left.appendChild(sw);
    left.appendChild(document.createTextNode(g.label));
    r.appendChild(left);
    r.appendChild(el('span', 'n', String(counts[g.key])));
    tip.appendChild(r);
  }
  if (row.overdue || row.rotting) {
    const extra = el('div', 'tt-row');
    extra.style.marginTop = '5px';
    extra.appendChild(
      document.createTextNode(
        [row.overdue ? `${row.overdue} overdue` : null, row.rotting ? `${row.rotting} going cold` : null]
          .filter(Boolean)
          .join(' · ')
      )
    );
    tip.appendChild(extra);
  }
  placeTip(ev);
}

function placeTip(ev) {
  const tip = $('tip');
  tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  let x = ev.clientX + 14;
  let y = ev.clientY + 14;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

function hideTip() {
  $('tip').classList.remove('on');
}

/* ---- queues ---- */

function renderReview(d) {
  const t = d.thresholds;
  const items = d.review.map((i) => ({
    ...i,
    _wait: {
      text: i.daysStale ? `${i.daysStale}d waiting` : 'just now',
      role:
        i.daysStale >= t.reviewWaitCriticalDays
          ? 'critical'
          : i.daysStale >= t.reviewWaitWarnDays
            ? 'warning'
            : 'neutral',
    },
  }));
  const node = $('review');
  node.replaceChildren();
  const shown = items.filter(matches);
  if (!shown.length) {
    node.appendChild(emptyState('Nothing is waiting on you.', '✓'));
  } else {
    shown.forEach((item, i) => {
      node.appendChild(itemCard(item, { plain: true, extraChips: [item._wait], showBoard: true, i }));
    });
  }
  $('reviewCount').textContent = shown.length ? String(shown.length) : '';
}

// Stalled shares a column with hygiene, so it gets roughly half the height.
// Aperture alone can contribute 15 blocked orders; the header carries the total.
const STALLED_LIMIT = 5;
const STALLED_LIMIT_WALL = 3;

function renderStalled(d) {
  const items = [...d.blocked, ...d.waiting];
  const node = $('stalled');
  node.replaceChildren();
  const lim = document.body.classList.contains('wallboard') ? STALLED_LIMIT_WALL : STALLED_LIMIT;
  const matched = items.filter(matches);
  const shown = matched.slice(0, lim);
  if (!shown.length) {
    node.appendChild(emptyState('Nothing is stuck.', '✓'));
  } else {
    shown.forEach((item, i) => {
      const role = item.lane === 'blocked' ? 'critical' : 'serious';
      node.appendChild(
        itemCard(item, {
          plain: true,
          i,
          extraChips: [
            { text: item.status || item.laneLabel, role },
            item.daysStale ? { text: `${item.daysStale}d`, role: null } : null,
          ],
        })
      );
    });
  }
  $('stalledCount').textContent = !matched.length
    ? ''
    : matched.length > shown.length
      ? `worst ${shown.length} of ${matched.length}`
      : String(shown.length);
}

// Sorted worst-first, so the tail adds nothing a count can't convey. Capped
// to fit its panel; the header carries the real total.
const ROT_LIMIT = 5; // shares its column with Back burner now
const ROT_LIMIT_WALL = 3;
const BACKBURNER_LIMIT = 5;
const BACKBURNER_LIMIT_WALL = 3;

function renderRot(d) {
  const t = d.thresholds;
  const node = $('rot');
  node.replaceChildren();
  const matched = d.rot.filter(matches);
  const lim = document.body.classList.contains('wallboard') ? ROT_LIMIT_WALL : ROT_LIMIT;
  const shown = matched.slice(0, lim);
  if (!shown.length) {
    node.appendChild(emptyState('Everything has been touched recently.', '✓'));
  } else {
    shown.forEach((item, i) => {
      node.appendChild(
        itemCard(item, {
          plain: true,
          i,
          extraChips: [
            {
              text: `${item.daysStale}d untouched`,
              role: item.daysStale >= t.staleCriticalDays ? 'serious' : 'warning',
            },
          ],
          showStatus: true,
        })
      );
    });
  }
  $('rotCount').textContent = !matched.length
    ? ''
    : matched.length > shown.length || d.headline.rotting > shown.length
      ? `worst ${shown.length} of ${S.filter ? matched.length : d.headline.rotting}`
      : String(shown.length);
}

function renderBackBurner(d) {
  const node = $('backBurner');
  node.replaceChildren();
  const lim = document.body.classList.contains('wallboard') ? BACKBURNER_LIMIT_WALL : BACKBURNER_LIMIT;
  const matched = (d.backBurner || []).filter(matches);
  const shown = matched.slice(0, lim);

  if (!shown.length) {
    node.appendChild(emptyState('Nothing is on the back burner.', '○'));
  } else {
    shown.forEach((item, i) => {
      node.appendChild(
        itemCard(item, {
          plain: true,
          i,
          showStatus: true,
          extraChips: [
            item.daysStale ? { text: `${item.daysStale}d untouched`, role: null } : null,
          ],
        })
      );
    });
  }
  $('backBurnerCount').textContent = !matched.length
    ? ''
    : matched.length > shown.length
      ? `${shown.length} of ${matched.length}`
      : String(matched.length);
}

/* ---- R&D: plain list grouped by assignee ---- */

function renderRnd(d) {
  const sub = $('boardList');
  const node = $('rndList');
  node.replaceChildren();

  const groups = (d.byAssignee || [])
    .map((g) => ({ ...g, items: g.items.filter(matches) }))
    .filter((g) => g.items.length);

  const total = groups.reduce((a, g) => a + g.items.length, 0);
  sub.textContent = `${total} R&D project${total === 1 ? '' : 's'}`;
  sub.title = 'Items tagged R&D on the request-type column';
  $('rndCount').textContent = total ? String(total) : '';

  if (!groups.length) {
    node.appendChild(emptyState('Nothing is tagged R&D yet.', '○'));
    return;
  }

  let i = 0;
  for (const g of groups) {
    const head = el('div', 'rnd-person');
    const slot = g.person === 'Unassigned' ? 0 : slotOf(g.person);
    const av = el('span', 'av', g.person === 'Unassigned' ? '—' : initials(g.person));
    av.dataset.slot = String(slot);
    head.appendChild(av);
    head.appendChild(document.createTextNode(g.person));
    head.appendChild(el('span', 'n', String(g.items.length)));
    node.appendChild(head);

    for (const item of g.items) {
      node.appendChild(
        itemCard(item, {
          plain: true,
          i: i++,
          showStatus: true,
          hideOwner: true,
          extraChips: [item.daysStale ? { text: `${item.daysStale}d untouched`, role: null } : null],
        })
      );
    }
  }
}

/* ---- hygiene meters ---- */

function renderHygiene(d) {
  const g = d.hygiene;
  const node = $('hygiene');
  node.replaceChildren();

  const meter = (label, pct, missingCount, missingWhat) => {
    const row = el('div', 'meter-row');
    const top = el('div', 'meter-top');
    top.appendChild(el('span', 'k', label));
    top.appendChild(el('span', 'v', `${pct}%`));
    row.appendChild(top);

    const bar = el('div', 'meter');
    bar.dataset.role = pct >= 90 ? 'good' : pct >= 60 ? 'warning' : 'critical';
    const fill = el('div', 'fill');
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    row.appendChild(bar);

    const note = el('div', 'meter-note');
    if (missingCount) {
      note.appendChild(document.createTextNode(`${missingCount} of ${g.scoped} `));
      note.appendChild(el('b', null, missingWhat));
    } else {
      note.textContent = 'Complete.';
    }
    row.appendChild(note);
    return row;
  };

  node.appendChild(meter('Has a due date', g.dateCoverage, g.missingDate.length, 'have no due date'));
  node.appendChild(meter('Has an owner', g.assignedCoverage, g.missingPerson.length, 'are unassigned'));
  node.appendChild(meter('Has a status', g.statusCoverage, g.missingStatus.length, 'have no status'));

  const foot = el('div', 'meter-note');
  foot.style.marginTop = '16px';
  foot.appendChild(
    document.createTextNode(
      `Measured across ${g.scoped} open items. Recurring and on-hold work is excluded — it is not expected to carry a date.`
    )
  );
  node.appendChild(foot);
}

/* ---- intake ---- */

function renderIntake(d) {
  const node = $('intake');
  node.replaceChildren();
  const shown = d.intake.filter(matches);
  if (!shown.length) {
    node.appendChild(emptyState('No open requests.', '○'));
  } else {
    shown.forEach((item, i) => {
      const prio = item.priority;
      const prioRole =
        prio === 'Urgent' ? 'critical' : prio === 'High' ? 'serious' : prio === 'Medium' ? 'warning' : null;
      node.appendChild(
        itemCard(item, {
          plain: true,
          i,
          extraChips: [
            prio ? { text: prio, role: prioRole } : null,
            item.untriaged ? { text: `untriaged ${item.ageDays}d`, role: 'warning' } : null,
            item.daysToDue != null
              ? {
                  text: item.daysToDue < 0 ? `wanted ${-item.daysToDue}d ago` : `wanted in ${item.daysToDue}d`,
                  role: item.daysToDue < 0 ? 'critical' : null,
                }
              : null,
            item.requestType ? { text: item.requestType, cls: 'board' } : null,
            // the requester is not the owner — different role, different chip
            item.requester ? { text: `from ${item.requester}`, cls: 'from' } : null,
          ],
        })
      );
    });
  }
  $('intakeCount').textContent = shown.length ? String(shown.length) : '';
}

/* ---- activity ---- */

function renderActivity(d) {
  const node = $('activity');
  node.replaceChildren();

  if (!d.activity.filter((a) => {
    const m = scopeMeta(S.scope);
    return !m || m.boardIds.includes(String(a.boardId));
  }).length) {
    node.appendChild(emptyState('No board activity in the last two weeks.', '○'));
    return;
  }

  // The feed is shared across scopes, so narrow it to the active boards here.
  const meta = scopeMeta(S.scope);
  const inScope = (a) => !meta || meta.boardIds.includes(String(a.boardId));

  let unseen = 0;
  d.activity.filter(inScope).slice(0, 40).forEach((a, i) => {
    const at = a.at ? new Date(a.at).getTime() : 0;
    const isUnseen = at > S.lastSeen;
    if (isUnseen) unseen++;

    const row = idx(el('div', `feed-item${isUnseen ? ' unseen' : ''}`), i);
    row.dataset.tone = a.tone;
    row.appendChild(el('div', 'tick'));

    const txt = el('div', 'txt');
    txt.appendChild(el('b', null, a.who));
    txt.appendChild(document.createTextNode(' ' + a.text));
    row.appendChild(txt);

    const when = el('div', 'when', a.at ? agoShort(a.at) : '');
    if (a.at) when.title = new Date(a.at).toLocaleString();
    row.appendChild(when);
    node.appendChild(row);
  });

  $('activityHint').textContent = unseen ? `${unseen} since you last looked` : 'nothing new';
}

/* ============================================================
   Change detection
   ============================================================ */

function diffSignatures(next) {
  if (!S.prevSignatures) {
    S.prevSignatures = next;
    return;
  }
  const changed = new Set();
  const fresh = new Set();

  for (const [id, sig] of Object.entries(next)) {
    const before = S.prevSignatures[id];
    if (before === undefined) fresh.add(id);
    else if (before !== sig) changed.add(id);
  }

  if (changed.size || fresh.size) {
    S.changeLog.unshift({ at: Date.now(), changed: changed.size, added: fresh.size });
    for (const id of changed) S.changedIds.add(id);
    for (const id of fresh) {
      S.newIds.add(id);
      S.changedIds.add(id);
    }
    // The flash is a transient cue; clear it so a later render is calm again.
    setTimeout(() => {
      for (const id of changed) S.changedIds.delete(id);
      for (const id of fresh) S.changedIds.delete(id);
    }, 5200);
  }

  S.prevSignatures = next;
  updateChangeChip();
}

function updateChangeChip() {
  const chipEl = $('changeChip');
  const totalChanged = S.changeLog.reduce((n, e) => n + e.changed, 0);
  const totalAdded = S.changeLog.reduce((n, e) => n + e.added, 0);
  const total = totalChanged + totalAdded;
  if (!total) {
    chipEl.hidden = true;
    return;
  }
  const parts = [];
  if (totalChanged) parts.push(`${totalChanged} updated`);
  if (totalAdded) parts.push(`${totalAdded} new`);
  chipEl.hidden = false;
  chipEl.textContent = `${parts.join(' · ')} since you opened this`;
  chipEl.title = 'Click to clear';
}

/* ============================================================
   Access key (deployed servers only)
   ============================================================ */

function showKeyPrompt(message) {
  clearTimeout(S.timer);           // stop polling; it will only 401 again
  S.timer = null;
  setPulse('error', 'locked');
  $('keyPrompt').hidden = false;
  $('keyPromptMsg').textContent = message;
  $('keyInput').focus();
}

function saveAccessKey() {
  const value = $('keyInput').value.trim();
  if (!value) return;
  S.accessKey = value;
  localStorage.setItem('cd.key', value);
  $('keyInput').value = '';
  $('keyPrompt').hidden = true;
  setPulse('', 'checking…');
  poll(true);
}

/* ============================================================
   Polling
   ============================================================ */

function setPulse(state, text) {
  const p = $('pulse');
  p.className = `pulse${state ? ' is-' + state : ''}`;
  $('pulseText').textContent = text;
}

async function poll(force = false) {
  try {
    const res = await fetch(`/api/snapshot${force ? '?force=1' : ''}`, {
      cache: 'no-store',
      headers: S.accessKey ? { 'X-Dashboard-Key': S.accessKey } : {},
    });

    // A deployed server requires a key. Ask for it instead of retrying forever.
    if (res.status === 401 || res.status === 503) {
      const body = await res.json().catch(() => ({}));
      showKeyPrompt(body.error || 'This dashboard requires an access key.');
      return;
    }

    const d = await res.json();
    if (d.error && !d.boards) throw new Error(d.error);
    $('keyPrompt').hidden = true;

    S.failures = 0;
    S.data = d;
    S.pollMs = Math.max(10, d.pollSeconds || 30) * 1000;

    diffSignatures(d.signatures);
    render();

    $('demoBanner').hidden = !d.demo;
    $('errBanner').hidden = !d.error;
    if (d.error) $('errBanner').textContent = `Monday API: ${d.error} — showing the last good snapshot.`;

    if (d.demo) setPulse('demo', `sample · ${clockTime(d.fetchedAt)}`);
    else if (d.error) setPulse('error', `stale · ${clockTime(d.fetchedAt)}`);
    else setPulse('', `live · updated ${clockTime(d.fetchedAt)}`);
  } catch (err) {
    S.failures++;
    setPulse('error', `offline (${S.failures}) — retrying`);
    $('errBanner').hidden = false;
    $('errBanner').textContent = `Cannot reach the dashboard server: ${err.message}`;
  } finally {
    clearTimeout(S.timer);
    // Back off on repeated failure so a dead server is not hammered.
    const wait = S.failures ? Math.min(S.pollMs * 2 ** Math.min(S.failures, 4), 300000) : S.pollMs;
    S.timer = setTimeout(() => poll(), wait);
  }
}

function render() {
  if (!S.data) return;
  buildScopeToggle(S.data);

  const d = scopedData();
  if (!d) return;

  applyRndMode(S.scope === 'rnd');
  if (S.scope === 'rnd') {
    renderRnd(d);
  }

  // The scope toggle already names the view, so the subtitle stays short —
  // spelling out every board here wrapped the header onto three lines.
  const meta = scopeMeta(S.scope);
  const boards = d.boards.filter((b) => !meta || meta.boardIds.includes(String(b.id)));
  const sub = $('boardList');
  if (S.scope === 'rnd') {
    // renderRnd already set the subtitle; the standard one would overwrite it.
  } else {
  const cold = d.headline.coldSuppressed || 0;
  // Say how many are held back, so suppressed work is visible as a number even
  // though it is absent from every alert list.
  sub.textContent = cold ? `${d.headline.openTotal} open · ${cold} cold` : `${d.headline.openTotal} open`;
  sub.title = [
    boards.map((b) => `${b.label} (${b.itemsCount})`).join(' · '),
    cold ? `${cold} item${cold === 1 ? '' : 's'} marked Cold — excluded from all alert panels` : null,
  ].filter(Boolean).join('\n');
  }

  renderKpis(d);
  renderFocus(d);
  renderRail(d);
  renderLoad(d);
  renderReview(d);
  renderStalled(d);
  renderRot(d);
  renderBackBurner(d);
  renderHygiene(d);
  renderIntake(d);
  renderActivity(d);
  renderTabBadges(d);

  // The entrance plays once. Every subsequent poll repaints these same lists,
  // and a cascade the user sees dozens of times a day reads as lag, not polish.
  if (!S.booted) {
    S.booted = true;
    const longest = 320 + 14 * 22 + 120; // slowest panel delay + its duration
    setTimeout(() => document.body.classList.remove('booting'), longest);
  }
}

/* ============================================================
   Board scope — which boards every number on the page describes
   ============================================================ */

function scopeMeta(key) {
  return (S.data?.scopeList || []).find((s) => s.key === key);
}

/** The active scope's derived slice, merged over the shared payload so every
 *  render function keeps working against one flat object. */
function scopedData() {
  const d = S.data;
  if (!d) return null;
  const slice = d.scopes?.[S.scope] || d.scopes?.design || Object.values(d.scopes || {})[0];
  return slice ? { ...d, ...slice } : d;
}

function buildScopeToggle(d) {
  const node = $('scopeToggle');
  if (node.childElementCount === (d.scopeList || []).length) return; // already built
  node.replaceChildren();
  for (const s of d.scopeList || []) {
    const b = el('button', null, s.label);
    b.type = 'button';
    b.dataset.scope = s.key;
    b.setAttribute('aria-pressed', String(s.key === S.scope));
    b.addEventListener('click', () => applyScope(s.key));
    node.appendChild(b);
  }
}

/** R&D is a different kind of view: one list, no pipeline chrome. */
function applyRndMode(on) {
  document.querySelector('.kpis').hidden = on;
  document.querySelector('.tabbar').hidden = on;
  document.querySelector('main').hidden = on;
  $('rndView').hidden = !on;
}

function applyScope(key) {
  if (!S.data?.scopes?.[key]) return;
  S.scope = key;
  localStorage.setItem('cd.scope', key);
  for (const b of $('scopeToggle').children) {
    b.setAttribute('aria-pressed', String(b.dataset.scope === key));
  }
  // Switching scope changes which items exist, so stale expansions would point
  // at people who aren't in this view.
  S.expanded.clear();
  render();
}

/* ============================================================
   Filter — one control, global reach, always reversible
   ============================================================ */

function setFilter(term, { syncInput = false } = {}) {
  S.filter = term.trim();
  if (syncInput) $('q').value = S.filter;

  const on = !!S.filter;
  $('filterNote').hidden = !on;
  $('filterTerm').textContent = S.filter;
  $('qClear').hidden = !on;
  $('qKbd').hidden = on;

  render();
}

function clearFilter() {
  setFilter('', { syncInput: true });
  $('q').focus();
}

/* ============================================================
   Controls
   ============================================================ */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const next = theme === 'dark' ? 'Light' : 'Dark';
  const btn = $('btnTheme');
  btn.textContent = next;
  // Label the destination, not the current state — "Light" alone is ambiguous.
  btn.title = `Switch to ${next.toLowerCase()} theme (t)`;
  localStorage.setItem('cd.theme', theme);
}

/* ============================================================
   Tabs — grouping so the page never needs to scroll
   ============================================================ */

const VIEWS = ['now', 'team', 'risk'];

function applyView(name, { focusTab = false } = {}) {
  if (!VIEWS.includes(name)) name = 'now';

  for (const v of VIEWS) {
    const tab = $(`tab-${v}`);
    const panel = $(`view-${v}`);
    const on = v === name;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  }
  if (focusTab) $(`tab-${name}`).focus();
  localStorage.setItem('cd.view', name);
}

function currentView() {
  return VIEWS.find((v) => $(`tab-${v}`).getAttribute('aria-selected') === 'true') || 'now';
}

/**
 * Tabs hide panels, so each tab carries the count that would otherwise go
 * unseen. Without this, grouping trades scrolling for blindness.
 */
function renderTabBadges(d) {
  const set = (id, value, role) => {
    const n = $(id);
    n.hidden = !value;
    n.textContent = value || '';
    if (role) n.dataset.role = role;
    else delete n.dataset.role;
  };

  const overdue = d.deadlines.overdue.filter(matches).length;
  const stalled = [...d.blocked, ...d.waiting].filter(matches).length;
  const cold = d.rot.filter(matches).length;
  const overloaded = d.load.filter((r) => r.overloaded && r.person !== 'Unassigned').length;

  set('badgeNow', overdue, 'critical');
  set('badgeTeam', overloaded, 'warning');
  set('badgeRisk', stalled + cold, 'warning');
}

function applyTableView(on) {
  $('loadTable').hidden = !on;
  $('btnTable').setAttribute('aria-pressed', String(on));
  localStorage.setItem('cd.table', on ? '1' : '0');
}

function toggleKeys(force) {
  const pop = $('keysPop');
  const btn = $('btnKeys');
  const show = force != null ? force : pop.hidden;

  if (show) {
    pop.hidden = false;
    // let the browser register the pre-transition state before animating in
    requestAnimationFrame(() => pop.classList.add('on'));
  } else {
    pop.classList.remove('on');
    setTimeout(() => { pop.hidden = true; }, 120);
  }
  btn.setAttribute('aria-expanded', String(show));
}

/* ---- wallboard auto-scroll ----
   A wall display has no one at the keyboard, and the full grid is taller than
   any screen. Creep down the page, hold at the bottom, then return to the top.
   Any real interaction pauses it for a while so it never fights a human. */

const WALL = { timer: null, pausedUntil: 0 };
const WALL_DWELL = 20000;

/**
 * Whichever element owns the scroll. Normally nothing does — the shell is
 * sized to the viewport — but the narrow breakpoint unwinds it and the
 * document takes over again.
 */
function scrollHost() {
  const ws = $('workspace');
  return ws && ws.scrollHeight > ws.clientHeight + 4 ? ws : document.documentElement;
}

/**
 * Nothing scrolls any more, so a wall display cycles the tabs instead: each
 * view already fits the screen, so rotating them shows the whole board with no
 * motion at all. Any input hands control back for a while.
 */
function wallTick() {
  if (!document.body.classList.contains('wallboard')) {
    WALL.timer = null;
    return;
  }
  if (performance.now() >= WALL.pausedUntil) {
    const i = VIEWS.indexOf(currentView());
    applyView(VIEWS[(i + 1) % VIEWS.length]);
  }
  WALL.timer = setTimeout(wallTick, WALL_DWELL);
}

function pauseWallScroll(ms = 60000) {
  WALL.pausedUntil = performance.now() + ms;
}

function applyWallboard(on) {
  document.body.classList.toggle('wallboard', on);
  $('btnWall').setAttribute('aria-pressed', String(on));
  localStorage.setItem('cd.wall', on ? '1' : '0');

  if (on && !WALL.timer) {
    WALL.pausedUntil = performance.now() + WALL_DWELL;
    WALL.timer = setTimeout(wallTick, WALL_DWELL);
  } else if (!on && WALL.timer) {
    clearTimeout(WALL.timer);
    WALL.timer = null;
  }

  // Wallboard scales type up ~21%, so the ranked list shows fewer rows to keep
  // the view scroll-free at the larger size.
  if (S.data) render();
}

/**
 * The click-and-drag border between Incoming requests and Live activity.
 * 1:1 pointer tracking with capture; the split persists as a fraction of the
 * rail's height so it survives resizes. Double-click restores automatic
 * content-based sizing. Arrow keys resize for keyboard users.
 */
function initRailDivider() {
  const divider = $('railDivider');
  const rail = $('feedRail');
  const requests = rail.querySelector('.rail-block.requests');
  if (!divider || !requests) return;

  const MIN = 90; // px floor for each feed

  function apply(frac) {
    requests.classList.add('custom');
    requests.style.height = `${(frac * 100).toFixed(2)}%`;
    divider.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
  }

  function clampFrac(frac) {
    const h = rail.getBoundingClientRect().height || 1;
    return Math.min(Math.max(frac, MIN / h), 1 - MIN / h);
  }

  function reset() {
    requests.classList.remove('custom');
    requests.style.height = '';
    divider.removeAttribute('aria-valuenow');
    localStorage.removeItem('cd.railSplit');
  }

  const saved = parseFloat(localStorage.getItem('cd.railSplit'));
  if (Number.isFinite(saved) && saved > 0 && saved < 1) apply(clampFrac(saved));

  let dragging = false;
  divider.addEventListener('pointerdown', (e) => {
    dragging = true;
    divider.classList.add('dragging');
    // capture keeps tracking even when the pointer leaves the divider
    try { divider.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    e.preventDefault();
  });
  const move = (e) => {
    if (!dragging) return;
    const rect = rail.getBoundingClientRect();
    apply(clampFrac((e.clientY - rect.top) / rect.height));
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    const h = parseFloat(requests.style.height);
    if (Number.isFinite(h)) localStorage.setItem('cd.railSplit', String(h / 100));
  };
  divider.addEventListener('pointermove', move);
  addEventListener('pointermove', move);
  divider.addEventListener('pointerup', up);
  addEventListener('pointerup', up);

  divider.addEventListener('dblclick', reset);
  divider.addEventListener('keydown', (e) => {
    const current = parseFloat(requests.style.height);
    const frac = Number.isFinite(current) ? current / 100 : 0.3;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const next = clampFrac(frac + (e.key === 'ArrowDown' ? 0.04 : -0.04));
      apply(next);
      localStorage.setItem('cd.railSplit', String(next));
      e.preventDefault();
    } else if (e.key === 'Home') {
      reset();
      e.preventDefault();
    }
  });
}

function init() {
  document.body.classList.add('booting');
  applyTheme(localStorage.getItem('cd.theme') || 'dark');
  applyWallboard(localStorage.getItem('cd.wall') === '1');

  initRailDivider();

  // Scroll edge effect. In the app shell the workspace scrolls, not the page —
  // but the narrow breakpoint unwinds to a normal document, so watch both and
  // take whichever is actually offset.
  const header = document.querySelector('header');
  const onScroll = () => {
    const offset = Math.max(scrollY, scrollHost().scrollTop);
    if (offset > 4) header.setAttribute('data-scrolled', '');
    else header.removeAttribute('data-scrolled');
  };
  scrollHost().addEventListener('scroll', onScroll, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('btnTheme').addEventListener('click', () =>
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  );
  $('btnWall').addEventListener('click', () =>
    applyWallboard(!document.body.classList.contains('wallboard'))
  );
  $('btnRefresh').addEventListener('click', () => {
    setPulse('', 'refreshing…');
    poll(true);
  });

  $('changeChip').addEventListener('click', () => {
    S.changeLog = [];
    S.newIds.clear();
    S.lastSeen = Date.now();
    localStorage.setItem('cd.lastSeen', String(S.lastSeen));
    updateChangeChip();
    render();
  });

  applyView(localStorage.getItem('cd.view') || 'now');
  for (const v of VIEWS) {
    $(`tab-${v}`).addEventListener('click', () => applyView(v));
  }
  // Standard tablist keyboard behaviour: arrows move between tabs.
  $('tab-now').parentElement.addEventListener('keydown', (e) => {
    const i = VIEWS.indexOf(currentView());
    if (e.key === 'ArrowRight') applyView(VIEWS[(i + 1) % VIEWS.length], { focusTab: true });
    else if (e.key === 'ArrowLeft') applyView(VIEWS[(i - 1 + VIEWS.length) % VIEWS.length], { focusTab: true });
    else if (e.key === 'Home') applyView(VIEWS[0], { focusTab: true });
    else if (e.key === 'End') applyView(VIEWS[VIEWS.length - 1], { focusTab: true });
    else return;
    e.preventDefault();
  });

  $('btnRecurring').setAttribute('aria-pressed', String(S.showRecurring));
  $('btnRecurring').addEventListener('click', () => {
    S.showRecurring = !S.showRecurring;
    localStorage.setItem('cd.recurring', S.showRecurring ? '1' : '0');
    $('btnRecurring').setAttribute('aria-pressed', String(S.showRecurring));
    render();
  });

  applyTableView(localStorage.getItem('cd.table') === '1');
  $('btnTable').addEventListener('click', () =>
    applyTableView($('loadTable').hidden)
  );

  $('btnKeys').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleKeys();
  });
  $('filterClear').addEventListener('click', clearFilter);
  $('keySave').addEventListener('click', saveAccessKey);
  $('keyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveAccessKey(); });
  $('qClear').addEventListener('click', clearFilter);
  $('wallExit').addEventListener('click', () => applyWallboard(false));

  // Click-outside dismissal for the shortcuts popover.
  document.addEventListener('click', (e) => {
    const pop = $('keysPop');
    if (!pop.hidden && !pop.contains(e.target)) toggleKeys(false);
  });

  let debounce;
  $('q').addEventListener('input', (e) => {
    clearTimeout(debounce);
    const v = e.target.value;
    debounce = setTimeout(() => setFilter(v), 140);
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);

    if (e.key === 'Escape') {
      if (!$('keysPop').hidden) { toggleKeys(false); return; }
      if (typing) { clearFilter(); e.target.blur(); return; }
      if (S.filter) { clearFilter(); return; }
      return;
    }
    if (e.key === '/' && !typing) {
      e.preventDefault();
      $('q').focus();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey) return;

    if (e.key === '?') { toggleKeys(); return; }
    if (e.key === '1') return applyView('now');
    if (e.key === '2') return applyView('team');
    if (e.key === '3') return applyView('risk');
    if (e.key === 'r') poll(true);
    if (e.key === 'w') applyWallboard(!document.body.classList.contains('wallboard'));
    if (e.key === 't') applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // Refresh the moment the tab comes back, rather than waiting out the interval.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) poll();
  });

  // Any deliberate input yields the scroll back to whoever is standing there.
  for (const ev of ['wheel', 'touchstart', 'mousedown', 'keydown']) {
    addEventListener(ev, () => pauseWallScroll(), { passive: true });
  }

  poll();
}

init();
