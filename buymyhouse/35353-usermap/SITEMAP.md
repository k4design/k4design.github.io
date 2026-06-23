# 35353 — Site Map / User Map Reference

A page-by-page inventory of every screen in the 35353 product. Pages are grouped by user role and funnel position so this doc can drive a user-map directly. Each entry lists the screenshot filename, the route (where the page lives in the Vue app), the audience, and what it connects to.

All paths assume the Vue app's web history (e.g. `35353.com/find`). Auth-gated routes are marked **[auth]**. Staff-only routes are marked **[staff]**.

> 🎨 **Three looks:** the marketing + consumer surface exists in three parallel design directions — **Classic** (`/`), **Bold** (`/v2`), **Warm** (`/v3`). See [VERSIONS.md](VERSIONS.md) for an in-depth comparison; the user-map's **Look** switch flips every marketing thumbnail between them. The dashboard/auth/admin/legal/error screens are shared across all three.

---

## 1 · Marketing surface (top of funnel, public)

These are the pages a prospect — agent or curious consumer — lands on from organic search, ads, or word of mouth. The shared nav between them is: **Find a property / For Agents / Pricing / Integrations / Resources** + `Sign in` / `For Agents →` CTA.

| # | Page | Route | Audience | Connects to |
|---|------|-------|----------|-------------|
| 01 | Home (`/`) | `/` | Mixed (consumer + agent) | Register, Find, ForAgents, PublicListing (sample), Pricing |
| 02 | For Agents | `/for-agents` | Agents | Register, Pricing, contact-sales dialog, Home |
| 03 | Pricing | `/pricing` | Agents | Register, contact-sales dialog, Account Settings → Billing (if signed in) |
| 04 | Integrations | `/integrations` | Agents | Register, ForAgents |
| 05 | Resources | `/resources` | Agents (mostly) | Resource detail pages, Register |

> 💡 **Note for the user-map:** the live Vue app does **not** have a separate `/how-it-works` route — that content lives inside Home and ForAgents. The static design-reference folder has a standalone `how-it-works.html` file but it's not wired into the router.

---

## 2 · Consumer surface (buyer-facing)

These are the pages a buyer sees after — or instead of — texting the property code. Critical for the campaign's “Text 35353” pitch.

| # | Page | Route | Audience | Notes |
|---|------|-------|----------|-------|
| 01 | Find (empty) | `/find` | Buyer | Entry hub: search by code / address / MLS / zip |
| 02 | Find (results) | `/find?q=…` | Buyer | List of matching listings, links to public listing |
| 03 | Public listing | `/p/:code` | Buyer | Photos, price, stats, agent info, Schedule a Showing |
| 04 | Public listing — not found | `/p/INVALID` | Buyer | Code doesn't exist; offers Search fallback |

**Buyer flow:** sees yard sign → texts code → receives reply with `/p/:code` URL → lands on Public listing → taps **Schedule a Showing**. Find is the search fallback if the text didn't work or the buyer is browsing from the website directly.

---

## 3 · Auth flows

| # | Page | Route | Audience | Notes |
|---|------|-------|----------|-------|
| 01 | Sign in | `/signin` | Agents | Forgot-password link, register link |
| 02 | Register | `/register` | Agents | Account creation; assigns agent phone number |
| 03 | Forgot password | `/forgot-password` | Agents | Sends reset link |
| 04 | Reset password | `/reset-password?token=…` | Agents | From email link |
| 05 | Verify email *(placeholder)* | `/verify-email` | Agents | Phase 3 feature, not yet wired |

There's also an **invite accept** route (`/accept-invite/:token`) used when a team owner invites a teammate — not captured here because it needs a valid token.

---

## 4 · Agent dashboard (auth-gated)

Everything under `/app/*`. Shared layout: left sidebar (Dashboard, Analytics, Listings, Prospects, Showings, Messages, Team, Settings, Support, Sign Out) + top bar with search and notifications.

| # | Page | Route | Audience | Notes |
|---|------|-------|----------|-------|
| 01 | Dashboard | `/app/dashboard` **[auth]** | Agents | KPIs, live lead feed, top listings, recent showings |
| 02 | Listings | `/app/listings` **[auth]** | Agents | All listings (grid/table), search, status filter |
| 03 | New listing | `/app/listings/new` **[auth]** | Agents | Multi-step form: address, photos, code, price |
| 04 | Listing detail (agent) | `/app/listings/:id` **[auth]** | Agents | Listing-level analytics, edit, archive |
| 05 | Prospects | `/app/prospects` **[auth]** | Agents | Lead pipeline (Kanban + list), source filters |
| 06 | Lead detail | `/app/prospects/:id` **[auth]** | Agents | Conversation history, lead status, notes |
| 07 | Showings | `/app/showings` **[auth]** | Agents | Calendar of booked showings |
| 08 | Messages | `/app/messages` **[auth]** | Agents (Pro+) | Inbox of all SMS conversations |
| 09 | Team | `/app/team` **[auth]** | Agents (Pro+) | Members, roles, invites |
| 10 | Analytics | `/app/analytics` **[auth]** | Agents | Charts: leads over time, by source, conversion, top listings |
| 11 | Notifications | `/app/notifications` **[auth]** | Agents | Activity feed |
| 12 | Account settings | `/app/settings` **[auth]** | Agents | Profile, billing, integrations, team, security tabs |
| 13 | Support | `/app/support` **[auth]** | Agents | Help articles + contact form |
| 14 | Billing *(placeholder)* | `/app/billing` **[auth]** | Agents | Phase 4 feature, not yet wired |

> 💡 **Plan gating:** Messages and Team are hidden / restricted on the Starter plan. The `PlanGate` component handles this in code.

---

## 5 · Admin (35353 internal staff)

| # | Page | Route | Audience | Notes |
|---|------|-------|----------|-------|
| 01 | Admin overview | `/app/admin` **[auth + staff]** | 35353 internal | Tabs: Users, Teams, Inquiries, Deletion requests, Overview |

When a user has a `staff_role`, the router auto-redirects them away from agent-only pages (Dashboard, Listings, etc.) to `/app/admin`. Conversely, non-staff hitting `/app/admin` get bounced to `/app/dashboard`.

---

## 6 · Legal & SMS compliance

Required for TCPA compliance because this is an SMS product.

| # | Page | Route | Audience |
|---|------|-------|----------|
| 01 | Privacy policy | `/legal/privacy` | Public |
| 02 | Terms of service | `/legal/terms` | Public |
| 03 | TCPA compliance | `/legal/tcpa` | Public |
| 04 | Help center *(placeholder)* | `/help` | Public — coming soon |
| 05 | Sign templates *(placeholder)* | `/help/sign-templates` | Agents — coming soon |

Every footer in the app links to **Privacy / Terms / TCPA**. The Sign templates page is intended to be a downloadable library of yard-sign, billboard, and broadcast templates — important for the campaign's multi-channel reach but not yet built.

---

## 7 · Error states

| # | Page | Route | Notes |
|---|------|-------|-------|
| 01 | 404 — Not found | catch-all | Bad route fallback |
| 02 | 500 — Server error | `/500` | Server failure fallback |
| 03 | Public listing — empty/loading skeleton | `/p/INVALID` (no backend) | Skeleton state before data resolves; useful for understanding what an unfilled listing looks like |

---

## 8 · FSBO sub-site (separate prototype kit)

This is a **separate site** prototyped alongside the main 35353 product, aimed at *for-sale-by-owner* sellers. Not wired into the Vue app's router — these are standalone static HTMLs in `design-reference/fsbo/prototypes/`. Treat as a sibling brand or product line.

Two brands inside the kit:

- **OwnerSeller.com** — Bright, empowering — entry point for FSBO journeys
- **FSBOSupport.com** — Calm, concierge — the trusted advisor when DIY gets hard

| # | Page | File | Brand | Notes |
|---|------|------|-------|-------|
| 01 | Prototype index | `fsbo/prototypes/index.html` | Both | Map of all FSBO screens |
| 02 | OwnerSeller — Home | `ownerseller-home.html` | OwnerSeller | Hero, trust bar, value pillars, free tools |
| 03 | OwnerSeller — Hub *(auth)* | `ownerseller-hub.html` | OwnerSeller | Personal dashboard, milestone progress, sticky help |
| 04 | OwnerSeller — Readiness quiz | `ownerseller-quiz.html` | OwnerSeller | 7-question quiz with animated score wheel |
| 05 | OwnerSeller — Valuation result | `ownerseller-valuation.html` | OwnerSeller | Animated value, comp grid, inline email capture |
| 06 | FSBOSupport — Home | `fsbosupport-home.html` | FSBOSupport | Search-first hero, problem-led topic tiles |
| 07 | FSBOSupport — Article | `fsbosupport-article.html` | FSBOSupport | Long-form read with TOC, callouts, sticky CTA |

---

## 9 · Mobile views (390 × 844 viewport)

The product is mobile-first by design — buyers will encounter the consumer surface from their phones standing in front of a sign. These shots show the responsive layout for the most-traveled paths.

| # | Page | Audience |
|---|------|----------|
| 01 | Home | Mixed |
| 02 | Find | Buyer |
| 03 | For Agents | Agent |
| 04 | Pricing | Agent |
| 05 | Public listing | Buyer |
| 06 | Dashboard | Agent |
| 07 | Listings | Agent |
| 08 | Prospects | Agent |

---

## Quick user-flow reference

**Buyer (consumer) journey**
```
billboard / yard sign / radio
    ↓  texts code → 35353 (per agent number)
SMS reply with /p/:code link
    ↓
Public listing → Schedule a Showing → (form submit)
```

**Agent acquisition journey**
```
Marketing nav (Home / ForAgents / Pricing / Integrations / Resources)
    ↓  CTA → Register
Register → confirm number → land in /app/dashboard
    ↓
Tour → Add first listing → Get code → Print sign
```

**Agent daily journey (post-onboarding)**
```
SignIn → Dashboard (KPIs) → Prospects (new leads)
    ↓                    ↓
Listings           Lead detail (conversation)
    ↓                    ↓
Analytics          Schedule showing
    ↓                    ↓
Messages           Showings calendar
```

**Staff (35353 internal) journey**
```
SignIn → Admin → Users / Teams / Inquiries / Deletion requests
```

---

## Pages worth flagging for the user map

A handful of routes exist but are intentionally placeholder pages (not fully built):

- `/help` (Help Center) — coming-soon, Phase TBD
- `/help/sign-templates` (Sign Templates Library) — coming-soon
- `/verify-email` — Phase 3 (auth flow not yet enabled)
- `/app/billing` — Phase 4 (Stripe integration not yet enabled)

These show as `PlaceholderView.vue` with “coming soon” messaging. Worth representing on the user map as **stubs** (dashed boxes or grey nodes) since they're navigable but not functional.
