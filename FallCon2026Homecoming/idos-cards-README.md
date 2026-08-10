# IDOS share cards — cleanup

Drop-in replacement for `idos-card-1x1.html`, `idos-card-3x4.html`,
`idos-card-9x16.html` in `FallCon2026Homecoming/`.

## Files

| File | Role |
|---|---|
| `idos-card-1x1.html` · `-3x4.html` · `-9x16.html` | entry files — ratio flag + the five fields, nothing else |
| `idos-card.css` | all structure + shared values; one per-ratio scale block at the bottom |
| `idos-card.js` | font/image render gate, auto-fit, `?query=` overrides, measurement API |
| `_acceptance.html` | renders all 9 cases at true pixel size and prints the measured boxes |
| `img/3x4.png` | new — 1080×1440 crop of `9x16.png` (y-offset 202) |

Copy the five root files into `FallCon2026Homecoming/` and `img/3x4.png`
into its `img/`. `1x1.png`, `9x16.png`, `logo_h.png` are unchanged.

## What changed

- **One stylesheet.** The three entries share `idos-card.css`; only the
  `--*` scale variables differ per ratio, in a single block each. The 3x4
  drift (a byte copy of the square) cannot recur.
- **3x4 rebuilt at its own scale** — its own type scale, gaps and a real
  1080×1440 background. The ~406px void between statement and invite is gone.
- **9x16 fixed.** Eyebrow is 34px/4px tracking (was 52/12, ran 587px past
  the content edge); word auto-fits the 888px column; the statement/invite
  collision is structurally impossible now — the card is a flex column
  (header → body → footer) rather than absolute `top:` values, so the
  footer can never be overwritten.
- **No nowrap traps.** `.eyebrow` and `.word` fit by shrinking, then wrap.
- **Headshot is local.** `img/headshot.jpg` if present; if the file is
  missing the `<img>` removes itself and the designed empty state shows —
  the agent's initials in Anton over an orange halftone disc.
- **Render gate.** Anton / Inter 500·600·700 / Fraunces italic are
  requested with `display:block`, preloaded, then `document.fonts.load()` +
  `document.fonts.ready` (and image decode) must resolve before the card
  becomes visible and `data-card-ready` is set. Screenshot tools can poll
  `html[data-card-ready]`. Fails open after 4s.
  *Not self-hosted:* no licensed font binaries were available. Drop woff2
  files in and swap the two `<link>`s for `@font-face` to close that gap.

## Content limits

Typeset with no shrink at all:

- **word** ≤ 10 characters
- **statement** ≤ 120 characters
- **name** ≤ 28 characters

Past those, degradation order: word shrinks to 42% (then wraps) → invite
block shrinks to 70% → headshot to 70% → statement shrinks to 62% →
statement clamps to fewer lines with an ellipsis. Hard caps (word 24,
statement 260, name 60 chars) stop pathological input. The statement
always clears the footer by at least `--slack-min` (24/56/72px).

## Overrides

Any field can come from the URL, so the builder needn't rewrite markup:

```
idos-card-9x16.html?word=LEGACY&statement=To%20feel%20freedom…&name=Jessica%20Alvarez&initials=JA&photo=img/headshot.jpg
```

## Acceptance (measured, `_acceptance.html`)

3 ratios × 3 copy cases (default / long / extreme). All 9: **PASS** — no
element crosses x=96 or x=984 (`.dots` and `.ghost` excepted as intended
bleeds), nothing exceeds the card height, zero overlap between
`.statement`, `.invite`, `.headshot`, and box-for-box identical on a
second independent load. Widths are measured as painted text extents
(Range rects clipped by the element's overflow box), not block boxes, so
an overflowing line is actually caught.
