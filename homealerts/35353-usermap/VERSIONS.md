# 35353 — The three design directions

The 35353 **marketing + consumer surface** is being explored as three parallel
"looks." They are *alternatives to choose between*, not a sequence of upgrades.
All three share the same product, page structure, copy spine, and coral accent —
what changes is palette, typography, layout rhythm, motion, and emotional tone.

The agent dashboard, auth, admin, legal, and error screens are **shared** — they
render in a single look regardless of which marketing direction is chosen.

| Page family | Classic | Bold | Warm |
|---|---|---|---|
| Home | `/` | `/v2` | `/v3` |
| Find | `/find` | `/v2/find` | `/v3/find` |
| For Agents | `/for-agents` | `/v2/for-agents` | `/v3/for-agents` |
| Pricing | `/pricing` | `/v2/pricing` | `/v3/pricing` |
| Integrations | `/integrations` | `/v2/integrations` | `/v3/integrations` |
| Resources | `/resources` | `/v2/resources` | `/v3/resources` |

In the user map, the **Look** switch (top-right) flips every marketing, Find, and
mobile-marketing thumbnail between the three at once.

---

## V1 · Classic — *light, friendly, familiar*  `/`

The lowest-risk, highest-legibility direction. Reads like a polished, trustworthy
PropTech SaaS site.

- **Palette** — White / near-white base, dark ink text (`#1a1a1a`), with **coral
  `#f37655`** *and* **teal `#006a64`** sharing accent duty (`teal-light #e6f3f2`
  for tinted chips). Two accent colors give it a brighter, more "product" feel
  than the others.
- **Typography** — Plus Jakarta Sans throughout. Geometric, neutral, bold-weight
  headlines. No display serif.
- **Layout** — Conventional conversion structure: centered hero with a phone
  mockup, a four-stat credibility bar, an explicit **"Why not just scan a QR
  code?"** text-vs-QR comparison, property-photo feature cards, testimonials, and
  a **teal CTA band** ("Put a code on your sign riders").
- **Tone** — Approachable, clear, safe. Maximizes readability in any lighting.
- **Best for** — Broadest appeal and trust; the least likely to alienate the
  45–65 agent demographic or struggle in bright outdoor/curbside use.

## V2 · Bold — *dark, cinematic, high-energy*  `/v2`

The most distinctive and modern direction — an app/startup confidence play.

- **Palette** — Near-black canvas (`#15110e`), warm off-white text (`#f6efe8`),
  raised panels in `#1b1611`, **coral `#f37655` as the single hot accent**. Big
  full-bleed photography carries the sections.
- **Typography** — Plus Jakarta Sans + **Hanken Grotesk**; oversized, expressive
  display headers with coral emphasis ("See any home **the moment you see the
  sign**", "Pricing that scales with your **sign count**").
- **Layout** — Cinematic dark sections, an **interactive phone-demo hero**, an
  "every sign rider becomes a lead" coral panel, a "behind every text, a real
  person" block, and a dark featured-tier pricing table.
- **Tone** — Premium, energetic, attention-grabbing; the boldest brand statement.
- **Watch-out** — Reviewed **7.5/10**. The dark, lower-contrast treatment is the
  hardest of the three to read for older agents and in direct sunlight at the
  curb — exactly where buyers first meet the product.

## V3 · Warm — *warm, human, editorial*  `/v3`

A deliberate middle path: keeps a premium, designed feel like Bold, but solves
Bold's legibility problem by returning to a light, high-contrast canvas.

- **Palette** — Warm paper (`#f7f1ea`), **high-contrast warm ink** (`#241c16`,
  legibility first), coral accent retained, plus **one espresso anchor section**
  (`#211a15`) for depth instead of a fully dark page.
- **Typography** — **Fraunces display serif** paired with Jakarta/Hanken. The
  serif gives it a magazine/editorial voice ("See the home **behind the sign**",
  "Find the home **behind the sign**") the other two don't have.
- **Layout** — Serif headlines, a numbered **"Three steps. That's the whole
  thing."** story, lifestyle imagery (kitchen, people), and an espresso **"Behind
  every text, a real person"** section with team photos.
- **Tone** — Warm, trustworthy, relationship-led; premium but never cold.
- **Best for** — Positioning 35353 as human and personal while keeping the strong
  outdoor/older-agent legibility that V2 sacrifices.

---

## How to pick, in one line each

- **Classic** — safest, brightest, most conversion-conventional.
- **Bold** — most striking and contemporary, but legibility-risky outdoors/for older agents.
- **Warm** — Bold's premium ambition with Classic's readability; the human/editorial bet.

> Screens captured June 16, 2026 from the live build (`https://localhost:3000`).
> To regenerate, run `_capture/capture.mjs` (Puppeteer harness).
