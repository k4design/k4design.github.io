# Creative Direction — iOS

A native SwiftUI companion to the web dashboard. It reads the **same
`/api/snapshot` endpoint**, so nothing is re-derived on the phone and the two
surfaces can never disagree about what "overdue" means.

```
iPhone ──► /api/snapshot ──► lib/derive.js ──► monday GraphQL
Browser ──┘                       ▲
                          the token lives only here
```

The monday token is never in the app binary, never on the device, and never in
a request the phone makes. The app only ever talks to your dashboard server.

---

## Open it

```bash
open monday-dashboard-ios/CreativeDirection.xcodeproj
```

Pick any iPhone simulator (or your own device) and press **⌘R**.

**A simulator runtime is not installed on this Mac**, so the app was verified by
compiling — not by running. To get a simulator:

```bash
xcodebuild -downloadPlatform iOS
```

That's a multi-gigabyte download. Alternatively: Xcode → Settings → Components →
iOS 26.5. Once installed, ⌘R works normally.

### What was verified

| Check | Result |
|---|---|
| All 10 Swift files typecheck against the iOS 26.5 SDK | pass |
| `xcodebuild` full compile + link | **BUILD SUCCEEDED**, 1.2 MB binary |
| `Codable` models decode the live payload | pass — all 3 scopes, 13-person roster, 56 activity entries |
| Both ISO-8601 date shapes in the payload parse | pass |
| ATS + local-network keys present in the built `Info.plist` | pass |
| SwiftUI linked, arm64 | pass |
| Launched in a simulator | **not done — no runtime installed** |

---

## Point it at your server

The address is in **Settings** (gear, top-right). It defaults to
`http://localhost:5180`, which is correct in the simulator with no setup.

| Where the app runs | Use |
|---|---|
| Simulator on this Mac | `http://localhost:5180` (the default) |
| Real iPhone on your wi-fi | `http://<your-mac-ip>:5180` — Mac awake, server running |
| Anywhere | your Netlify URL over HTTPS |

Find the Mac's current address with:

```bash
ipconfig getifaddr en0
```

**Don't hardcode it.** This Mac's IP moved from `192.168.1.87` to
`192.168.2.152` during development — DHCP reassigns it, so a baked-in address
goes stale. That's why the default is localhost and the LAN address is a
setting.

Plain HTTP to a LAN address works because `Info.plist` sets
`NSAllowsLocalNetworking` — an exception scoped to local networks only. Public
HTTPS enforcement is untouched, so a Netlify URL is unaffected. iOS will ask
once for local-network permission.

---

## What's on it

A phone is a triage surface, not a shrunken dashboard, so this is deliberately
narrower than the web app — the four things you'd act on away from your desk.

| Tab | Contents |
|---|---|
| **Today** | Hero *waiting on your review*, the four failure-mode tiles, then the ranked *what to touch next* list with its reason chips |
| **Queue** | Your approval queue (oldest wait first), stalled work, and deadlines |
| **Team** | Capacity per person — **tap a row to drop their work**, same as the web app — plus board hygiene meters |
| **Activity** | The humanised live feed, scoped to the active boards |

Shared with the web app:

- **Board scope** segmented control — Design / Aperture / Both
- **Filter** via the native search bar, matching the same fields
- **Assignee colours** — the slot numbers come from the API `roster`, so a
  person is the same colour on both surfaces. Initials sit *inside* the swatch
  because five hues can't be told apart reliably enough to carry identity
  (see the web README for the measured numbers)
- Status colours always paired with an SF Symbol, never hue alone
- Empty states distinguish *nothing is wrong* from *your filter hid it*
- Boards with no due-date column say so, rather than implying nothing is due
- **Cold listings raise no alerts.** Aperture's Cold/Warm/Hot column suppresses
  an item from every alert list. The filtering happens server-side in
  `derive.js`, so the app inherits it for free — it only labels a Cold item
  (`Cold — no alerts`) where one still appears, e.g. in a capacity row

iOS-specific behaviour:

- **Pull to refresh**, plus a 30s poll that runs **only in the foreground** —
  `scenePhase` stops the ticker on background so a pocketed phone does no work,
  and refreshes the instant it returns
- A badge on the **Queue** tab showing the review count
- Tapping any row opens that item in monday

---

## Files

```
CreativeDirection.xcodeproj/         hand-written project + shared scheme
CreativeDirection/
├── CreativeDirectionApp.swift       @main entry
├── Info.plist                       ATS local-networking exception
├── Model/Snapshot.swift             Codable mirror of /api/snapshot
├── Services/DashboardStore.swift    @Observable state, fetch, foreground ticker
├── Design/Theme.swift               the web palette + formatting
└── Views/
    ├── RootView.swift               shell: scope picker, banners, tab bar
    ├── TodayView.swift              hero + KPI grid + focus list
    ├── QueueView.swift              approval queue, stalled, deadlines
    ├── TeamView.swift               capacity with expandable rows, hygiene
    ├── ActivityView.swift           live feed + settings sheet
    └── ItemRow.swift                shared row, chips, flow layout, empty state
```

Zero dependencies — Foundation, SwiftUI and Observation only.

## Not built yet

- **Home Screen widget** showing the review count. This is the strongest
  remaining iOS-specific win, and needs a second app-extension target.
- **Push notifications** when something lands in your review queue — needs a
  server-side push component and an Apple Developer account.
- **Write actions.** Like the web app, this is strictly read-only.
