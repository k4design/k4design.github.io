'use strict';

/**
 * StackAdapt campaigns — the second data source, and the only one that is not
 * monday.
 *
 * The dashboard cares about exactly one thing here: the EDGE of a flight. A
 * campaign about to go dark needs a renewal decision; one that just went dark
 * needs a wrap report. So this module's job is to hand back every campaign for
 * the configured advertisers with a resolved end date, and let derive.js decide
 * which of those fall inside the window.
 *
 * Two rules this module holds to:
 *   - It never throws for a configuration reason. A missing token or a failed
 *     fetch comes back as { connected: false, reason } so the section can SAY
 *     what is wrong; only an explicitly disabled config block returns null and
 *     hides the section. The dashboard is a monday tool first; a paid-media side
 *     panel must never be able to take it down.
 *   - It is clock-free. Nothing here asks what time it is, which is what lets a
 *     captured raw.sample.json be re-derived against today rather than freezing
 *     the day it was captured.
 *
 * Web-standard APIs only (fetch, AbortSignal) — the Cloudflare Worker runs this
 * same file without nodejs_compat, so no require('https'), no Buffer, no
 * process.
 */

const API_URL = 'https://api.stackadapt.com/graphql';

/**
 * Verified against the live schema by introspection (`node lib/stackadapt.js
 * probe`). Two things that are easy to get wrong and cost a round trip each:
 *
 *   - `flights` is a CampaignFlightConnection, NOT a list, so the flight fields
 *     live under `nodes`. Querying them directly fails with "Cannot query field
 *     'endTime' on type 'CampaignFlightConnection'".
 *   - `campaigns` is likewise a connection; `nodes` and `pageInfo` are both
 *     available on it (as are `edges` and `totalCount`).
 */
const CAMPAIGNS_QUERY = `
query DashboardCampaigns($first: Int!, $after: String) {
  campaigns(first: $first, after: $after) {
    nodes {
      id
      name
      isArchived
      isDraft
      channelType
      timezone
      advertiser { id name }
      campaignGroup { id name }
      campaignStatus { state status }
      flights {
        nodes { id startTime endTime endedEarly }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

/* ============================================================
   Transport
   ============================================================ */

/**
 * Same three failure branches as the monday client, for the same reason: the
 * most likely first failure is a wrong endpoint answering with an HTML error
 * page, and "Unexpected token <" tells you nothing. Each branch names what
 * happened and quotes enough of the body to act on.
 */
async function gql(token, query, variables, timeoutMs) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    // The snapshot request waits on this. A hung socket must not stall the
    // whole dashboard, least of all inside a Worker's wall-clock budget.
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `StackAdapt returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }
  if (!res.ok) {
    throw new Error(`StackAdapt API error (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (body.errors?.length) {
    throw new Error(`StackAdapt GraphQL error: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return body.data;
}

/**
 * The campaign list, whatever shape it arrives in. GraphQL APIs disagree about
 * this — Relay connections use `nodes` or `edges[].node`, others return a plain
 * list — and the schema is unverified, so accept all of them rather than
 * guessing one and failing on the others.
 */
function pickList(data) {
  const root = data?.campaigns ?? data?.allCampaigns ?? data;
  if (Array.isArray(root)) return { rows: root, pageInfo: null };
  if (Array.isArray(root?.nodes)) return { rows: root.nodes, pageInfo: root.pageInfo || null };
  if (Array.isArray(root?.edges)) {
    return { rows: root.edges.map((e) => e?.node).filter(Boolean), pageInfo: root.pageInfo || null };
  }
  if (Array.isArray(root?.campaigns)) {
    return { rows: root.campaigns, pageInfo: root.pageInfo || null };
  }
  return { rows: [], pageInfo: null };
}

/* ============================================================
   Normalizing
   ============================================================ */

/**
 * A campaign's effective end, from its flights.
 *
 * If ANY flight is open-ended, the campaign is open-ended: reporting an
 * evergreen buy as "ended 2025-03-12" because one of its flights closed would
 * be a lie, and this section exists to be trusted about dates. Otherwise the
 * latest end wins (a real account had flights ending 2025-03-12 and 2025-07-31;
 * the campaign ends on the later one).
 *
 * Comparison happens on epoch millis so the wire offset is honoured, but the
 * ORIGINAL string is returned — derive.js needs that offset to work out which
 * calendar day "today" is for this campaign.
 */
function resolveEnd(flights) {
  if (!Array.isArray(flights) || flights.length === 0) return { endsAt: null, endedEarly: null };

  let best = null;
  for (const f of flights) {
    if (!f || !f.endTime) return { endsAt: null, endedEarly: null };
    const t = new Date(f.endTime).getTime();
    if (Number.isNaN(t)) return { endsAt: null, endedEarly: null };
    if (!best || t > best.t) best = { t, endsAt: f.endTime, endedEarly: !!f.endedEarly };
  }
  return { endsAt: best.endsAt, endedEarly: best.endedEarly };
}

function earliestStart(flights) {
  if (!Array.isArray(flights)) return null;
  let best = null;
  for (const f of flights) {
    if (!f?.startTime) continue;
    const t = new Date(f.startTime).getTime();
    if (Number.isNaN(t)) continue;
    if (!best || t < best.t) best = { t, startsAt: f.startTime };
  }
  return best ? best.startsAt : null;
}

/**
 * Responses mix casing — "Display" alongside DISPLAY, DOOH alongside
 * PROGRAMMATIC_LINEAR_TV. Normalize the known ones and let anything unknown
 * through as Title Case: a channel type we have never seen should look slightly
 * odd in the UI, not vanish from it.
 */
const CHANNELS = {
  DISPLAY: 'Display',
  VIDEO: 'Video',
  NATIVE: 'Native',
  AUDIO: 'Audio',
  CTV: 'CTV',
  DOOH: 'DOOH',
  PROGRAMMATIC_LINEAR_TV: 'Linear TV',
};

function channelLabel(raw) {
  if (!raw) return null;
  const key = String(raw).toUpperCase().replace(/\s+/g, '_');
  if (CHANNELS[key]) return CHANNELS[key];
  return key
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Flight rows out of the connection wrapper. Tolerates `nodes`, `edges[].node`
 * and a bare array, so a schema change on StackAdapt's side degrades to "no
 * end date" rather than throwing.
 */
function flightNodes(flights) {
  if (Array.isArray(flights)) return flights;
  if (Array.isArray(flights?.nodes)) return flights.nodes;
  if (Array.isArray(flights?.edges)) return flights.edges.map((e) => e?.node).filter(Boolean);
  return [];
}

/**
 * Every key is always present — null rather than absent — so the Swift side
 * decodes a predictable shape and a missing field can never be confused with a
 * server running older code.
 */
/**
 * Where a campaign lives in StackAdapt.
 *
 * There is no per-campaign page to link to: the platform's campaign view is a
 * filtered LIST, so the link carries the campaign name in the `search` query
 * param and lands on that campaign filtered out of the board. Hence {name}
 * rather than {id} in the template — the id appears nowhere in the UI's URLs.
 */
function campaignUrl(cfg, id, name) {
  const template = cfg?.campaignUrlTemplate;
  if (!template) return null;
  const out = String(template)
    .replace('{id}', encodeURIComponent(String(id ?? '')))
    .replace('{name}', encodeURIComponent(String(name ?? '')));
  // A template wanting a name we don't have would produce a link that lands on
  // an unfiltered board — misleading, so send nowhere instead.
  if (out.includes('search=&') || out.endsWith('search=')) return null;
  return out;
}

function normalizeCampaign(c, cfg) {
  const flights = flightNodes(c.flights);
  const { endsAt, endedEarly } = resolveEnd(flights);
  return {
    id: String(c.id),
    name: c.name || '(untitled campaign)',
    advertiserId: c.advertiser?.id != null ? String(c.advertiser.id) : null,
    advertiserName: c.advertiser?.name ?? null,
    groupId: c.campaignGroup?.id != null ? String(c.campaignGroup.id) : null,
    groupName: c.campaignGroup?.name ?? null,
    state: (c.campaignStatus?.state || '').toUpperCase() || null,
    statusText: c.campaignStatus?.status ?? null,
    channel: channelLabel(c.channelType),
    timezone: c.timezone ?? null,
    archived: !!c.isArchived,
    draft: !!c.isDraft,
    startsAt: earliestStart(flights),
    endsAt,
    endedEarly,
    flightCount: flights.length,
    // Where this campaign lives in StackAdapt. Built from a config template,
    // so a wrong pattern is a config fix rather than a redeploy of logic.
    url: campaignUrl(cfg, c.id, c.name),
  };
}

/* ============================================================
   Entry point
   ============================================================ */

/**
 * Returns null only when the feature is genuinely switched off (no config block
 * or enabled:false) — that is the one case where the UI should pretend the
 * section does not exist. Every other outcome returns
 *
 *   { connected: bool, reason: string|null, rows: [] }
 *
 * so the section can be VISIBLE and say what is wrong. Hiding a section that is
 * merely unconfigured is indistinguishable from having forgotten to build it.
 *
 * The advertiser allowlist is applied HERE, locally, and not delegated to the
 * API: StackAdapt's own endedAfter filter was tested and does not actually
 * filter (it returns null and years-old end dates), so no server-side filter on
 * this API is trusted without proof.
 */
async function fetchCampaigns(token, config) {
  const cfg = config.stackAdapt;
  if (!cfg || cfg.enabled === false) return null;
  if (!token) {
    return { connected: false, reason: 'No StackAdapt token on the server.', rows: [] };
  }

  const wanted = new Set((cfg.advertiserIds || []).map(String));
  // An empty allowlist would pull every advertiser in the account, including
  // other people's — but pinned campaigns are explicit choices and bypass it.
  const pinned = new Set((cfg.pinnedCampaignIds || []).map(String));

  const pageSize = cfg.pageSize ?? 100;
  const maxPages = cfg.maxPages ?? 10;
  const timeoutMs = cfg.timeoutMs ?? 8000;

  const out = [];
  try {
    for await (const c of eachCampaign(token, cfg, timeoutMs, pageSize, maxPages)) {
      // Either the campaign belongs to an allowlisted advertiser, or it was
      // pinned by hand — a pin is a deliberate "watch this one regardless".
      const keep = (c.advertiserId && wanted.has(c.advertiserId)) || pinned.has(c.id);
      if (keep) out.push({ ...c, pinned: pinned.has(c.id) });
    }
  } catch (err) {
    // Surfaced in the section rather than thrown: the dashboard is a monday
    // tool first and must not fail over a paid-media side panel.
    return { connected: false, reason: err.message, rows: [] };
  }
  return { connected: true, reason: null, rows: out };
}

/** Every campaign in the account, page by page. */
async function* eachCampaign(token, cfg, timeoutMs, pageSize, maxPages) {
  let after = null;
  const seen = new Set();
  for (let page = 0; page < maxPages; page++) {
    const data = await gql(token, CAMPAIGNS_QUERY, { first: pageSize, after }, timeoutMs);
    const { rows, pageInfo } = pickList(data);
    if (rows.length === 0) return;
    for (const row of rows) {
      if (row?.id) yield normalizeCampaign(row, cfg);
    }
    // Stop unless the cursor genuinely advances — a server that ignores `after`
    // would otherwise loop until maxPages, re-fetching page one every time.
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) return;
    if (seen.has(pageInfo.endCursor)) return;
    seen.add(pageInfo.endCursor);
    after = pageInfo.endCursor;
  }
}

/**
 * Free-text search across EVERY advertiser in the account, deliberately
 * ignoring the allowlist: this is how a campaign gets found in order to be
 * pinned, so restricting it to the allowlist would make pinning impossible.
 * Matches on campaign name, campaign group and advertiser name.
 */
async function searchCampaigns(token, config, query, limit = 25) {
  const cfg = config.stackAdapt || {};
  if (!token) throw new Error('No StackAdapt token on the server.');
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const timeoutMs = cfg.timeoutMs ?? 8000;
  const pageSize = cfg.pageSize ?? 100;
  // Search sweeps wider than the rail's own fetch: the point is to find things
  // outside the allowlist, which may be many pages deep.
  const maxPages = cfg.searchMaxPages ?? 30;

  const hits = [];
  for await (const c of eachCampaign(token, cfg, timeoutMs, pageSize, maxPages)) {
    const haystack = [c.name, c.groupName, c.advertiserName].filter(Boolean).join(' ').toLowerCase();
    if (haystack.includes(q)) hits.push(c);
    if (hits.length >= limit) break;
  }
  // Soonest-ending first, undated last — the useful order when picking one.
  hits.sort((a, b) => {
    if (!a.endsAt && !b.endsAt) return String(a.name).localeCompare(String(b.name));
    if (!a.endsAt) return 1;
    if (!b.endsAt) return -1;
    return new Date(b.endsAt) - new Date(a.endsAt);
  });
  return hits;
}

/** The specific campaigns a client has pinned, whatever advertiser they sit under. */
async function fetchCampaignsByIds(token, config, ids) {
  const cfg = config.stackAdapt || {};
  if (!token) throw new Error('No StackAdapt token on the server.');
  const wanted = new Set((ids || []).map(String).filter(Boolean));
  if (wanted.size === 0) return [];

  const timeoutMs = cfg.timeoutMs ?? 8000;
  const pageSize = cfg.pageSize ?? 100;
  const maxPages = cfg.searchMaxPages ?? 30;

  const out = [];
  for await (const c of eachCampaign(token, cfg, timeoutMs, pageSize, maxPages)) {
    if (wanted.has(c.id)) out.push({ ...c, pinned: true });
    if (out.length === wanted.size) break;
  }
  return out;
}

/* ============================================================
   Probe — `node lib/stackadapt.js probe`
   ============================================================ */

/**
 * Confirms the two unverified facts in this file: that API_URL answers, and
 * what the campaign/flight fields are really called. Run it once when a token
 * first lands, and again if StackAdapt changes the schema.
 */
async function probe() {
  const token = process.env.STACKADAPT_API_TOKEN;
  if (!token) {
    console.error('Set STACKADAPT_API_TOKEN first. Nothing was sent.');
    process.exit(1);
  }
  console.log(`endpoint: ${API_URL}`);

  try {
    await gql(token, '{ __typename }', {}, 8000);
    console.log('  reachable, and the Bearer header is accepted');
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    console.error('  Fix API_URL (or the auth header) before anything else.');
    process.exit(1);
  }

  const q = `{ __schema { queryType { fields { name args { name } } } } }`;
  const schema = await gql(token, q, {}, 8000);
  const fields = schema.__schema.queryType.fields
    .filter((f) => /campaign/i.test(f.name))
    .map((f) => `${f.name}(${f.args.map((a) => a.name).join(', ')})`);
  console.log('campaign-ish query fields:');
  for (const f of fields) console.log(`  ${f}`);

  for (const typeName of ['Campaign', 'CampaignFlight', 'Flight']) {
    try {
      const t = await gql(
        token,
        `query($n: String!){ __type(name: $n){ name fields { name } } }`,
        { n: typeName },
        8000
      );
      if (t.__type) {
        console.log(`${t.__type.name} fields: ${t.__type.fields.map((f) => f.name).join(', ')}`);
      }
    } catch {
      /* type doesn't exist under that name — the list above is the guide */
    }
  }

  console.log('\nNow try the real query:');
  try {
    const data = await gql(token, CAMPAIGNS_QUERY, { first: 3, after: null }, 8000);
    const { rows } = pickList(data);
    console.log(`  CAMPAIGNS_QUERY works — ${rows.length} rows`);
    if (rows[0]) console.log(`  first normalized: ${JSON.stringify(normalizeCampaign(rows[0]))}`);
  } catch (e) {
    // Worth separating: this API validates the query BEFORE checking the token,
    // so a 401 here means the query itself is fine and only the credential is
    // missing. Telling someone to "correct the query" in that case sends them
    // after the wrong problem.
    if (/HTTP 401|Unauthorized/i.test(e.message)) {
      console.log('  Query is VALID — rejected only for the token (HTTP 401).');
      console.log('  Supply a real STACKADAPT_API_TOKEN and this returns data.');
    } else {
      console.log(`  CAMPAIGNS_QUERY failed: ${e.message}`);
      console.log('  Correct CAMPAIGNS_QUERY (and pickList/flightNodes if a wrapper differs) using the fields above.');
    }
  }
}

if (typeof process !== 'undefined' && process.argv?.[2] === 'probe') {
  probe().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = {
  fetchCampaigns,
  campaignUrl,
  flightNodes,
  searchCampaigns,
  fetchCampaignsByIds,
  normalizeCampaign,
  resolveEnd,
  channelLabel,
  pickList,
};
