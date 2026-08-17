# IG Carousel Template System — Design Analysis & Generation Prompt

Source: `IG Template scrl.pdf` (71 screens, 10 labeled carousels).
Note: the rounded **Pro** pill (top right) and the row of **carousel dots** (bottom center) are
app UI chrome from the screenshots, not part of the template artwork. Ignore both when generating.

---

## 1. What this system is

Real-estate agent social templates, 4:5 portrait (1080×1350). Every screen is a full-bleed
photograph with type set directly on the image — no cards, no boxes, no drop shadows.
The whole system is one editorial voice: quiet luxury, magazine-cover restraint, warm neutrals.

Ten carousel families observed:

| # | Family | Structure |
|---|---|---|
| 1 | Just Listed (Everpeak, VT modern) | cover → 5 photo slides → CTA |
| 2 | Open House (Northfield, colonial) | cover → photo → contact card |
| 4, 5 | Realtor Highlight | portrait cover w/ name → 4 narrative slides → Let's connect |
| 6 | Open House (Sunshore, FL luxury) | cover → detail slide → date slide |
| 7 | Market Update | cover → 3 stat slides → Ask our experts |
| 8 | Coming Soon (Mercer & Stone, loft) | cover → photo grid → pull-quote |
| 9 | Property Trends | cover → Trend 01/02/03 → report CTA |
| 10 | Individual posts | single-slide variants of all of the above |

## 2. Four brand skins (pick one per carousel and hold it)

| Brand | Palette | Type voice | Photo subject |
|---|---|---|---|
| **Everpeak Properties** | forest greens, fog, stone | high-contrast serif, generous caps | Vermont modern, wood cladding, mountains |
| **Northfield Residential** | sky blue, lawn green, cream | tight geometric sans caps | suburban colonials, NJ |
| **Mercer & Stone** | deep olive-black `#33382E`-ish, warm white, terracotta accents from rug/brick | italic display serif | Brooklyn lofts, industrial windows |
| **Sunshore Living Realty** | ocean blue, terracotta roof, slate green panel `#3C4B47` | serif caps + small-caps | Florida/coastal estates |

Neutral base for all: off-white `#F4F2EE`, ink `#1C1C1A`, and a single deep tone (olive or slate)
used for solid text panels. Accent color always comes *from the photo*, never invented.

## 3. Typography

Two families only, never three.

- **Display serif** — transitional/Didone with sharp thin strokes. Two modes:
  - *Roman all-caps*, tracked slightly open, for hero words (`JUST LISTED`, `OPEN HOUSE`, `MARKET UPDATE`). Stacked on two lines, centered, leading ~0.85× — lines nearly touch.
  - *Italic mixed-case*, tighter leading (~1.05), for headlines and pull-quotes (`Coming Soon`, `About me`, `High above the neighborhood…`). Italic = the warm/personal register.
- **Sans** — neutral grotesque, used only small: eyebrows, brand lockups, body paragraphs, metadata. Eyebrows and lockups are ALL CAPS with wide tracking (0.12–0.2em) at 11–14px.
- Body copy: sans, 15–17px, line-height 1.5, set in short 2–4 line paragraphs separated by a blank line — never a dense block.
- Prices and stats: display serif, mid-large, on their own line, no currency abbreviation (`$1,450,000`, `+7.3%`, `29 DAYS`).
- One recurring ornament: a hairline rule ~120px wide, centered, 1px, 60% white — sits between hero word and price. That is the only decoration in the entire system.

## 4. Composition patterns (six layouts, reused everywhere)

1. **Centered hero** — full-bleed photo, hero word stacked dead center, hairline, price below, address block anchored to bottom third. Everpeak/Northfield covers.
2. **Bottom-left stack** — italic headline lower-left, body paragraphs beneath it, brand lockup bottom-center. Realtor Highlight and Mercer & Stone slides.
3. **Inset frame** — photo inset with equal margins (~40–60px) on a light or dark ground, caption in italic serif below. Detail/gallery slides.
4. **Split panel** — solid olive/slate field on one side or bottom, photo occupying the other; type lives on the solid side. Pull-quote and specs slides.
5. **Photo grid** — 2×2 or 1+2 asymmetric grid with 8–12px gutters, hero word overlapping the edge. Multi-photo listings.
6. **Text-only closer** — near-white or solid field, centered serif caps CTA + phone/`Link in bio`, brand lockup at the bottom. Always the last slide.

Layout mechanics common to all:
- Safe margin ~7% of width; type never within 60px of an edge.
- Vertical rhythm is thirds: eyebrow top, hero center, identity bottom.
- Hero type is allowed to **overlap** architecture (roofline, window mullions) — that overlap is the signature move, not an error.
- Legibility comes from a soft gradient scrim, not a box: linear-gradient top and bottom, `rgba(0,0,0,0.0 → 0.45)`, plus an optional global 8–12% dark wash on busy photos.

## 5. Recurring content slots

- Eyebrow: brand lockup, or `TREND 01 / PROPERTY TRENDS 2026`, or `APRIL 2026`, or address + city line.
- Hero: 1–3 words.
- Sub: price, date/time (`SAT 11AM`, `SUNDAY 2:30 PM`), or a stat.
- Specs line: `5 BED · 4 BATH · 3,300 SQ FT` — sans caps, middle dots, tracked.
- Address: `331 Meadowline Drive` (italic serif) over `Middlesex, VT 05602` (italic serif, smaller, 70% opacity).
- Pull-quote: in curly quotes, italic serif, 2–3 lines, centered or left.
- Brand lockup: `MERCER & STONE` with the ampersand in italic serif, over a tracked sans tagline `CURATED APARTMENTS FOR MODERN LIVING`.
- CTA: `Link in bio` in a small white pill, or a phone number, or `BOOK YOUR PRIVATE TOUR`.

## 6. Photography direction

Golden hour or overcast-soft. Warm interiors glowing against cool exteriors. Wide architectural
framing with breathing room at the top for sky. Interiors: natural wood, linen, stone, one plant.
Portraits: agent in black/cream tailoring, environmental setting (brownstone stoop, café street,
styled office), candid mid-action. Muted saturation, lifted blacks, no HDR crunch.

---

## 7. Generation prompt (paste into Claude)

> Design a collection of Instagram carousel templates for a real-estate agent, 4:5 portrait
> (1080×1350), in a quiet-luxury editorial style. Build them as self-contained HTML/CSS artboards,
> one `.slide` div per screen, using CSS custom properties for every color, font size, and content
> string so each is a reusable template.
>
> **Aesthetic:** full-bleed photograph, type set directly on the image, no cards or boxes or
> shadows. Warm neutral palette — off-white `#F4F2EE`, ink `#1C1C1A`, one deep tone per brand
> (deep olive `#343A2E` or slate green `#3C4B47`), with the only accent color sampled from the
> photo itself. Legibility from soft top/bottom gradient scrims (`rgba(0,0,0,0)` → `0.45`), never
> a solid label plate.
>
> **Typography:** exactly two families. A high-contrast transitional serif for display, used two
> ways — roman all-caps with slightly open tracking and 0.85 leading for stacked hero words
> (`JUST LISTED`, `OPEN HOUSE`), and mixed-case *italic* at 1.05 leading for headlines and
> pull-quotes (`Coming Soon`, `High above the neighborhood…`). A neutral grotesque used only small:
> all-caps eyebrows and brand lockups at 11–14px with 0.15em tracking, and body copy at 16px /
> 1.5 in 2–4 line paragraphs. Prices and stats in display serif on their own line. One ornament
> only: a centered 120px 1px hairline at 60% white between hero and price.
>
> **Layouts — produce these six and reuse them:** (1) centered hero with hairline, price, and
> bottom-anchored address block; (2) bottom-left italic headline with body paragraphs and a
> bottom-center brand lockup; (3) inset photo with equal 48px margins on a light ground and an
> italic serif caption below; (4) split panel — solid deep-tone field holding the type beside or
> beneath the photo; (5) 2×2 or asymmetric photo grid with 10px gutters and the hero word
> overlapping the grid edge; (6) text-only closing slide on a near-white or solid field with a
> centered serif-caps CTA, phone number or `Link in bio` pill, and brand lockup at the bottom.
> Keep a 7% safe margin, organize each slide in vertical thirds (eyebrow top / hero center /
> identity bottom), and deliberately let hero type overlap architectural lines.
>
> **Content slots each template must expose:** eyebrow (brand lockup, date, or `TREND 01`), hero
> (1–3 words), sub (price, `SAT 11AM`, or a stat), specs line (`5 BED · 4 BATH · 3,300 SQ FT` in
> tracked sans caps with middle dots), address (italic serif street over smaller 70%-opacity
> city/zip), optional pull-quote in curly quotes, brand lockup with tagline, and CTA.
>
> **Deliver these carousel sets,** each 4–7 slides that open on a cover and close on a CTA slide,
> holding one brand skin throughout: Just Listed, Open House, Coming Soon, Market Update (cover →
> three single-stat slides → ask-our-experts), Property Trends (cover → Trend 01/02/03 → report
> CTA), and Realtor Highlight (portrait cover with the agent's name in large italic serif → four
> narrative slides `About me` / `What working with me looks like` / `How I approach every deal` /
> `Why clients choose me` → `Let's connect`).
>
> Use placeholder photography that reads as golden-hour or overcast-soft architectural
> photography — muted saturation, lifted blacks, warm glowing interiors against cool exteriors.
> No app UI chrome, no badges, no carousel dots.
