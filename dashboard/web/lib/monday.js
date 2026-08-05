'use strict';

const API = 'https://api.monday.com/v2';
const API_VERSION = '2024-10';

const BOARD_QUERY = `
query Snapshot($ids: [ID!], $limit: Int!, $activity: Int!, $since: ISO8601DateTime) {
  boards(ids: $ids) {
    id
    name
    url
    items_count
    columns { id title type settings_str }
    groups { id title }
    activity_logs(limit: $activity, from: $since) {
      id
      event
      created_at
      user_id
      data
    }
    items_page(limit: $limit) {
      cursor
      items {
        id
        name
        url
        created_at
        updated_at
        group { id title }
        column_values { id type text value }
        subitems {
          id
          name
          url
          created_at
          updated_at
          column_values { id type text value }
        }
      }
    }
  }
}`;

const NEXT_PAGE_QUERY = `
query NextPage($cursor: String!, $limit: Int!) {
  next_items_page(cursor: $cursor, limit: $limit) {
    cursor
    items {
      id
      name
      url
      created_at
      updated_at
      group { id title }
      column_values { id type text value }
      subitems {
        id
        name
        url
        created_at
        updated_at
        column_values { id type text value }
      }
    }
  }
}`;

/**
 * When was a status label applied?
 *
 * monday stores no "changed at" on a column value, so the only source is the
 * board's activity log — and the display feed we already fetch is capped at 40
 * recent entries over 14 days, far too narrow to answer this for every item.
 * This is a separate, filtered pass: only the status columns, over a wider
 * window, which on a live board is a couple of hundred rows.
 */
const STATUS_HISTORY_QUERY = `
query StatusHistory($ids: [ID!], $cols: [String!], $since: ISO8601DateTime, $limit: Int!) {
  boards(ids: $ids) {
    id
    activity_logs(column_ids: $cols, from: $since, limit: $limit) {
      event
      data
      created_at
    }
  }
}`;

const USERS_QUERY = `query { users(limit: 300) { id name photo_thumb_small } }`;

async function gql(token, query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`monday returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    const msg = body.error_message || body.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`monday API error: ${msg}`);
  }
  if (body.errors?.length) {
    throw new Error(`monday GraphQL error: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return body.data;
}

/**
 * Activity events that describe the board's plumbing rather than the work.
 * `batch_delete_pulses` is dropped because monday also emits a per-item
 * archive_pulse/delete_pulse alongside it, which carries the actual name.
 */
const NOISE_EVENTS = new Set([
  'create_column',
  'delete_column',
  'update_column_metadata',
  'subscribe',
  'unsubscribe',
  'batch_delete_pulses',
  'create_group',
  'delete_group',
  'update_group_metadata',
]);

// Anything board_* is board-level metadata (workspace moved, board renamed…),
// never item work — and it carries no pulse to name.
const isNoiseEvent = (event) => NOISE_EVENTS.has(event) || event.startsWith('board_');

// A file or link column's raw value is a URL that can run to hundreds of
// characters and would swamp the feed. Prefer a name, and clip regardless.
function shortValue(text) {
  if (text == null) return null;
  const s = String(text).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return 'a link';
  return s.length > 72 ? s.slice(0, 69) + '…' : s;
}

// monday's activity_logs created_at is a string of 1/10,000-millisecond ticks.
function ticksToISO(ticks) {
  const ms = Number(ticks) / 10000;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Status label settings come back in two different shapes depending on how
 * they are read. The raw GraphQL `settings_str` gives an index-keyed object
 * plus sibling colour/done maps:
 *
 *   { labels: { "0": "Stuck" }, labels_colors: { "0": { color } },
 *     done_colors: [1] }
 *
 * while some clients pre-normalise it into an array of label objects. Handle
 * both, so this doesn't explode on whichever one it is handed.
 */
function statusLabelMap(columns) {
  const out = {};

  for (const col of columns || []) {
    if (col.type !== 'status' && col.type !== 'color') continue;

    let settings;
    try {
      settings = JSON.parse(col.settings_str || '{}');
    } catch {
      continue;
    }

    const labels = settings.labels;
    if (!labels) continue;

    // shape A — already an array of label objects
    if (Array.isArray(labels)) {
      for (const label of labels) {
        if (!label || label.is_deactivated) continue;
        const name = label.label ?? label.name;
        if (!name) continue;
        out[name] = { hex: label.hex || label.color || null, isDone: !!label.is_done };
      }
      continue;
    }

    // shape B — index-keyed map with colour/done information alongside
    const colors = settings.labels_colors || {};
    const doneIndexes = new Set((settings.done_colors || []).map(Number));

    for (const [key, name] of Object.entries(labels)) {
      if (!name) continue;
      out[name] = {
        hex: colors[key]?.color || null,
        isDone: doneIndexes.has(Number(key)),
      };
    }
  }

  return out;
}

function cellText(cells, id) {
  if (!id) return null;
  const cell = cells.get(id);
  const text = cell?.text;
  return text && text.trim() ? text.trim() : null;
}

function peopleFrom(cells, id) {
  const text = cellText(cells, id);
  if (!text) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeItem(raw, board, colMap, ctx) {
  const cells = new Map((raw.column_values || []).map((c) => [c.id, c]));

  const status = cellText(cells, colMap.status);
  const groupTitle = raw.group?.title || null;

  // A board can mark completion by group as well as by status label.
  const doneByGroup = (board.doneGroups || []).includes(groupTitle);

  const extras = {};
  for (const [key, colId] of Object.entries(colMap)) {
    if (key === 'status' || key === 'person' || key === 'date') continue;
    extras[key] = cellText(cells, colId);
  }

  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    boardId: board.id,
    boardLabel: board.label,
    boardRole: board.role,
    isSub: !!ctx.isSub,
    parentId: ctx.parentId || null,
    parentName: ctx.parentName || null,
    groupTitle,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    status,
    doneByGroup,
    people: peopleFrom(cells, colMap.person),
    date: cellText(cells, colMap.date),
    extras,
  };
}

/**
 * Pull every configured board and flatten to a single item list.
 * Shape is identical whether it came from the API or the bundled sample,
 * so derive.js never needs to know which.
 */
async function fetchRaw(token, config, opts = {}) {
  const activityLimit = opts.activityLimit ?? 40;
  const pageLimit = opts.pageLimit ?? 200;
  const activitySince = new Date(Date.now() - 14 * 86400000).toISOString();

  // A board can be parked with "_disabled": true rather than deleted, so its
  // column mapping survives for whenever it's wanted back.
  const activeBoards = config.boards.filter((b) => !b._disabled);
  const ids = activeBoards.map((b) => String(b.id));
  const byId = new Map(activeBoards.map((b) => [String(b.id), b]));

  const [data, userData] = await Promise.all([
    gql(token, BOARD_QUERY, {
      ids,
      limit: pageLimit,
      activity: activityLimit,
      since: activitySince,
    }),
    gql(token, USERS_QUERY, {}).catch(() => ({ users: [] })),
  ]);

  // Status stamps ride alongside the main fetch; a failure here costs the
  // timestamps, not the dashboard, so it never rejects the whole snapshot.
  const statusStamps = await fetchStatusStamps(token, config, activeBoards).catch(() => ({}));

  const users = {};
  for (const u of userData.users || []) {
    users[String(u.id)] = { id: String(u.id), name: u.name, photo: u.photo_thumb_small || null };
  }

  const items = [];
  const activity = [];
  const boards = [];
  const statusLabels = {};

  for (const board of data.boards || []) {
    const cfg = byId.get(String(board.id));
    if (!cfg) continue;

    const meta = {
      id: String(board.id),
      label: cfg.label || board.name,
      name: board.name,
      url: board.url,
      role: cfg.role,
      primary: !!cfg.primary,
      itemsCount: board.items_count,
      doneGroups: cfg.doneGroups || [],
    };
    boards.push(meta);
    Object.assign(statusLabels, statusLabelMap(board.columns));

    let page = board.items_page;
    let guard = 0;
    while (page && guard++ < 25) {
      for (const raw of page.items || []) {
        const item = normalizeItem(raw, meta, cfg.columns || {}, {});
        items.push(item);

        if (cfg.subitems) {
          for (const sub of raw.subitems || []) {
            items.push(
              normalizeItem(sub, meta, cfg.subitems, {
                isSub: true,
                parentId: item.id,
                parentName: item.name,
              })
            );
          }
        }
      }
      if (!page.cursor) break;
      const next = await gql(token, NEXT_PAGE_QUERY, { cursor: page.cursor, limit: pageLimit });
      page = next.next_items_page;
    }

    for (const log of board.activity_logs || []) {
      // Board-schema churn and subscription bookkeeping crowd out real work.
      // On a live board these were 16 of 60 entries — a quarter of the feed.
      if (isNoiseEvent(log.event)) continue;

      let payload = {};
      try {
        payload = JSON.parse(log.data || '{}');
      } catch {
        /* keep payload empty — the event type alone is still useful */
      }

      // The item name lives under a different key per event type: pulse_name
      // for column edits, pulse.name for group moves, item_name for ownership,
      // value.name for renames.
      const itemName =
        payload.pulse_name ||
        payload.pulse?.name ||
        payload.item_name ||
        payload.value?.name ||
        payload.previous_value?.name ||
        null;

      const itemId = payload.pulse_id ?? payload.item_id ?? payload.pulse?.id ?? null;

      activity.push({
        id: log.id,
        event: log.event,
        at: ticksToISO(log.created_at),
        userId: log.user_id ? String(log.user_id) : null,
        boardId: String(board.id),
        boardLabel: meta.label,
        itemId: itemId != null ? String(itemId) : null,
        itemName,
        columnTitle: payload.column_title || null,
        groupName: payload.group_name || payload.dest_group?.title || null,
        fromGroup: payload.source_group?.title || null,
        toGroup: payload.dest_group?.title || null,
        // Status changes carry a label object, people/text a plain string, and
        // file columns an array — take the file's name over its URL.
        value: shortValue(
          payload.value?.label?.text ??
            payload.value?.files?.[0]?.name ??
            payload.textual_value ??
            payload.value?.name
        ),
        prevValue: shortValue(
          payload.previous_value?.label?.text ??
            payload.previous_value?.files?.[0]?.name ??
            payload.previous_textual_value ??
            payload.previous_value?.name
        ),
        subscribedId: payload.subscribed_id ? String(payload.subscribed_id) : null,
      });
    }
  }

  activity.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

  return {
    fetchedAt: new Date().toISOString(),
    demo: false,
    users,
    boards,
    statusLabels,
    items,
    activity: activity.slice(0, 60),
    statusStamps,
  };
}

/**
 * itemId → { label, at } for the most recent status change on each item,
 * limited to the labels config asks to stamp. Returns {} when nothing is
 * configured, so the extra API call only happens if it is wanted.
 */
async function fetchStatusStamps(token, config, activeBoards) {
  const wanted = new Set(config.statusStamp?.labels || []);
  if (!wanted.size) return {};

  // One query covers every board: monday applies the column filter per board,
  // and the ids are board-specific, so passing them all together is safe.
  const columns = [
    ...new Set(activeBoards.map((b) => b.columns?.status).filter(Boolean)),
  ];
  if (!columns.length) return {};

  const days = config.statusStamp?.lookbackDays ?? 180;
  const data = await gql(token, STATUS_HISTORY_QUERY, {
    ids: activeBoards.map((b) => String(b.id)),
    cols: columns,
    since: new Date(Date.now() - days * 86400000).toISOString(),
    limit: 500,
  });

  const stamps = {};
  for (const board of data.boards || []) {
    for (const log of board.activity_logs || []) {
      let payload = {};
      try {
        payload = JSON.parse(log.data || '{}');
      } catch {
        continue;
      }
      const itemId = payload.pulse_id ?? payload.item_id ?? null;
      const label = payload.value?.label?.text ?? payload.value?.label ?? null;
      if (itemId == null || !label || !wanted.has(label)) continue;

      const at = ticksToISO(log.created_at);
      const key = String(itemId);
      // Logs arrive newest-first, but don't rely on it: keep the latest.
      if (!stamps[key] || String(at) > String(stamps[key].at)) {
        stamps[key] = { label, at };
      }
    }
  }
  return stamps;
}

module.exports = { fetchRaw, gql, ticksToISO, statusLabelMap };
