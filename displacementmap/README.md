# Mockup Forge Map Baker

A Photoshop UXP panel that bakes the three per-surface maps the **Mockup Forge**
renderer consumes — displacement, shadow and highlight — from a product
photograph, and wires them into that item's `item.json`.

Why it exists: the catalog's shadow and highlight maps are currently synthetic.
`mockupplugin/apps/api/src/seed/raster.ts` generates them as SVG gradients — a
4-stop linear ramp across the surface polygon, and one blurred diagonal "sweep"
bar — carrying no information from the photograph at all. Artwork therefore gets
generic gradient shading no matter where the real folds and shadows sit. And only
one item ships a displacement map, in the scalar mode that hardwires `dy` to
`dx * 0.72`, so cloth pushes the same direction everywhere regardless of fold
orientation.

Photoshop is the right place to fix that, because it can read the real photo.

## Requirements

- Photoshop 24.0 or newer (the Imaging API needs 23.3+; 24 for headroom)
- [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/guides/devtool/) for development loading
- Node 18+ if you want to run the tests

## Build

The panel loads `dist/panel.js`, which is generated. **Run this before loading the
plugin, and after every edit under `src/`:**

```bash
node tools/build.mjs
```

## Load it for development

1. `node tools/build.mjs`
2. Open UXP Developer Tool → **Add Plugin** → select this folder's `manifest.json`.
3. Click **Load**. The panel appears in Photoshop under **Plugins > Displacement Maps**.
4. **Package** in UDT produces a `.ccx` for normal installation.

If the panel renders but nothing responds, that's the signature failure described
under *Why there's a build step* below — rebuild first.

## Use

1. Open **`assets/items/<id>/base.png`** in Photoshop. That file is the product
   photo at exactly canvas size and carries no artwork, which satisfies the
   blank-source requirement below for free.
2. **Material** — pick what the surface is made of. This sets every parameter.
3. **Mockup Forge item** — choose that same `assets/items/<id>/` directory. The
   panel reads its `item.json` and shows the item name, canvas size and surfaces.
   Remembered across sessions; Photoshop asks for file access the first time.
4. **Surface** — which surface these maps belong to. The list comes from
   `item.json`, so the filenames can't be mistyped into names the renderer will
   never look for.
5. **Generate Maps.**

*Advanced parameters* is collapsed by default and only matters when a result
looks wrong; each field explains itself, and **Reset to preset defaults** undoes
any fiddling.

For surface `chest` on a 1456×816 item you get:

```
displace-chest.png    728×408    RG vector field, 128 = no displacement
shadow-chest.png     1456×816    multiply map, white = unshaded
highlight-chest.png  1456×816    screen map, black = no highlight
item.json                        patched in place
item.json.bak                    your original, untouched
```

## The important limitation

**Bake from blank mockups.** The high-pass stage removes broad lighting falloff
and vignetting — measured at 22× reduction on a full-width gradient — but it is a
*low*-frequency subtraction. Printed artwork already in the photo is smaller and
sharper than the cutoff, so it survives and gets baked in as geometry that isn't
there. No radius setting fixes this: logos and fabric folds occupy overlapping
spatial scales, so any radius aggressive enough to erase a print also erases the
folds you actually want. `test/ops.test.mjs` asserts this behavior deliberately.

If you must work from a printed photo, mask the print out in Photoshop and
content-aware fill it before baking.

## The renderer contract

This is the part that will bite you in six months, so it's written down. Every
rule below was read out of the Mockup Forge source, and each one fails silently
if broken.

| Concern | Rule | Source |
|---|---|---|
| Displacement decode | `dx = ((R-128)/127)*scale`, `dy = ((G-128)/127)*scale` | `render/warp.ts:501-503` |
| Displacement sampling | normalized against **canvas**, so map size is free | `render/warp.ts:466` |
| `warp.scale` | max offset in **canvas pixels**, range 0–512 | `packages/shared/src/item.ts:89` |
| Multiply (shadow) | `factor = 1-(1-shade)*opacity` → **white neutral, black dark** | `render/compositor.ts:131-139` |
| Screen (highlight) | `amount = opacity*light` → **black neutral, white bright** | `render/compositor.ts:141-150` |
| Mask/shadow/highlight size | indexed by canvas coordinate — **must be exactly canvas W×H** | `compositor.ts:127-143` |
| Lighting scope | applied to the **artwork only**, never the base photo | `compositor.ts` header |
| Preview scale | the renderer halves displacement itself — do not pre-compensate | `render/pipeline.ts:473` |

The two polarities are opposite and easy to invert: a shadow map is mostly white,
a highlight map is mostly black.

`item.json` patching promotes the surface's existing warp to a displacement warp.
That is lossless rather than a guess: `WarpSchema`'s `homography` and `mesh`
variants are structurally identical to `GeometrySchema`'s, so the existing warp
object *is* a valid `geometry` and gets nested verbatim. Authored corners and
mesh points are never re-derived. Nothing else in the file is touched, and the
original is kept as `item.json.bak`.

Masks are deliberately **not** generated: `tools/author-item.ts` derives them from
the warp geometry "so they cannot disagree with the warp", and a
luminance-derived mask would reintroduce exactly that disagreement.

## How it works

All image math runs in JavaScript against raw pixels via the UXP Imaging API,
not as a stack of `batchPlay` filter calls. One pixel read feeds all three maps,
and output is byte-identical across machines and Photoshop versions.

```
readComposite (cap at 2048 working edge, force RGB)
  -> luminance          sRGB -> linear -> 0.2126/0.7152/0.0722
  -> highPassWithLow    splits geometry from lighting, keeping BOTH halves
  -> normalize          percentile-clipped, symmetric when high-passed
  -> blur               final smoothing -> the height field
       |-> sobel -> vectorDisplacement  -> displace-<sid>.png   (half canvas)
       |-> aoMap ---------+
       |                  +-> shadowMap -> shadow-<sid>.png     (exact canvas)
       |-> low -----------+
       -> highlightMap                  -> highlight-<sid>.png  (exact canvas)
  -> patch item.json
```

The one non-obvious step is `highPassWithLow`. The high pass subtracts a blurred
copy of the luminance to strip broad lighting out of the height field — and that
subtracted buffer is not waste, it *is* the real lighting across the surface, so
it becomes the primary input to the shadow map. Returning it from the same call
avoids running an expensive large-radius blur twice and guarantees the shadow map
is built from precisely what the height field had removed.

Displacement direction comes from the height gradient (`ops/sobel.js`, shared with
the normal map so the two cannot drift apart). A single gain derived from the
gradient *magnitude* percentile scales both axes, because normalizing X and Y
independently would rotate every offset vector rather than just scaling it.

Output sizes are enforced on write: `writeMap` resamples through Photoshop's own
`imageSize` so shadow and highlight land on the item's exact canvas and
displacement on half of it.

Every map is written as an RGB document even when grayscale; replicating the
value across R/G/B costs a slightly bigger PNG and avoids color-mode juggling
that reliably produces garbage.

Preset radii are authored at a 2048px reference edge and scaled by
`max(width,height) / 2048`, so a preset behaves the same on any input size.
`ops/blur.js` — three passes of a separable box blur, O(n) per pass at any radius
— is the shared blur for all three of high-pass, smoothing, and AO.

Every map is written as an RGB document even when grayscale; replicating the
value across R/G/B costs a slightly bigger PNG and avoids color-mode juggling
that reliably produces garbage.

## Presets

Measured frequency response of the high pass (fraction of a sinusoid surviving,
at the 2048 reference edge) — regenerate with `node test/probe-radius.mjs`:

| wavelength → | 8 | 32 | 128 | 384 | 768 | 2048 |
|---|---|---|---|---|---|---|
| radius 32  | 1.00 | 1.00 | 0.75 | 0.13 | 0.03 | 0.00 |
| radius 64  | 1.00 | 1.00 | 1.00 | 0.44 | 0.13 | 0.02 |
| radius 128 | 1.00 | 1.00 | 1.00 | 0.93 | 0.44 | 0.07 |
| radius 256 | 1.00 | 1.00 | 1.00 | 1.00 | 0.93 | 0.23 |

The 50% cutoff sits at a wavelength of roughly **6× the radius**. Against real
feature scales at 2048px — weave 4–12px, creases 30–120px, garment folds
200–600px, lighting falloff 1000–2048px:

| preset | highPass | smooth | aoRadius / str | dispScalePx | shadow str / gamma | highlight str / thresh |
|---|---|---|---|---|---|---|
| `fabric`  | 128 | 3 | 24 / 1.2 | 12 | 0.85 / 1.15 | 0.35 / 0.93 |
| `paper`   | 192 | 2 | 16 / 0.8 | 6  | 0.70 / 1.00 | 0.30 / 0.94 |
| `screen`  | 0 (keeps curvature) | 6 | 0 (no AO) | 3 | 0.55 / 0.90 | 0.55 / 0.88 |
| `signage` | 64  | 1 | 12 / 1.5 | 8  | 0.90 / 1.25 | 0.25 / 0.95 |
| `vehicle` | 192 | 2 | 20 / 1.0 | 5  | 0.75 / 1.05 | 0.60 / 0.90 |

Radii at or below 64 erase garment folds, which are most of the signal you want
on cloth — that's why `fabric` is 128 rather than something tighter.
`vehicle` is tuned for `van-sprinter-01` and its kind. High pass 192 keeps the
broad curve of a body panel — artwork genuinely has to follow that — along with
seams and wheel arches, while still dropping overall lighting; anything lower
flattens the panel into a decal. Displacement scale is deliberately the smallest
of any preset, because panel gaps are near-vertical steps and a large scale tears
graphics apart at every door seam instead of bending them over it. Glossy paint
gets the strongest highlights at the tightest threshold, so the map stays black
except on genuine reflections.

`displacementScalePx` becomes `warp.scale` in `item.json`. As an anchor,
`tshirt-marina-01` ships `scale: 11` at canvas width 1456, so the `fabric`
default of 12 is in the right territory — but these and the lighting values are
starting points, not measurements. Tune them against a real render and fold the
results back into `src/presets.js`.

## Why there's a build step

The panel's worst failure mode is silent. If the script fails to load or throws
while wiring up, UXP **still renders the HTML** — so you get a normal-looking
panel with unpopulated fields and dead buttons, and no error anywhere obvious.
It is indistinguishable from a working panel until you click something.

Two things caused exactly that here, both now designed out:

1. `require()` does not exist inside UXP ES modules — it's only injected into
   *classic* scripts. One `require("photoshop")` in a module throws at
   evaluation and takes every event listener in the file with it.
2. UXP's ES-module support generally, especially bare specifiers like
   `import photoshop from "photoshop"`, is not something to bet a panel on.

So `tools/build.mjs` flattens `src/` into a single **classic** script,
`dist/panel.js`, which uses `require()` and no module syntax at all — the path
Adobe's own samples take. Sources stay as ES modules purely so the tests can
import the pure math in Node.

Flattening puts everything in one scope, which is safe only while every
top-level name across `src/` is unique. The build checks this and fails loudly
with the conflicting file names if it ever stops being true. It also refuses to
emit a bundle containing surviving `import`/`export` syntax.

Two more guards, since a silent panel is so hard to diagnose:

- `index.html` installs `error` / `unhandledrejection` handlers in a classic
  script *before* the bundle, painting failures into the status line. A script
  that fails to evaluate cannot report its own failure.
- `<details>`/`<summary>` and `<code>` are avoided — UXP implements only a
  subset of HTML and those aren't dependable. The advanced disclosure is a
  hand-rolled button plus a `display: none` toggle.

## UXP gotchas that cost real time

Each of these produced a panel that looked fine and did nothing.

- **`sp-picker.value` is getter-only.** Assigning to it throws *"Cannot set
  property value of [object Object] which has only a getter"*, which aborts the
  handler mid-run — so an unrelated control appears broken. Express selection
  with the `selected` attribute on `sp-menu-item`, read `.value` on `change`, and
  track the choice yourself. `test/panel.smoke.mjs` defines `value` as a
  getter-only property on both pickers precisely so this can't come back.
- **A picker with zero options is indistinguishable from a dead one.** Always
  leave at least one placeholder item in.
- **`require()` does not exist in ES modules** — see *Why there's a build step*.
- **`<details>`, `<summary>` and `<code>` are not dependable**; the disclosure is
  hand-rolled.
- **The status line must be at the top, and height-bounded.** It used to sit
  below four steps of content, off the bottom of a docked panel, so every error
  message — including the ones added to diagnose these bugs — was invisible.
  Moving it up then created the opposite problem: an unbounded box at the top
  pushes every control below it out of frame when a message runs long. It now has
  `max-height: 25vh` and scrolls internally.
- **Keep `minimumSize` small.** A large one stops the user shrinking the panel,
  and when the dock is shorter than the minimum the content clips rather than
  scrolling. The floor is 240×240 and `body` owns the scrolling, so the layout
  survives any height. `test/panel.smoke.mjs` asserts all of this — CSS
  regressions are otherwise silent.

The panel prints a **build id** (a hash of `src/`, `index.html` and
`manifest.json`). If the id shown doesn't match what `node tools/build.mjs`
prints, Photoshop is running stale code — unload and load again rather than
Reload.

## Icons

Photoshop refuses to load a plugin whose manifest has an empty `icons` list
("Expected atleast a single entry in the icons list"), so the panel icon is a
hard requirement, not a nicety. Rather than commit opaque binaries, they're
generated:

```bash
node tools/make-icons.mjs      # writes icons/{dark,light}{,@2x}.png
node tools/preview-icon.mjs    # 23px icon at 12x on panel grey, to check the glyph
```

`tools/make-icons.mjs` contains a small standalone PNG encoder (Node's `zlib` is
its only dependency). Two ink variants are emitted because a white icon is
invisible on Photoshop's light panel themes; the manifest maps `dark.png` to the
`darkest`/`dark` themes and `light.png` to the rest. `scale: [1, 2]` makes UXP
pick up the `@2x` files automatically.

## Tests

```bash
node tools/build.mjs && node test/panel.smoke.mjs   # the panel, end to end
node test/ops.test.mjs                              # the image math
```

`test/panel.smoke.mjs` runs the real `dist/panel.js` against a fake DOM built
from the real `index.html` ids and a stubbed Photoshop host, then drives it:
changes the preset, toggles the disclosure, clicks the folder button, clicks
Generate. It asserts listeners attached, fields populated, the surface picker built itself
from `item.json`, the three maps written under the exact Mockup Forge filenames,
**the size contract** (shadow and highlight at exact canvas, displacement at
half), the `item.json` patch (warp promoted, geometry preserved verbatim, other
surfaces byte-identical, `.bak` written), that re-baking is idempotent rather
than nesting geometry inside itself, and that a missing or wrong-aspect document
surfaces a visible error. This is the only automated defence against the
silent-dead-panel failure described above.

`test/ops.test.mjs` is 47 assertions over the pure image math — no Photoshop needed, since every module
under `src/ops/` is dependency-free ESM. Covers blur DC gain and effective sigma,
luminance linearization, the high-pass frequency behavior (including the
print-survives limitation), symmetric-vs-asymmetric normalization and its
degenerate cases, normal-map conventions and unit length, AO valley response, and
end-to-end determinism.

### Verifying against the real catalog

The above runs headless against stubs. To confirm the maps are actually good,
bake into a real item and render it:

```bash
cd ../mockupplugin
npx tsx tools/render-sample.ts && npm test --workspace @mf/api
```

`assets/golden/<id>.png` will differ — that is the point of the change. Inspect
the `.diff.png`, confirm the shading now follows the real folds, then re-baseline
with `MF_UPDATE_GOLDEN=1 npm test --workspace @mf/api`.

**Check the displacement sign before re-baselining.** Which direction is correct
cannot be settled analytically — it is whichever makes artwork sink into folds
rather than climb out of them. Render a sample, look at it, and if it is inverted
toggle **Flip Y** in the panel and re-bake.

### Host-dependent paths

`src/imaging.js`, `src/export.js`, and `src/pipeline.js` require the Photoshop
host and are verified by hand:

1. Bake a fabric mockup; confirm `_disp.png` is mid-grey with visible fold
   structure, `_normal.png` is dominantly flat blue `(128,128,255)`, `_ao.png`
   darkens only in fold valleys.
2. Bake with the `screen` preset on a laptop mockup; the height map should be a
   smooth curvature gradient and no `_ao.png` should be written.
3. Bake twice into different folders and compare bytes — identical. Any drift
   means a nondeterministic filter call snuck in where JS math belongs.
4. Open a CMYK document and bake; expect a clear "convert to RGB" error rather
   than garbage output.

## Known risk: these maps are not durable

`mockupplugin/.gitignore` ignores `assets/items/*/*.png`, and the Dockerfile runs
`apps/api/src/seed/generate.ts` on build. Maps baked here are therefore untracked
by git and are **not** reproduced by a clean image build — a deploy would ship
`item.json` files pointing at PNGs that don't exist.

This predates the baker: the seven photographic items are already in exactly that
position, since `tools/author-*.ts` is never run by the Dockerfile either. But it
does mean re-running the seed, or building a fresh image, discards this work.
Commit the PNGs or extend the build before relying on them.
