# Aperture Global Real Estate — Design System

Aperture Global is the international luxury arm of LPT Holdings ("LPTA"), a technology-driven brokerage platform. The brand sells representation of exceptional homes: listing presentations, property campaign reports, direct mail strategy documents, digital billboards, and property websites. Register is quiet luxury: confidence without noise.

## Sources
- `uploads/ApertureGlobal_logokit/` — official logo kit (Black/White/1-Color, horizontal + vertical, SVG/PNG/JPG/PDF)
- `uploads/Copy of APERTURE Listing Presentation Draft v2.pdf` — 43-page agent listing presentation (deck dialect)
- `uploads/ApertureGlobal_DigitalCampaignReport-a8faa5ac.pdf` — 8-page per-property digital campaign report (report dialect)
- `uploads/ApertureDigitalBillboardReport-d25931fa.pdf` — 5-page billboard campaign report (report dialect)
- `uploads/ApertureGlobal_RegionalDirectMailStrategy.pdf` — 6-page direct mail strategy (report dialect)
- A written voice reference supplied in chat (rules captured below)
- Page renders of all PDFs live in `_pdf_pages/` for visual reference; extracted text in `_notes/`

## Two visual dialects
1. **Report dialect (primary, current direction):** white pages (#FFFFFF) with warm near-black ink, interleaved charcoal (#0C1115) pages, black back cover. Cream (#F4F2EA) appears only as a sparing warm tint panel, never as the default page. High-contrast old-style display serif with the final word italicized ("Precision over *volume*."). Letterspaced uppercase micro-labels. Hairline rules. Large serif stat numerals. Muted blue-gray data bars. No color otherwise.
2. **Deck dialect (listing presentation):** black/near-black pages with white serif headlines, bright blue accent (#2285E0) used for the emphasized word, numbered blue eyebrow labels, thin blue vertical bar beside section titles, white content pages with structured columns. Aperture "shutter" mark used as watermark and section divider motif.

Use the report dialect for documents and print-adjacent artifacts; the deck dialect for the listing presentation and slide-like surfaces.

## CONTENT FUNDAMENTALS
The register is quiet luxury. The voice observes rather than sells and trusts the reader to recognize quality.

- Short declarative sentences. Fragments allowed and useful: "One standard. One experience. One collective." Vary length so the short line lands.
- **No em dashes or en dashes anywhere.** Commas, periods, or restructure.
- Numbers spelled out in prose (five Emmy Awards). Exceptions: street addresses and data displays.
- Facts beat superlatives. Replace "award-winning / world-class / breathtaking" with the fact that earned it: "Ranked number two in the Deloitte Technology Fast 500."
- Award copy pattern: definition, claim, benefit. What the award is, what we earned, what it does for your home.
- Client-benefit framing: every credential resolves to what it means for the seller/buyer ("Your home benefits from every bit of it.").
- No commands, no urgency language, no "the Aperture difference," no "more than a home" constructions. Minimal functional CTAs only ("Read More").
- Headline pattern: plain statement with the pivotal word in italic. "Thirty days, *measured*." "One home. *Every screen*." "The right buyers live in the *right places*."
- Ration "X is Y" aphorisms. Prefer an observed image to a definition.
- Detail selection: three details, chosen on different axes (craft, provenance, setting).
- Claims discipline: never publish unverifiable claims; qualify honestly (regional Emmy if regional); attribute precisely (Aperture Global vs LPT, the platform behind it).
- Highlight treatment (bold/color) goes on the verifiable claim only, one per block. Read only the emphasized phrases on a page and they should scan as a list of facts.
- The last line of anything is the strongest: a name, an address, or the plainest fact.
- Casing: headlines are sentence case with terminal periods. Labels are uppercase letterspaced. No emoji, ever.
- Voice is first-person-plural sparingly ("we"), second person for benefit ("your home"). The home is the subject more often than the brand.

## VISUAL FOUNDATIONS
- **Color:** white #FFFFFF (core light surface), ink #2B2A25, charcoal #0C1115, black #0A0A0A, navy #020817, cream #F4F2EA (sparing warm tint only), blue #2285E0 (deck only), data blue-gray #B9C6D0, white. Max two page background colors per document. Color is structural (page-level), never decorative.
- **Type:** display serif (high-contrast old-style; Cormorant Garamond substitute) for headlines and stat numerals at regular weight; neutral grotesque (Archivo substitute) for labels, body, captions. Body copy is small (11–14px equivalent), light weight, generous leading, narrow measure (~34ch). Signature move: uppercase 9–10px labels with .28–.4em tracking.
- **Numerals:** oversized serif figures (46,663 / 70% / 536) at 60–90px, paired with a small letterspaced label. Data is typographic, not infographic.
- **Rules:** 1px hairlines everywhere, low-contrast (rgba ink at ~25%). A short 24px horizontal dash before eyebrow labels in the deck. Thin vertical accent bar (2–3px, blue) beside deck section titles.
- **Corners:** zero radius. Nothing is rounded, no pills, no capsules.
- **Shadows:** none. Flat surfaces separated by color and rules only.
- **Layout:** generous margins (~64px on letter pages), asymmetric single-column starts, left-aligned everything on report pages; deck uses centered covers and structured 2–3 column grids. Footers: letterspaced running label left, page marker or aperture URL right, hairline above.
- **Backgrounds:** flat color fields or full-bleed photography dimmed toward charcoal with gradient protection at top/bottom. Deck section dividers use the aperture mark cropped huge, tonal dark-on-black.
- **Imagery:** architectural photography, dusk/evening bias, warm interior light against cool skies, reflective water. Full-bleed on covers; boxed with hairline captions inside pages. No illustration.
- **Charts:** horizontal bar rows, 4–6px tall bars in #B9C6D0 on cream, hairline baseline, label left, value right. Simple line maps (1px outline) with dot markers.
- **Motion:** print-first brand; in digital contexts keep it to slow opacity fades (300–500ms ease-out). No bounces, no parallax.
- **Hover/press:** understate. Hover = opacity .7 or underline; press = no transform. Links underlined thin, same ink color, or accent blue in deck contexts.
- **Transparency/blur:** none observed. Use solid dark panels over imagery instead.
- **Cards:** not a card brand. "Cards" are just areas bounded by hairlines or a tint (cream #F4F2EA tint on white, used sparingly, or #FFFFFF panel on dark).

## ICONOGRAPHY
- The brand essentially uses **no icon system**. Structure is carried by typography, rules, and numbering (01, 02, 03).
- The only recurring marks: the Aperture shutter logomark (watermark, section dividers, footer), small social glyphs (Facebook/Instagram/LinkedIn) on the agent contact page, and country flags on development cards.
- Bullets are typographic: thin en-quad bullets or middle dots (·) as separators in letterspaced label rows ("MONTANA · NORTH DAKOTA · MINNESOTA").
- If an icon is unavoidable in a new artifact, use a 1px-stroke set (Lucide via CDN) at low density, never filled, never colored. This is an addition, not an observed pattern; prefer text.
- No emoji, no unicode dingbats.

## Fonts — FLAGGED SUBSTITUTION
No font binaries were provided (PDFs embed outlined/subset fonts). Substitutes via Google Fonts in `tokens/fonts.css`:
- Display serif → **Cormorant Garamond** (nearest match to the report/deck headline serif)
- Sans → **Archivo** (nearest match to the neutral grotesque)
Ask the brand team for the licensed families and replace `tokens/fonts.css` with real `@font-face` rules when available.

## Intentional additions
- `forms/` components (Button, Input, Select, Checkbox, Radio): no UI source was provided; authored minimally in-brand for digital artifacts (property sites, lead capture) since the PDFs reference "lead capture & buyer registration."
- Lucide-by-CDN icon fallback rule above.

## Index
- `styles.css` — global entry; imports `tokens/{fonts,colors,typography,spacing}.css`
- `assets/logos/` — official logo kit (black/white/1-color, horizontal/vertical, SVG+PNG)
- `guidelines/` — specimen cards (Type, Colors, Spacing, Brand groups)
- `components/display/` — SectionLabel, Stat, Divider, MarketBar, PressCard, PropertyCard, PageFooter
- `components/forms/` — Button, Input, Select, Checkbox, Radio
- `ui_kits/campaign_report/` — report-dialect document pages (cover, approach, performance, engagement)
- `ui_kits/listing_presentation/` — deck-dialect pages (cover, section divider, foundation, awards)
- `_pdf_pages/`, `_notes/` — source renders and extracted text (reference only)
- `SKILL.md` — agent skill entry point
