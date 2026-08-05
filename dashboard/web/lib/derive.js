'use strict';

const DAY = 86400000;

/* ---------- small date helpers ---------- */

// monday date cells are "YYYY-MM-DD" or "YYYY-MM-DD HH:MM".
// Anchor date-only values at local noon so a timezone offset can never
// shift a deadline into the previous or next day.
function parseDate(text) {
  if (!text) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(text);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  return new Date(+y, +mo - 1, +d, hh != null ? +hh : 12, mm != null ? +mm : 0);
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysBetween(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / DAY);
}

function ageInDays(iso, now) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}

/* ---------- lane classification ---------- */

function laneOf(item, config) {
  if (item.doneByGroup) return 'done';
  if (!item.status) return 'unset';
  return config.statusLanes[item.status] || 'active';
}

const OPEN_LANES = new Set(['review', 'blocked', 'waiting', 'active', 'queued', 'recurring', 'parked', 'unset']);

// "Rot" only makes sense for work that is supposed to be moving. Recurring
// weekly items and done work are deliberately excluded.
const ROTTABLE_LANES = new Set(['review', 'blocked', 'waiting', 'active', 'queued', 'parked', 'unset']);

/* ---------- enrichment ---------- */

/**
 * A listing tagged Cold on its temperature column isn't being pushed, so it
 * must not raise alerts. Boards without that column never match, so this is a
 * no-op everywhere except Aperture Listing Orders.
 */
function isAlertSuppressed(item, config) {
  const rule = config.alertSuppress;
  if (!rule?.column || !rule.values?.length) return false;
  const value = item.extras?.[rule.column];
  return !!value && rule.values.includes(value);
}

/**
 * "1) captions drafts" is a step inside a piece of work, not a project. Kyle
 * numbers them that way on the board, and counting them would inflate both the
 * project totals and the parent's subtask count.
 *
 * The pattern is config, so a different convention needs no code change. An
 * unset or malformed pattern simply counts everything, which is the safe way to
 * fail: an over-count is visible, a silent under-count is not.
 */
let stepRegex;
function isStepItem(item, config) {
  const pattern = config.stepNaming?.pattern;
  if (!pattern) return false;
  if (stepRegex === undefined || stepRegex?.source !== new RegExp(pattern).source) {
    try {
      stepRegex = new RegExp(pattern);
    } catch {
      stepRegex = null;
    }
  }
  return stepRegex ? stepRegex.test(item.name || '') : false;
}

function enrich(item, config, now, stamps = {}) {
  const lane = laneOf(item, config);
  const due = parseDate(item.date);
  const daysStale = ageInDays(item.updatedAt, now);
  const daysOld = ageInDays(item.createdAt, now);

  let daysToDue = null;
  if (due) daysToDue = daysBetween(now, due);

  return {
    ...item,
    lane,
    laneLabel: config.laneMeta[lane]?.label || lane,
    open: OPEN_LANES.has(lane),
    due: due ? due.toISOString() : null,
    daysToDue,
    overdue: daysToDue != null && daysToDue < 0,
    daysOverdue: daysToDue != null && daysToDue < 0 ? -daysToDue : 0,
    daysStale,
    daysOld,
    temperature: item.extras?.temperature ?? null,
    // A numbered step ("1) …"): still listed everywhere it already appeared,
    // but left out of every project count.
    step: isStepItem(item, config),
    // When the current status label was applied, for the labels config asks to
    // stamp (e.g. "Proofs Sent"). Only set when the logged label still matches
    // the item's status — otherwise the item has moved on since and the old
    // timestamp would describe a status it no longer has.
    statusSetAt:
      stamps[String(item.id)] && stamps[String(item.id)].label === item.status
        ? stamps[String(item.id)].at
        : null,
    // Excluded from every alert panel and count, but still counted in capacity.
    alertSuppressed: isAlertSuppressed(item, config),
    // Tagged R&D on the request-type column: lives in the R&D scope only.
    rnd: !!config.rndTag && item.extras?.[config.rndTag.column] === config.rndTag.value,
    // Deliberately shelved via the board's Back Burner group. These appear in
    // the Back Burner panel and NOWHERE else — no alerts, no capacity, no
    // hygiene. Distinct from Cold, which still counts toward hygiene.
    backBurner: (config.boards.find((b) => String(b.id) === String(item.boardId))?.backBurnerGroups || [])
      .includes(item.groupTitle),
  };
}

/* ---------- the focus ranking ---------- */

/**
 * One ranked list answering "what should I touch next?".
 * Every contributing signal is recorded as a reason so the card can explain
 * itself — a number without a reason gets ignored on a wallboard.
 */
function scoreFocus(item, config, now) {
  const t = config.thresholds;
  const reasons = [];
  let score = 0;

  if (!item.open) return null;

  if (item.overdue) {
    score += 100 + item.daysOverdue * 3;
    reasons.push({
      kind: 'overdue',
      role: 'critical',
      text: `${item.daysOverdue}d overdue`,
    });
  } else if (item.daysToDue === 0) {
    score += 55;
    reasons.push({ kind: 'due', role: 'serious', text: 'Due today' });
  } else if (item.daysToDue != null && item.daysToDue <= 3) {
    score += 38;
    reasons.push({ kind: 'due', role: 'warning', text: `Due in ${item.daysToDue}d` });
  } else if (item.daysToDue != null && item.daysToDue <= t.dueSoonDays) {
    score += 18;
    reasons.push({ kind: 'due', role: 'neutral', text: `Due in ${item.daysToDue}d` });
  }

  if (item.lane === 'review') {
    // You are the approval bottleneck — review waits cost the whole team.
    score += 60 + (item.daysStale || 0) * 2;
    const role =
      item.daysStale >= t.reviewWaitCriticalDays
        ? 'critical'
        : item.daysStale >= t.reviewWaitWarnDays
          ? 'warning'
          : 'neutral';
    reasons.push({
      kind: 'review',
      role,
      text: item.daysStale ? `Awaiting your review ${item.daysStale}d` : 'Awaiting your review',
    });
  }

  if (item.lane === 'blocked') {
    score += 55 + (item.daysStale || 0) * 2;
    reasons.push({
      kind: 'blocked',
      role: 'critical',
      text: item.status === 'Missing Info' ? 'Blocked — missing info' : 'Blocked',
    });
  }

  if (item.lane === 'waiting') {
    score += 30 + (item.daysStale || 0) * 1.5;
    reasons.push({ kind: 'waiting', role: 'serious', text: item.status || 'Waiting' });
  }

  if (ROTTABLE_LANES.has(item.lane) && item.daysStale != null) {
    if (item.daysStale >= t.staleCriticalDays) {
      score += 24 + item.daysStale * 0.35;
      reasons.push({
        kind: 'rot',
        role: 'serious',
        text: `Untouched ${item.daysStale}d`,
      });
    } else if (item.daysStale >= t.staleWarnDays) {
      score += 12;
      reasons.push({ kind: 'rot', role: 'warning', text: `Untouched ${item.daysStale}d` });
    }
  }

  if (!item.people.length && item.lane !== 'parked') {
    score += 16;
    reasons.push({ kind: 'unassigned', role: 'warning', text: 'Unassigned' });
  }

  if (!item.due && (item.lane === 'active' || item.lane === 'review' || item.lane === 'blocked')) {
    score += 10;
    reasons.push({ kind: 'nodate', role: 'neutral', text: 'No due date' });
  }

  if (score <= 0) return null;

  reasons.sort((a, b) => severityRank(b.role) - severityRank(a.role));
  return { score: Math.round(score), reasons };
}

function severityRank(role) {
  return { critical: 4, serious: 3, warning: 2, neutral: 1 }[role] || 0;
}

/* ---------- aggregate views ---------- */

function laneCounts(items) {
  const out = {};
  for (const item of items) out[item.lane] = (out[item.lane] || 0) + 1;
  return out;
}

// Sort order for an expanded capacity row: what to look at first.
const LANE_URGENCY = ['blocked', 'review', 'waiting', 'active', 'queued', 'unset', 'parked', 'recurring'];

function buildLoad(openItems, config) {
  const t = config.thresholds;
  const byPerson = new Map();

  const bump = (name, item) => {
    if (!byPerson.has(name)) {
      byPerson.set(name, { person: name, total: 0, lanes: {}, overdue: 0, rotting: 0, items: [] });
    }
    const rec = byPerson.get(name);
    // A numbered step still shows in the expanded row — it is real work someone
    // is doing — but it adds nothing to the bar, the total or the flags.
    if (!item.step) {
      rec.total += 1;
      rec.lanes[item.lane] = (rec.lanes[item.lane] || 0) + 1;
      if (item.overdue) rec.overdue += 1;
      if (item.daysStale >= t.staleWarnDays && ROTTABLE_LANES.has(item.lane)) rec.rotting += 1;
    }
    // Full items, not just ids: the capacity row expands to show them and
    // there is no other list on the client that holds every person's work.
    rec.items.push(item);
  };

  for (const item of openItems) {
    // Recurring items ARE included in the payload now — under their own lane —
    // and the clients decide whether to count them (the Recurring toggle).
    // Default stays hidden, so the numbers read as before out of the box.
    // Cold-tagged listings are carried in name only — they don't count toward
    // anyone's load. They remain visible in Board hygiene and the header count.
    if (item.alertSuppressed) continue;
    if (!item.people.length) bump('Unassigned', item);
    else for (const p of item.people) bump(p, item);
  }

  const rows = [...byPerson.values()].sort((a, b) => {
    if (a.person === 'Unassigned') return 1;
    if (b.person === 'Unassigned') return -1;
    return b.total - a.total;
  });

  for (const row of rows) {
    row.wip = (row.lanes.active || 0) + (row.lanes.review || 0);
    row.overloaded = row.wip > t.wipHealthyMax;
    row.blocked = (row.lanes.blocked || 0) + (row.lanes.waiting || 0);
    // Worst-first, so an expanded row leads with what actually needs attention.
    row.items.sort(
      (a, b) =>
        (b.daysOverdue || 0) - (a.daysOverdue || 0) ||
        LANE_URGENCY.indexOf(a.lane) - LANE_URGENCY.indexOf(b.lane) ||
        (b.daysStale || 0) - (a.daysStale || 0)
    );
  }
  return rows;
}

function buildDeadlines(openItems, config) {
  const t = config.thresholds;
  const dated = openItems.filter((i) => i.daysToDue != null);
  const pick = (fn) => dated.filter(fn).sort((a, b) => a.daysToDue - b.daysToDue);

  return {
    overdue: pick((i) => i.daysToDue < 0).sort((a, b) => b.daysOverdue - a.daysOverdue),
    today: pick((i) => i.daysToDue === 0),
    thisWeek: pick((i) => i.daysToDue > 0 && i.daysToDue <= t.dueSoonDays),
    later: pick((i) => i.daysToDue > t.dueSoonDays),
  };
}

function buildHygiene(openItems, config) {
  // Recurring standing work legitimately has no due date; don't punish it.
  const scoped = openItems.filter((i) => i.lane !== 'recurring' && i.lane !== 'parked');
  const n = scoped.length || 1;
  const withDate = scoped.filter((i) => i.due).length;
  const assigned = scoped.filter((i) => i.people.length).length;
  const withStatus = scoped.filter((i) => i.lane !== 'unset').length;

  return {
    scoped: scoped.length,
    dateCoverage: Math.round((withDate / n) * 100),
    assignedCoverage: Math.round((assigned / n) * 100),
    statusCoverage: Math.round((withStatus / n) * 100),
    missingDate: scoped.filter((i) => !i.due),
    missingPerson: scoped.filter((i) => !i.people.length),
    missingStatus: scoped.filter((i) => i.lane === 'unset'),
  };
}

function buildIntake(items, config, now) {
  const t = config.thresholds;
  return items
    .filter((i) => i.boardRole === 'intake')
    .map((i) => ({
      ...i,
      ageDays: i.daysOld ?? 0,
      untriaged: (i.daysOld ?? 0) >= t.intakeTriageWarnDays,
      priority: i.extras.priority || null,
      requester: i.extras.requester || null,
      requestType: i.extras.requestType || null,
      brand: i.extras.brand || null,
    }))
    .sort((a, b) => {
      const pa = a.daysToDue ?? 999;
      const pb = b.daysToDue ?? 999;
      return pa - pb;
    });
}

// A group whose name reads as an end state — moving into it is a completion.
const DONE_GROUP = /complete|done|shipped|delivered|archive/i;

function humanizeActivity(entry, users) {
  const who = (entry.userId && users[entry.userId]?.name) || 'Someone';
  const item = entry.itemName || 'an item';

  switch (entry.event) {
    case 'create_pulse':
      return { ...entry, who, text: `created ${item}`, tone: 'new' };

    case 'delete_pulse':
      return { ...entry, who, text: `deleted ${item}`, tone: 'gone' };

    case 'archive_pulse':
      return { ...entry, who, text: `archived ${item}`, tone: 'gone' };

    case 'update_column_value': {
      const col = entry.columnTitle || 'a field';
      // A transition says far more than the destination alone: "Ready for
      // Review → Done" is the story; "Done" on its own isn't.
      if (entry.prevValue && entry.value && entry.prevValue !== entry.value) {
        return {
          ...entry,
          who,
          text: `${col}: ${entry.prevValue} → ${entry.value} on ${item}`,
          tone: 'change',
        };
      }
      const val = entry.value ? ` → ${entry.value}` : '';
      return { ...entry, who, text: `set ${col}${val} on ${item}`, tone: 'change' };
    }

    case 'update_name':
      return {
        ...entry,
        who,
        text: entry.prevValue ? `renamed “${entry.prevValue}” → ${item}` : `renamed ${item}`,
        tone: 'change',
      };

    case 'create_update':
      return { ...entry, who, text: `commented on ${item}`, tone: 'comment' };

    // On a person-grouped board a group move IS the reassignment or the
    // completion, so name both ends of it.
    case 'move_pulse_from_group':
    case 'move_pulse_into_group': {
      const to = entry.toGroup || entry.groupName;
      const from = entry.fromGroup;
      const where = from && to ? ` ${from} → ${to}` : to ? ` → ${to}` : '';
      return {
        ...entry,
        who,
        text: `moved ${item}${where}`,
        tone: to && DONE_GROUP.test(to) ? 'done' : 'change',
      };
    }

    case 'add_owner': {
      const person = (entry.subscribedId && users[entry.subscribedId]?.name) || 'someone';
      return { ...entry, who, text: `made ${person} an owner of ${item}`, tone: 'change' };
    }

    default:
      return { ...entry, who, text: `${entry.event.replace(/_/g, ' ')} on ${item}`, tone: 'change' };
  }
}

/* ---------- throughput ---------- */

/* ---- assignee colour slots ---- */

const COLOUR_SLOTS = 5;

/**
 * Map every assignee to a stable colour slot.
 *
 * Pinned assignments in config win, so a new name can never shuffle the
 * existing ones — colour follows the person, not their sort position. Anyone
 * unlisted takes the next free slot alphabetically (deterministic across polls,
 * and unaffected by filtering since that only hides rows). Past the last slot
 * they get 0, which the UI renders neutral rather than inventing a hue.
 */
function buildRoster(items, config) {
  const pinned = config.personColors || {};
  const roster = {};
  const taken = new Set();

  for (const [name, slot] of Object.entries(pinned)) {
    const n = Number(slot);
    if (n >= 1 && n <= COLOUR_SLOTS) {
      roster[name] = n;
      taken.add(n);
    }
  }

  const everyone = new Set();
  for (const item of items) {
    for (const p of item.people || []) everyone.add(p);
  }

  const free = [];
  for (let i = 1; i <= COLOUR_SLOTS; i++) if (!taken.has(i)) free.push(i);

  for (const name of [...everyone].sort()) {
    if (roster[name]) continue;
    roster[name] = free.length ? free.shift() : 0;
  }
  return roster;
}

function buildThroughput(items, activity, now) {
  // Completions per day over the last 14 days, read off the activity log
  // (a status change into a done label) with the item's own updated_at as
  // a fallback for boards whose history predates the activity window.
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * DAY));
    days.push({ date: d.toISOString().slice(0, 10), completed: 0, created: 0 });
  }
  const index = new Map(days.map((d) => [d.date, d]));

  for (const entry of activity) {
    if (!entry.at) continue;
    const key = entry.at.slice(0, 10);
    const bucket = index.get(key);
    if (!bucket) continue;
    if (entry.event === 'create_pulse') bucket.created += 1;
    if (entry.event === 'update_column_value' && /done|complete|shipped/i.test(entry.value || '')) {
      bucket.completed += 1;
    }
  }
  return days;
}

/* ---------- top level ---------- */

/**
 * Everything the UI shows for one board scope. Computed per scope rather than
 * filtered on the client, because the headline numbers, capacity chart and
 * hygiene percentages are aggregates — a client-side filter would leave them
 * describing a different set of items than the panels below them.
 */
function deriveScope(enriched, config, now) {
  const t = config.thresholds;

  const work = enriched.filter((i) => i.boardRole === 'work');

  // Back Burner leaves the pipeline here, before any stat is computed, so it
  // cannot leak into alerts, capacity, hygiene or the headline numbers.
  const backBurner = work
    .filter((i) => i.open && i.backBurner)
    .sort((a, b) => (b.daysStale || 0) - (a.daysStale || 0));
  const openWork = work.filter((i) => i.open && !i.backBurner);

  // Every attention panel draws from this, so Cold items are excluded once here
  // rather than in each list. Capacity and hygiene deliberately use `openWork`
  // instead — the work is still assigned to someone.
  const alerting = openWork.filter((i) => !i.alertSuppressed);
  const suppressed = openWork.filter((i) => i.alertSuppressed);

  const focus = [];
  for (const item of alerting) {
    const scored = scoreFocus(item, config, now);
    if (scored) focus.push({ ...item, ...scored });
  }
  focus.sort((a, b) => b.score - a.score || (b.daysOverdue || 0) - (a.daysOverdue || 0));

  const byLane = (lane) =>
    alerting
      .filter((i) => i.lane === lane)
      .sort((a, b) => (b.daysStale || 0) - (a.daysStale || 0));

  const rot = alerting
    .filter((i) => ROTTABLE_LANES.has(i.lane) && (i.daysStale || 0) >= t.staleWarnDays)
    .sort((a, b) => (b.daysStale || 0) - (a.daysStale || 0));

  const deadlines = buildDeadlines(alerting, config);
  const intake = buildIntake(enriched, config, now);

  const review = byLane('review');
  const blocked = byLane('blocked');
  const waiting = byLane('waiting');

  return {
    headline: {
      needsReview: review.length,
      overdue: deadlines.overdue.length,
      blocked: blocked.length + waiting.length,
      rotting: rot.length,
      untriaged: intake.filter((i) => i.untriaged).length,
      dueToday: deadlines.today.length,
      openTotal: openWork.filter((i) => !i.step).length,
      doneTotal: work.filter((i) => !i.open && !i.step).length,
      backBurner: backBurner.length,
      // Surfaced so suppressed work is never silently invisible.
      coldSuppressed: suppressed.length,
    },

    focus: focus.slice(0, 12),
    review,
    blocked,
    waiting,
    rot: rot.slice(0, 20),
    deadlines,
    load: buildLoad(openWork, config),
    hygiene: buildHygiene(openWork, config),
    intake,
    backBurner,
    lanes: laneCounts(openWork),
    // Some boards have no due-date column at all. Say so, so an empty deadline
    // panel reads as "this board doesn't track dates" and not "nothing is due".
    datesTracked: work.some((i) => i.due) || !work.length,
  };
}

/**
 * Groups board ids by scope key. 'both' is every scope's boards combined.
 */
function scopeBoardIds(config) {
  const map = { both: new Set() };
  for (const b of config.boards) {
    if (b._disabled) continue;
    const key = b.scope || 'design';
    (map[key] || (map[key] = new Set())).add(String(b.id));
    map.both.add(String(b.id));
  }
  return map;
}

/* ============================================================
   StackAdapt campaigns — the edge of a flight
   ============================================================ */

/**
 * The UTC offset a timestamp was written in, in minutes. StackAdapt returns
 * "2026-08-02T23:59:59-04:00"; monday returns "…Z". A "Z" or a naive string
 * reads as 0, which makes the day math below fall back to UTC.
 */
function offsetMinutes(iso) {
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(String(iso));
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Signed whole days from now until `endsAt`, counted in CALENDAR days in the
 * timestamp's own timezone.
 *
 * Neither existing helper works here: parseDate() reads the wire string as
 * server-local and throws the offset away, and daysBetween() truncates the day
 * in the server's timezone. The Worker runs in UTC, so a flight ending
 * 23:59:59-04:00 today would land on tomorrow's UTC date and read as "ends in
 * 1d" instead of "ends today". Shifting both sides by the same offset before
 * truncating is what keeps "today" meaning the campaign's today.
 */
function dayDelta(endsAt, now) {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const off = offsetMinutes(endsAt) * 60000;
  const localDay = (t) => Math.floor((t + off) / DAY);
  return localDay(end.getTime()) - localDay(now.getTime());
}

/**
 * Campaigns whose flight ends just ahead or just behind now. A campaign with no
 * resolved end — a draft, an evergreen buy, or anything with an open-ended
 * flight — is excluded: there is nothing timely to say about it.
 *
 * Returns null when the integration is off or the fetch produced nothing usable,
 * which is what makes the rail block disappear rather than sit there empty
 * forever. An empty ARRAY is the honest "on, and nothing is ending" answer.
 */
function deriveCampaigns(feed, config, now) {
  const cfg = config.stackAdapt;
  if (!cfg || cfg.enabled === false || !feed) return null;
  // Not connected: pass the reason through untouched so the section can show it.
  // This is the case that used to be indistinguishable from "feature off".
  if (feed.connected !== true) {
    return { connected: false, reason: feed.reason || 'StackAdapt is not connected.', rows: [] };
  }

  const ahead = cfg.endingWithinDays ?? 3;
  const behind = cfg.endedWithinDays ?? 3;

  const rows = [];
  for (const c of feed.rows || []) {
    // Drafts and archived campaigns are not running work. Paused ones stay:
    // a paused campaign still reaches its end date, and that is exactly the
    // moment someone has to decide whether to renew it.
    if (!c || c.archived || c.draft) continue;
    const daysToEnd = c.endsAt ? dayDelta(c.endsAt, now) : null;
    // A pinned campaign was chosen by hand, so it is always listed — that is
    // the whole point of pinning one from another advertiser. Everything else
    // has to earn its place by falling inside the window.
    if (!c.pinned) {
      if (daysToEnd == null || daysToEnd > ahead || daysToEnd < -behind) continue;
    }
    rows.push({ ...c, daysToEnd, ended: daysToEnd != null && daysToEnd < 0 });
  }

  // Ascending: just-ended first, then ending soonest, undated last. Reads as a
  // timeline, with pinned-but-far-off campaigns trailing rather than intruding.
  rows.sort((a, b) => {
    if (a.daysToEnd == null && b.daysToEnd == null) return String(a.name).localeCompare(String(b.name));
    if (a.daysToEnd == null) return 1;
    if (b.daysToEnd == null) return -1;
    return a.daysToEnd - b.daysToEnd || String(a.name).localeCompare(String(b.name));
  });
  return { connected: true, reason: null, rows };
}

function derive(raw, config, now = new Date()) {
  const stamps = raw.statusStamps || {};
  const flat = raw.items.map((i) => enrich(i, config, now, stamps));

  // Subitems are nested under their parent rather than treated as projects in
  // their own right: only parents count anywhere, and each parent carries its
  // children for the card's drop-down. A sub whose parent is closed follows
  // the parent out of view — the parent is the unit of work.
  const childrenByParent = new Map();
  for (const item of flat) {
    if (!item.isSub || !item.parentId) continue;
    if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
    childrenByParent.get(item.parentId).push(item);
  }
  const enriched = flat
    .filter((i) => !i.isSub)
    .map((i) => {
      const children = childrenByParent.get(i.id) || [];
      return {
        ...i,
        children,
        // Steps are shown in the drop-down but not counted: a project with two
        // real subtasks and three numbered steps reads as two.
        subCount: children.filter((c) => !c.step).length,
        openSubCount: children.filter((c) => c.open && !c.step).length,
      };
    });
  const byScope = scopeBoardIds(config);
  const declared = (config.scopes || []).map((s) => s.key);
  const keys = declared.length ? declared : Object.keys(byScope);

  const scopes = {};
  for (const key of keys) {
    if (key === 'rnd') continue; // built below from the tag, not board ids
    const ids = byScope[key];
    if (!ids) continue;
    // R&D-tagged items belong to the R&D scope ONLY — they never appear in a
    // board scope, so excluding them here removes them from every panel,
    // count and badge at once.
    scopes[key] = deriveScope(
      enriched.filter((i) => ids.has(String(i.boardId)) && !i.rnd),
      config,
      now
    );
  }

  // The R&D scope: everything carrying the tag, presented as a plain list
  // grouped by assignee. The full slice is still computed so shared UI
  // (header counts, filter) keeps working, but the view renders byAssignee.
  if (keys.includes('rnd')) {
    const rndItems = enriched.filter((i) => i.rnd);
    const slice = deriveScope(rndItems, config, now);
    const groups = new Map();
    for (const item of rndItems.filter((i) => i.open)) {
      const people = item.people.length ? item.people : ['Unassigned'];
      for (const person of people) {
        if (!groups.has(person)) groups.set(person, []);
        groups.get(person).push(item);
      }
    }
    slice.byAssignee = [...groups.entries()]
      .map(([person, items]) => ({
        person,
        items: items.sort((a, b) => (b.daysStale || 0) - (a.daysStale || 0)),
      }))
      .sort((a, b) =>
        a.person === 'Unassigned' ? 1 : b.person === 'Unassigned' ? -1 : a.person.localeCompare(b.person)
      );
    scopes.rnd = slice;
  }

  return {
    fetchedAt: raw.fetchedAt,
    demo: !!raw.demo,
    now: now.toISOString(),
    boards: raw.boards,
    statusLabels: raw.statusLabels || {},
    thresholds: config.thresholds,
    laneMeta: config.laneMeta,

    // Scope definitions the header toggle renders, each with its board ids so
    // the client can scope the activity feed too.
    scopeList: (config.scopes || []).map((s) => ({
      ...s,
      boardIds:
        s.key === 'rnd'
          ? config.boards.filter((b) => !b._disabled && b.columns?.requestType).map((b) => String(b.id))
          : [...(byScope[s.key] || [])],
    })),
    scopes,

    // Shared across scopes — one copy, not three.
    activity: raw.activity.map((a) => humanizeActivity(a, raw.users || {})),
    // Advertiser-scoped, not board-scoped, so it sits at the top level beside
    // activity rather than inside a board scope. null = integration off.
    campaigns: deriveCampaigns(raw.campaigns, config, now),
    // Roster spans every board so a person keeps their colour when you switch
    // scope, rather than being renumbered per view.
    roster: buildRoster(enriched.filter((i) => i.boardRole === 'work'), config),
    signatures: Object.fromEntries(
      enriched.map((i) => [
        i.id,
        `${i.status || '-'}|${i.date || '-'}|${i.people.join('+') || '-'}|${i.updatedAt}|` +
          // a sub edit changes the parent's signature, so the parent card flashes
          i.children.map((c) => `${c.id}:${c.status || '-'}:${c.updatedAt}`).join(','),
      ])
    ),
  };
}

module.exports = { derive, enrich, parseDate, daysBetween, ageInDays, laneOf, dayDelta, deriveCampaigns };
