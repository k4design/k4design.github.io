# Rebuild Prompt — IG Carousel Templates on Your Own Design System

Two parts. **Part A** is the fill-in block: paste your design system in and delete what doesn't
apply. **Part B** is the prompt itself — it never names a specific look, it only references the
tokens from Part A, so the same prompt produces a different-looking (but structurally identical)
collection for every design system you feed it.

Paste A and B together into Claude as one message.

---

# PART A — Design System Input

Fill this in. Anything you leave as `[…]` Claude will choose and then report back, so you can
correct it. If you have a real token file, Figma variables export, or brand guide, paste it raw
below instead of filling out the table — the prompt handles either.

```
BRAND / SYSTEM NAME: […]

--- Color ---
Surface / background:      […]
Surface alt (secondary):   […]
Ink / primary text:        […]
Ink muted / secondary:     […]
Brand primary:             […]
Brand secondary:           […]
Accent:                    […]
Deep tone for solid panels:[…]
On-image text color:       […]

--- Type ---
Display family:            […]        (weights available: […])
Body / UI family:          […]        (weights available: […])
Mono / metadata family:    […] or none
Type scale:                […]        (e.g. 12 / 14 / 16 / 20 / 28 / 40 / 64 / 96)
Tracking rules:            […]        (e.g. caps 0.12em, display -0.01em)
Case rules:                […]        (e.g. eyebrows uppercase, headlines sentence case)

--- Form ---
Corner radius:             […]        (0 for hard-edged systems)
Border / rule weight:      […]
Spacing unit + scale:      […]        (e.g. 4px base: 4/8/12/16/24/32/48/64)
Grid:                      […]        (e.g. 12-col, 24px gutter)
Elevation / shadow:        […] or none
Signature graphic element: […]        (rule, tick, bracket, chip, underline, dot, none)

--- Voice ---
Tone:                      […]        (e.g. warm and plain / technical / bold and loud)
Photography treatment:     […]        (e.g. duotone, high-key, desaturated, full color)
Logo lockup:               […]        (wordmark, mark + wordmark, tagline yes/no)

--- Hard rules (never violate) ---
- […]
- […]
```

---

# PART B — The Prompt

> Rebuild a collection of Instagram carousel templates for a real-estate agent, using **only** the
> design system given above. The structure, composition, and content model below are fixed
> requirements taken from a reference set; the entire visual language — color, type, spacing,
> corner radius, graphic devices, image treatment — must come from my design system. Where the
> reference set's look and my system's look conflict, **my system wins every time.** Do not import
> the reference's palette, serif/italic conventions, or ornamentation unless my tokens happen to
> specify them.
>
> **Build format.** Self-contained HTML/CSS artboards, 1080×1350 (4:5), one `.slide` element per
> screen, rendered at `transform: scale()` for on-screen preview but exact at full size. Put every
> design-system value in `:root` custom properties (`--color-*`, `--font-*`, `--space-*`,
> `--radius-*`) and reference them everywhere — no hard-coded hex, px font sizes, or magic numbers
> in rules. Put every piece of copy in a data attribute or a clearly marked content block so a
> template can be re-filled without touching layout CSS. Include a short comment above each
> template naming its layout archetype and its slots.
>
> **Content model — every template exposes these slots.** Omit a slot when it doesn't apply, but
> never invent new ones:
> - `eyebrow` — brand lockup, date (`APRIL 2026`), or index label (`TREND 01`)
> - `hero` — 1 to 3 words, the headline
> - `sub` — price, date/time, or a single stat
> - `specs` — `5 BED · 4 BATH · 3,300 SQ FT`, a delimited metadata run
> - `address` — street line over a smaller, de-emphasized city/postal line
> - `body` — 2 to 4 short paragraphs, blank-line separated, never a dense block
> - `quote` — a 2–3 line pull-quote
> - `lockup` — logo/wordmark plus optional tagline
> - `cta` — `Link in bio`, a phone number, or a booking line
>
> **Six layout archetypes.** Produce all six as reusable templates, then compose the carousels from
> them. These are structural skeletons — express each one through my system's grid, spacing scale,
> and type scale:
> 1. **Centered hero** — full-bleed image; hero optically centered; sub directly beneath; address
>    block anchored in the bottom third.
> 2. **Corner stack** — hero and body left-aligned in one bottom corner, lockup opposite or centered
>    at the base.
> 3. **Inset frame** — image inset with equal margins from the spacing scale, sitting on a surface
>    field, caption below.
> 4. **Split panel** — solid field of one color holding all the type, image occupying the
>    complementary region; split on a grid line, not an arbitrary fraction.
> 5. **Image grid** — 2×2 or asymmetric 1+2 grid, gutters from the spacing scale, hero type crossing
>    the grid edge.
> 6. **Type-only closer** — no photograph; centered or grid-aligned CTA on a surface or brand field,
>    lockup at the base. Always the final slide of a carousel.
>
> **Layout mechanics that must hold across all six:**
> - A safe margin of ~7% of width; no element inside it.
> - Vertical organization in three zones: eyebrow up top, hero in the middle band, identity
>   (address / lockup / CTA) at the base.
> - Text over photography gets legibility from a gradient scrim or my system's own overlay
>   convention — not from a solid box behind the words, unless my system's signature element *is*
>   a plate or chip.
> - Hero type is allowed to overlap architectural lines in the photo; that tension is intentional.
> - Optical alignment over mathematical: adjust for the flush edges of caps and quotation marks.
> - No app UI chrome — no badges, watermarks, or carousel dot indicators.
>
> **Six carousel sets to deliver.** Each opens on a cover and closes on the type-only CTA slide, and
> holds a single visual treatment start to finish so it reads as one post when swiped:
> - **Just Listed** — cover, 4–5 photo slides (exterior, living, kitchen, bath, outdoor), CTA.
> - **Open House** — cover, detail slide with specs and price, date/time slide, CTA.
> - **Coming Soon** — cover with address eyebrow, image grid, pull-quote slide, CTA.
> - **Market Update** — cover, three single-stat slides (`$1,325,000` median price, `+7.3%` growth,
>   `29 DAYS` on market), ask-our-experts CTA.
> - **Property Trends** — cover, `TREND 01/02/03` slides each pairing a headline with a short body
>   and a supporting thumbnail, report-download CTA.
> - **Realtor Highlight** — portrait cover carrying the agent's name at display scale, then four
>   narrative slides (`About me`, `What working with me looks like`, `How I approach every deal`,
>   `Why clients choose me`), then `Let's connect`.
>
> **Photography.** Use placeholder images treated per my system's photography rule. Real-estate
> subject matter: architectural exteriors with headroom for sky, interiors with natural light,
> environmental agent portraits in mid-action.
>
> **Before you write any code,** state in six bullets how you're translating the fixed structure
> into my system: which family and scale step carries the hero, how the eyebrow is set, what
> replaces the reference set's hairline ornament, how the split panel divides on my grid, which
> color pairs you're using over photography, and any place my hard rules force a departure from the
> structure above. Then build.
>
> **After building,** list every value you had to choose because my design system didn't specify it,
> so I can supply the real token.

---

## Notes on using this

- The two "before you write code / after building" clauses are the important part — they surface
  the translation decisions while they're still cheap to change, and they flag gaps in your token
  set instead of silently filling them.
- If your system is minimal or brutalist, expect the six archetypes to survive but the *scrim*
  convention to be the first thing that breaks. Answer it explicitly in your hard rules
  (e.g. "text never sits on photography; always a solid field").
- Structural analysis of the original reference set lives in [TEMPLATE-DESIGN-SPEC.md](TEMPLATE-DESIGN-SPEC.md) —
  attach that too if you want Claude to see the source aesthetic it's replacing.
