# Creative Direction — live board dashboard

A realtime read-only dashboard over your monday.com boards, built for the
creative-director seat: it answers *what needs me*, *what is slipping*, and
*who is carrying too much* without you opening three boards.

Zero npm dependencies. Node 18+ (uses built-in `fetch`).

---

## Run it

```bash
node monday-dashboard/server.js
```

Then open <http://localhost:4173>.

It starts in **sample mode** using a snapshot of your real boards, so you can
see the whole thing before wiring up a token.

### Go live

1. In monday: click your avatar (bottom-left) → **Developers** → **My Access
   Tokens** → copy your personal API token.
2. Create `monday-dashboard/.env`:

```bash
echo "MONDAY_API_TOKEN=paste_your_token_here" > monday-dashboard/.env
```

3. Restart the server. The header pill flips from `sample` to `live`.

The token stays server-side — it is never sent to the browser. `.env` is
gitignored.

---

## What's on it, and why

The design assumption is that your scarcest resource is attention, so every
panel is built to be read in under two seconds and to justify itself.

| Panel | The question it answers |
|---|---|
| **Waiting on your review** (hero) | You are the approval bottleneck. This is the number that costs the team the most when it grows. |
| **Overdue / Stalled / Going stale / New requests** | The four ways work goes wrong, each with the worst offender named in the subtitle. |
| **What to touch next** | One ranked list across all boards. Each card shows *why* it ranked, so you can disagree with it. |
| **Deadlines** | Overdue → today → next 7 days → later. The header also tells you how many open items carry **no** date at all. |
| **Who is carrying what** | Open work per person, split into not-started / in-progress / with-you / stalled. Flags anyone over the healthy WIP max. |
| **Your approval queue** | Everything in *Ready for Review*, oldest wait first — including subitems. |
| **Stalled — who to chase** | Blocked and waiting-on-someone work, so a standup has an agenda. |
| **Going stale** | Open work nobody has touched in 14+ days. This is where projects quietly die. |
| **Board hygiene** | The governance holes that make every other number lie: missing dates, owners, statuses. |
| **Incoming requests** | Form submissions on *Design Requests* not yet triaged onto the team board. |
| **Live activity** | Who changed what, with a "since you last looked" marker. |

### Realtime behaviour

- Polls every **30s** (`pollSeconds` in `config.json`); the server caches for
  15s so several open tabs cost one API call.
- Each poll diffs an item signature (status + date + owner + updated-at). Items
  that changed **flash blue** for five seconds; brand-new items keep a blue left
  edge. A header chip counts everything that moved since you opened the page —
  click it to reset.
- Returning to the tab triggers an immediate refresh.
- If the API hiccups the last good snapshot stays on screen with a `stale` pill
  rather than blanking, and polling backs off exponentially.

### Keyboard

| Key | Action |
|---|---|
| `/` | focus the filter |
| `r` | refresh now |
| `w` | wallboard mode |
| `t` | light / dark |
| `Esc` | clear the filter |

The filter narrows **every panel at once** — type a designer's name to get their
whole world, matching on item name, owner, status, board, and parent item.

### Wallboard mode

Strips the controls, scales the type up, hides intake and activity, and slowly
creeps down the page and back so a second monitor cycles the whole board
unattended. Any input hands control back for 20 seconds. Respects
`prefers-reduced-motion`.

---

## Tuning it

Everything judgement-based lives in `config.json` — no code changes needed.

**`statusLanes`** maps every status label on every board to one of nine *lanes*,
and the lanes drive all the math. This is the important one: if you add a status
in monday, add it here or it silently falls into `active`.

```
review     → counts as waiting on you
blocked    → hard stop
waiting    → waiting on someone outside the team
active     → in flight
queued     → accepted, not started
recurring  → standing work; excluded from capacity and hygiene
parked     → on hold; excluded from hygiene, still tracked for rot
done       → closed
```

**`thresholds`** — the lines that decide what counts as a problem:

```jsonc
"staleWarnDays": 14,          // "going stale" starts here
"staleCriticalDays": 30,      // escalates the badge
"reviewWaitWarnDays": 2,      // your own approval SLA
"reviewWaitCriticalDays": 5,
"dueSoonDays": 7,
"wipHealthyMax": 6,           // per-person active + in-review ceiling
"intakeTriageWarnDays": 2     // how long a request may sit untriaged
```

**`boards`** — add a board by giving its id, a `role` (`work` or `intake`), and
which column ids hold status / person / date. Get the column ids from the board
URL via the API, or ask me to add it.

### Adding a board

Current wiring:

| Board | Scope | Role |
|---|---|---|
| DESIGN TEAM (`18400676183`) | design | `work` — the main board, subitems included |
| Design Requests (`18422890784`) | design | `intake` — the request form |
| Aperture Listing Orders (`8442894318`) | aperture | `work` — 177 listing orders |
| Orders (`18404619594`) | — | **parked** — `"_disabled": true` |

### Board scope toggle

The header toggle switches between **Design Team Board**, **Aperture Listing
Orders**, and **Both**. Each board declares a `scope` in config; `both` is the
union, and the button order comes from the `scopes` array.

Scoping happens **server-side**: `derive()` runs once per scope. It can't be a
client-side filter, because the headline numbers, capacity chart and hygiene
percentages are aggregates — filtering rows on the client would leave them
describing a different set of items than the panels beneath them.

Aperture has **no due-date column**, so its `date` is deliberately `null` rather
than pointing at "Proofs Sent" (an event that already happened, not a deadline).
The deadline panel then says *"This board has no due-date column"* instead of
implying nothing is due. Its `Design` column (`status7`) is the one mapped into
lanes; Billboard / Magazine / Mailer statuses are tracked separately on that
board and aren't creative-direction signals.

### The R&D scope

A fourth toggle position. Items whose **Request type** column reads `R&D`
(`rndTag` in config) belong to the R&D scope *only* — they are excluded from
design/aperture/both at the item-filter level, so they can't appear in any
panel, count, badge or capacity row of those views. The R&D view itself is
deliberately not a dashboard: one flat list of projects grouped by assignee
(KPIs, tabs and queues hidden), because exploration work has no pipeline to
report on. Both apps read the same server-built `byAssignee` grouping.

### Cold listings are excluded from alerts

Aperture Listing Orders has a **Cold / Warm / Hot** column (`color_mm5nxatf`). A
listing marked **Cold** isn't being pushed, so it must not raise alerts. Items
matching `alertSuppress.values` in config are excluded from every attention
panel and its counts:

- What to touch next, Deadlines, Approval queue, Stalled, Going stale
- The KPI tiles and the tab badges

They are excluded from *Who is carrying what* too — a Cold listing is carried
in name only, so it doesn't count toward anyone's load. The **only** places they
register are *Board hygiene* (they still need dates/owners/statuses) and the
header's `N cold` count, which keeps suppressed work from being silently
invisible. If one ever surfaces in a list, it carries a dashed `❄ Cold — no
alerts` chip explaining itself.

The filtering happens once in `derive.js`, so **the iOS app inherits it** with no
client-side rule of its own.

Note the rename: the staleness panel was called *Going cold*, which collided with
this column's meaning. It is now **Going stale** ("untouched 14+ days") on both
surfaces, and the card chip reads `155d untouched`.

### Assignee colour coding

Rows carry a left edge bar and a filled initials badge in their assignee's
colour, and capacity rows get a matching dot.

**Colour is a scanning aid here, not the identity channel.** All 56 five-hue
subsets of the categorical palette were validated across both modes on the
all-pairs list (any two rows in a list can end up compared). The best achievable
worst pair is normal-vision ΔE **11.9**, under the hard floor of 15 — so no
five-hue set can carry identity by colour alone. Identity is therefore always
carried by the initials *inside* the swatch plus the full name beside it, which
is the documented exception for a label set inside a coloured fill. Ink per
swatch was picked by measured contrast (all ≥ 3.98:1).

Slots are **pinned by name** in `personColors`. If they were assigned by sort
order, hiring someone whose name sorted early would repaint everyone else's
rows — colour must follow the person, not their position. Only five slots exist;
anyone unlisted renders neutral grey. Aperture brings eight more assignees, so
they show neutral — swap a name into `personColors` to give them a hue.

### Expanding a capacity row

Clicking a person in **Who is carrying what** drops their open work beneath the
row, sorted worst-first (overdue → blocked → review → waiting → active →
queued). Clicking again collapses it. Rows are independent, expansion survives
the 30s refresh, and the drawer is keyboard-operable because the row is a real
`<button>` with `aria-expanded`. This is the one place inner scrolling can
appear, and only because the user asked for more than fits.

Orders is Brittany's board, not design-team work: its items inflated the overdue
count and put non-designers in the capacity chart. It stays in `config.json`
with `"_disabled": true` so the column mapping survives — drop that flag to
bring it back, or delete the block to lose it for good.

`Aperture Listing Orders`, `Design Projects` and `Internal Aperture Marketing`
are **not** wired up yet — say the word and they go in.

---

## Layout — desktop-first app shell, no scrolling

The page itself never scrolls. `body` is a `100dvh` grid: a fixed header row, then
a two-column shell.

```
┌───────────────────────────────────────────────┬──────────────┐
│ header                                                       │
├───────────────────────────────────────────────┼──────────────┤
│ KPI strip                                     │ Incoming     │
│ tab bar   [Priorities] [Team] [Risk]          │ requests     │
│ ┌───────────────────────────────────────────┐ ├──────────────┤
│ │ active tab — fills the remaining height   │ │ Live         │
│ └───────────────────────────────────────────┘ │ activity     │
└───────────────────────────────────────────────┴──────────────┘
                     75%                              25%
```

**The right column is pinned at exactly 25%** and never scrolls as a unit.
Incoming requests sits on top, sized to its content up to a 42% ceiling so a
quiet inbox doesn't hold the space open; live activity takes the remainder. Each
block scrolls internally when it has more than fits.

**Tabs, not scrolling.** Three groups, balanced by content volume:

| Tab | Panels | Key |
|---|---|---|
| **Priorities** | What to touch next · Deadlines | `1` |
| **Team** | Who is carrying what · Your approval queue | `2` |
| **Risk & hygiene** | Going stale (full height) · Stalled + Board hygiene (stacked) | `3` |

The Risk tab nests a `.stack` so the long list gets the whole column height
while the two short panels share the other — otherwise a 26-item list sits next
to a 2-item one and both are badly served.

**Every tab badge carries its group's most urgent count** (overdue, people over
WIP, stalled + cold). Grouping must not trade scrolling for blindness: if
something needs attention on a tab you're not looking at, the badge says so.

Lists are capped to what fits — `FOCUS_LIMIT` 10, `ROT_LIMIT` 10, both reduced
in wallboard where the type is ~21% larger — and the panel header always states
the real total (`worst 10 of 26`). Both lists are sorted worst-first, so the tail
carries no information a count can't.

Verified scroll-free across 12 combinations (3 tabs × light/dark × desk/wallboard)
at 1728×1080. **Below 1180px the shell deliberately unwinds** into a normal
scrolling document with the rail beneath the work — two columns can't be honest
at a width that fits neither.

Wallboard mode now **rotates the tabs** every 20s rather than auto-scrolling,
since there is nothing left to scroll. Any input pauses the rotation for a
minute.

## UX rules

From the same source's `apple-design` skill (§16, the eight design principles
and the tactical rules under them). These are the ones that changed the build:

**Wayfinding — never trap the user.** Every view must answer where you are, what's
here, and how you get out.
- Wallboard mode hides the controls, so it ships a persistent **Exit wallboard**
  button. Previously the only way out was a keyboard shortcut nobody had been
  told about.
- Shortcuts live in a `?` popover in the UI, not only in this README.
- The filter reaches every panel at once, so an active filter shows a banner
  naming the term, and **every** empty panel distinguishes "nothing is stuck"
  (good news) from "your filter hid it" (a dead end) — the latter always
  carrying a *Show everything* button. There are three ways out: the banner
  button, the ✕ in the search field, and `Esc`.

**Grouping & mapping — a control sits near what it affects.** The filter is global,
so it lives in the header; the capacity table sits directly under the chart it
tabulates.

**Direct, specific labels beat safe generic ones.** Panels are named for what they
answer ("What to touch next", "Going stale", "Stalled — who to chase"), never
"Overview" or "Items". The theme button names its *destination* and its tooltip
says so outright, because a button reading "Light" can't tell you whether that's
the current state or the next one.

**Simplicity is not minimalism — common path first, detail one level deeper.** The
capacity panel leads with the chart; the exact per-person numbers are behind a
**Numbers** toggle (persisted) rather than permanently doubling the panel height.

**Feedback in four kinds — status, completion, warning, error.** Status is the live
pulse and its timestamp; warning is the sample-data banner; error is the API
banner, which keeps the last good snapshot on screen instead of blanking.

**Materials — never stack two translucent surfaces.** The shortcuts popover floats
over tinted banners and tiles, so it is near-solid and leans on a deeper shadow
for separation. Bigger surfaces read as thicker: it carries a heavier shadow than
a chip.

Cards leave the app, so they carry a hover `↗` and an "Open in monday.com"
tooltip — flagged rather than surprising you with a new tab. The glyph is
`aria-hidden`, since the link's own label already carries the destination.

## Motion & craft rules

The UI follows Emil Kowalski's design-engineering standards
([github.com/emilkowalski/skills](https://github.com/emilkowalski/skills)) plus
Apple's fluid-interface principles. Two rules govern everything, and breaking
either is a regression:

1. **This dashboard refreshes every 30s, so anything the refresh would replay
   does not animate.** Entrance motion is gated behind `body.booting`, which JS
   removes once after the first render. A cascade you see dozens of times a day
   reads as lag, not polish. Verified: a refresh re-renders every list with zero
   entrance animations running.
2. **Only `transform` and `opacity` animate.** No `width`/`height`/`background`
   transitions — they cost layout and paint. The change-flash is an opacity
   overlay (`.card::after`), not a background animation; meter and bar reveals
   are `scaleX` from a left origin, not width.

Beyond that: custom easing curves (`cubic-bezier(0.23, 1, 0.32, 1)` — the
built-in CSS easings are too weak), nothing over 240ms, `ease-in` never used,
press feedback on every pressable element (`scale(0.97)` buttons, `0.99` on wide
rows), hover motion gated behind `@media (hover: hover) and (pointer: fine)` so
touch taps don't trigger false hovers, exits faster than entrances, and no
`scale(0)` entrances.

Three accessibility signals are honoured independently: `prefers-reduced-motion`
(keeps opacity cues, drops all positional motion), `prefers-reduced-transparency`
(solid chrome instead of `backdrop-filter`), and `prefers-contrast` (near-solid
surfaces with defined borders). Plus a `forced-colors` block.

The one number that animates on change is a KPI, because a KPI moving is rare
and meaningful — state indication, not decoration. It fires only on an actual
value change, never on the repaint.

## Notes

- **Read-only by design.** It never writes to monday, so nothing here can
  mis-set a status on a shared board. Status write-back from the dashboard is
  possible if you want it — it just wasn't part of the ask.
- **Subitems count.** The Design Team board keeps real deliverables in subitems,
  so they flow into the review queue, deadlines and capacity as first-class
  items, showing their parent for context.
- Chart hues are validated for colour-blind separation and contrast against
  both surfaces (`#3987e5 / #c98500 / #d03b3b` dark, `#2a78d6 / #eda100 /
  #d03b3b` light). Every status colour is paired with an icon and a text label,
  so no meaning is carried by hue alone, and the capacity chart ships a table
  view beneath it.

### Refreshing the offline snapshot

```bash
node monday-dashboard/tools/capture.js
```

Re-bakes `raw.sample.json` from the live boards — handy for a point-in-time copy
before a big reshuffle, or for demoing without a token.

### Files

```
server.js          HTTP server, snapshot cache, static files
lib/monday.js      GraphQL queries + normalisation
lib/derive.js      all the metrics: lanes, focus ranking, load, rot, hygiene
config.json        boards, lanes, thresholds
public/            index.html · app.js · style.css
tools/capture.js   re-bake the offline snapshot
raw.sample.json    bundled snapshot for sample mode
```
