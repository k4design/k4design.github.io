# Dezzy Magazine

Figma plugin that automates luxury single-property magazines by tagging template
layers (text fields and photo slots), then filling them from entered data and
uploaded photos.

**Built so far: phase 1 (tagging), phase 2 (content form & text fill),
phase 3 (photo pipeline + categories), phase 4 (validation, cancel,
instance propagation).** Remaining polish ideas: CSV/JSON import, saved
listing profiles, DPI checklist.

## Build

```sh
npm install
npm run build        # one-shot build -> dist/
npm run watch        # rebuild on save
npm run typecheck    # tsc over sandbox + UI code
```

## Load into Figma

Figma desktop app → any design file → Plugins → Development →
**Import plugin from manifest…** → pick `manifest.json` in this folder.
Re-run the plugin after rebuilds (or keep `npm run watch` running — Figma
reloads dist output when the plugin is reopened).

## Using the plugin

Open the plugin on the **Magazine/Template** page. Five tabs: Tag, Content,
Photos, Apply, and Bulk (bulk tagging, retag-from-images, save state).

### Content tab (phase 2)

Schema-driven form (Property / Features / Agent / Captions, plus any custom
text fields found in the index). Values autosave (debounced) into the Figma
file's root plugin data, so they persist across sessions and travel with
duplicated files. Each field shows how many layers are tagged with it —
"untagged" means entering a value won't land anywhere yet.

### Apply tab (phase 2)

- **Dry run** (computed instantly from the cached index + stored content, no
  canvas traversal): how many text layers will update, which tagged fields are
  still empty, which entered values have no tagged layer. Click a row to
  select those layers on canvas.
- **Apply all text** or per-group (Property / Agent / …). The engine dedupes
  and preloads every font once, writes values with progress, yields every 10
  nodes so Figma stays responsive, skips layers with missing fonts (reported,
  never fatal), and self-heals dead node ids out of the index. One apply is a
  single native Undo step.

### Save state (Bulk tab)

- **Download save state (.zip)** — exports `data.csv` (every text field +
  value, safely quoted for multiline descriptions), `assignments.csv`
  (slot → photo filename), and `images/` containing every photo placed on the
  page plus any library photos not yet placed (so assignments always restore).
  Image bytes are pulled back out of Figma one at a time with a progress bar.
- **Upload save state (.zip)** — after a confirmation stating what it'll do,
  replaces entered content, feeds the images through the normal upload
  pipeline (dedupe included), and restores slot assignments by filename once
  every image is in. Nothing changes on the canvas until you Apply.

### Content CSV (Content tab, top)

- **Download CSV** — saves the current field values as a `field,value` CSV;
  doubles as a fill-in template for coordinators.
- **Import CSV** — updates just the field values from such a CSV (merge:
  listed fields replaced, others kept), with confirmation.

### Photos tab (phase 3)

- **Upload**: drag-and-drop or file picker, any number of photos. Each file is
  decoded in the UI iframe, downscaled **only** if it exceeds Figma's hard
  4096px limit (JPEG q90 — print quality is preserved, images that already fit
  are passed through untouched; WebP/AVIF are re-encoded since Figma can't
  ingest them). Uploads are serialized — one photo's bytes cross to the
  sandbox at a time, so peak memory is ~one image regardless of batch size.
  Figma stores the pixels via `createImage`; the plugin keeps only
  `{hash, name, dimensions}`.
- **Slots**: every tagged image field (named slots, then category slots, then
  `photo.slot.NNN`), each with a dropdown to pick a photo.
  **Auto-assign** is category-aware: a photo named `master-bath-2.jpg` goes to
  a `photo.masterbath.NN` slot, `Kitchen2.jpg` to `photo.kitchen.NN`, etc.;
  photos whose category is full (or unrecognized, like `IMG_9928.jpg`) flow
  into generic numbered slots in natural filename order. Named slots
  (cover/hero/agent) are always assigned manually.

### Locking layers (keep current content)

Two markers in the Tag tab's field dropdown (under **Locks**) tell the plugin
to leave a layer exactly as it is:

- **Locked — keep current image** (`photo.locked`) — for a photo container the
  plugin must never touch (permanent artwork, branding, a fixed shot). Skipped
  by Apply photos, left alone by "Retag containers from images", ignored by
  Auto-number, not offered as an assignable slot (a `🔒 N locked` line on the
  Photos tab shows the count and selects them on click).
- **Locked — keep current text** (`text.locked`) — for a text layer the plugin
  must never overwrite (boilerplate, a disclaimer, a fixed heading). Skipped by
  Apply text / Apply everything, omitted from the dry-run, and hidden from the
  Content form (a `🔒 N locked` line on the Content tab shows the count).

Both are shared markers — apply to as many layers as you like; clicking one in
the Tag index (or the 🔒 line) selects them all. The magazine check reports
locked layers as "N locked" rather than flagging them as empty/unassigned.

### Full-page images

Tag full-page photo containers with **Full page** (`photo.fullpage.NN`, in the
Photos assign dropdown or by naming a layer `full page` / `#fullpage`). Unlike
other slots, full pages aren't filled by matching a photo's own filename —
**Auto-assign** consumes *every* photo in category progression, one per slot in
sequence, in this order:

> front porch → living room → kitchen → dining → master bed → master bath →
> second bed → second bath → office → amenities → garage → outdoor living →
> exterior

(photos within a category stay in filename order; categories outside the list —
floor plans, general interiors — trail at the end). So `photo.fullpage.01` gets
the first front-porch shot, `.02` the next in progression, and so on until the
shoot is placed. Full-page assignment runs before the per-category/generic
passes; the progression never repeats a photo **across full-page slots**
(photos already in category slots don't starve it).

**Full page (left)** (`photo.fullpageleft.NN`) and **Full page (right)**
(`photo.fullpageright.NN`) draw from the **same progression pool** as centered
full pages — slots are ordered by number, then left → center → right — and
imply a left/right crop alignment at apply (the per-tag Align toggle overrides).
For a photo shared across both halves of a spread, use **Couple 2 as spread**
so both carry one field and consume a single photo.

### Crop alignment & spread coupling (Tag tab)

Any image tag can pin its cover-fit crop to a border instead of centering.
Select tagged image container(s) and use the **Align** toggle — **◄ Left**,
**Center**, **Right ►** — under "Spread & alignment". Left/right show the
image's left/right portion (vertical stays centered). Stored per tag
(`options.align`), applied in CROP mode so you can still nudge by hand.

**Coupling a spread across two artboards.** Magazine spreads are often split
into two touching page frames (so each exports as its own page) with one image
carrying across. Select the **two** containers and click **Couple 2 as spread
⇔**: they're given a single shared field (so they take the *same* photo — once
against every assign/progression pass) and pinned to opposite borders (left
container ◄ Left, right container Right ►). The result reads as one continuous
image bleeding across the spread, and each half still exports on its own page.
Adjust either half's alignment afterward with the Align toggle.

**Perfect continuity — union fit.** For coupled spreads, Apply photos doesn't
crop each half independently: it cover-fits the image to the **combined
bounding box** of both containers (their absolute canvas positions, across
artboards) and gives each half the exact crop window for its portion — the two
fills tile with zero duplicated or missing pixels, and any physical gutter gap
between artboards is skipped in the image too. **Align spread fills** (Tag
tab) reruns this on demand for the selected spread — e.g. after a container
was moved/resized, or to snap the right half to the left half's existing image
without reapplying. One Undo step.

### Photo categories

Recognized in both **layer names** (tagging side) and **filenames**
(assignment side), first match wins. Bed and bath are **separate** tags:
`masterbath` (master/primary/principal/owner + bath/bathroom/ensuite),
`secondarybath` (any other bath — bathroom/bath/ensuite/guest bath/powder/wc…),
`master` (master/primary/principal/owner bedroom), `secondary` (guest/bedroom/
bed/bunk/spare/nursery), plus `entry` (porch/entryway/foyer), `kitchen`,
`dining`, `living`, `office` (office/study/den), `amenities`
(gym/theater/wine/bar/laundry/…), `garage`, `outdoor` (pool/patio/deck/yard/…),
`exterior` (exterior/aerial/drone/front/elevation), `floorplan`, and `interior`
(general). Because the bath tags rank above their bedroom tags, "master bath" →
`masterbath` and a plain "bathroom"/"bath" → `secondarybath`. The full keyword
list lives in `src/shared/categories.ts`.

**Interior & exterior are pools — repeats allowed.** An `interior` slot isn't
limited to photos literally named "interior" — it draws from **every** photo of
every room inside the home (entry/foyer, kitchen, dining, living, office,
amenities, master + master bath, secondary + secondary bath, plus literal
interior shots). An `exterior` slot likewise pools `exterior`, `outdoor`, and
`garage`. Unlike other slots, pool slots may **reuse** photos: a kitchen photo
can sit in `kitchen.01` *and* an interior slot. Auto-assign fills pool slots
preferring photos not yet used anywhere, then repeats through the pool
(cycling if there are more pool slots than pool photos). Specific category
slots are still filled first. Membership lists (`INTERIOR_POOL` /
`EXTERIOR_POOL`) are in `src/shared/categories.ts`.

On the tagging side: **Scan layer names** turns any fillable layer (≥80px)
whose name mentions a category — `Master Bath 2`, `#kitchen` — into the next
numbered slot in that category (`photo.master.01`, `photo.kitchen.03`, …).
The Tag tab's field dropdown also has "<Category> slot (next #)" entries that
auto-pick the next free number. Selecting **several** containers and assigning
a "next #" slot gives each its **own consecutive number** in reading order
(kitchen.03, .04, .05, …) — distinct slots, not one shared tag. To link
containers into a single spread (one photo across both), assign an **explicit**
slot (via "Custom slot…" or a specific field) to the multi-selection instead.

**Retag containers from images** (Bulk tab): after photos are placed, this reads
the image currently filling each container, identifies it by matching the fill
back to a library photo's filename, classifies that filename, and re-tags the
container to the matching category slot (photo.kitchen.01, …). Containers
sharing one image collapse to a single numbered slot (spreads stay linked);
images the library can't identify are left untouched. It shows a preview —
counts per category, how many are unmatched, how many already match — and only
changes tags after you confirm.
- **Apply photos** sets cover-fit `CROP` image fills on every assigned node.
  Spread halves share a slot, get the identical fill, and render seamlessly
  across facing pages. Progress bar, one Undo step, dead tags healed. Any image
  slot left **unassigned** is filled solid **magenta** so empty placeholders
  are obvious at a glance (the toast reports how many); assigning a photo and
  re-applying overwrites the magenta. Locked slots are never touched.
- **Library management**: hover a thumbnail for a **×** delete button, or use
  **Clear all** by the Library header to empty the whole library. Both prompt a
  confirmation first; deleting also clears any slot the photo was assigned to.
  Neither touches fills already applied to the canvas (undo in Figma to revert
  those) — they only affect the upload library and pending assignments.
- Assignments and library metadata persist in the file. Thumbnails aren't
  persisted (object URLs die with the session) but rebuild automatically on
  open: the plugin pulls each image's bytes back from Figma one at a time and
  regenerates the 160px preview, so the gallery is never blank. Re-uploading
  the same file dedupes by content hash.
- **Image vault**: Figma garbage-collects images no fill references when the
  file closes — which used to destroy uploaded-but-not-yet-applied photos
  (blank thumbnails, "missing from Figma's store" on apply). The plugin now
  maintains a tiny invisible, locked rectangle ("🗄 Dezzy image vault", far
  off-canvas) whose fills reference every library image, pinning their bytes
  in the file. It updates on every library change; don't delete it. Photos
  lost *before* the vault existed are flagged in red on open and skipped at
  apply with a clear error — re-upload the same file and everything (entry,
  assignments) re-links automatically, since the content hash is identical.

### Magazine check & safety (phase 4)

- **Check magazine** (Apply tab): rebuilds the index from scratch — including
  component→instance propagation — verifies every tagged layer still exists
  (healing dead ids), and reports: text fields ready vs empty, photo slots
  assigned vs missing (clickable chips select the layers), values with no
  tagged layer, and **spread drift** (a spread slot whose two halves are no
  longer the same size, which would break the seamless fill).
- **Cancel**: both apply engines can be cancelled mid-run from the progress
  bar; the report says how many layers were applied before stopping, and one
  Undo reverts the partial run.
- **Component instances**: a tag on a layer inside a main component is
  inherited by the matching layer of every instance on the page (instance
  sublayer ids are derived as `I<instanceId>;<childId>` and verified). Applies
  write to the instance layers as normal overrides. Instance-inherited tags
  refresh on any rebuild (scan, auto-number, Rebuild index, Check magazine).

### Tag tab (phase 1)

- **Tag part of a text box (templates)** — select a single text layer and open
  **"Tag part of this text (template)"**. Figma can't expose the on-canvas text
  highlight to a plugin, so the panel mirrors the layer's text in a field:
  highlight a span there, pick a Content field, and **Wrap selection** turns
  just that span into a `{{field}}` token, leaving the rest as literal text
  (you can also hand-edit the template). Save it and the layer is tagged as a
  template. On Apply text the layer is rendered from the template — each token
  swapped for its value, all literal text preserved — so one heading can carry
  `{{street}} | {{cityState}}, {{price}}`. Re-applies stay correct because the
  template (not the live text) is the source of truth. Assigning a plain
  Content field instead tags the **whole** box (unchanged). Template token
  usage counts toward each field's tag count on the Content tab.
- **Selection panel** — select layer(s) on canvas, then assign from one of two
  pickers: **Content (text)** for text fields (Property / Features / Agent /
  Captions / text lock, or a custom key) and **Photos (image)** for photo slots
  (named slots, category "next #" entries, image lock, or a custom slot key).
  Each picker has its own Assign button, so the tag kind is never ambiguous.
  Selecting *multiple* layers and assigning a photo slot creates a **linked
  spread slot**: one photo will fill all of them identically, which is how
  spread images that exist as two clipped copies (one per page frame) stay
  seamless.
- **Scan layer names → tags** (Bulk tab) — converts naming conventions into
  tags in one pass, idempotently:
  - any layer named `#someField` (text layers → text tag, everything else → image tag)
  - text layers named exactly like a schema field: `street`, `cityState`,
    `city`, `state`, `zip`, `price`, `tagline`, `description`, `bedrooms`,
    `bathrooms`, `sqft`, `feature1`…`feature9`, `featuresBulleted`, `name`,
    `agentTitle`, `phone`, `email`, `caption.N.title` / `caption.N.body`, …
- **Auto-number photo slots** (Bulk tab) — walks page frames named `Insert Page N`,
  `Cover_Outside`, `Cover_Inside` in reading order, finds placeholder
  rectangles (≥80×80), auto-detects spread pairs (same-size rectangles at the
  same absolute canvas position in two adjacent page frames) and tags
  everything `photo.slot.001`, `photo.slot.002`, … Spread pairs share one slot
  number. Without "renumber" it only tags new rectangles, continuing after the
  highest existing slot number. Named/manual image tags (e.g. `photo.agent`)
  are never clobbered — retag small special slots like the agent headshot
  manually if auto-numbering grabs them first.
- **Clear all tags** (Tag index card): strips every Dezzy tag from the page and
  resets the index, after a confirmation that states how many layers/fields are
  affected. Entered content and uploaded photos are kept — only the tags go, so
  you'd re-tag before applying again. Disabled when nothing is tagged.
- **Tag index** — cached map of field → node ids stored on the document root,
  so later phases never re-scan 120 pages per operation. Click a row to select
  and zoom to every node carrying that tag (dead ids self-heal out of the
  index).
- **Rebuild index** re-derives the index and **renumbers numbered image
  slots by layer order**: within each category the bottom-most layer becomes
  01, increasing up the layers panel, with no gaps — so slot numbers track the
  page's stacking rather than whatever order they were tagged in. **No tags
  are removed** — unassigned slots keep their place in the sequence. Photos
  and each tag's alignment/spread follow the renumbering. Named slots
  (cover/hero/agent), the lock marker, and text tags are untouched. Because
  rewriting tags isn't undoable, the button confirms first, showing how many
  slots will change; if the numbering is already correct it just refreshes
  silently.

## How tags are stored

`setSharedPluginData('dezzymag', 'tag', json)` on each tagged node:

```json
{ "v": 1, "kind": "text" | "image", "field": "street", "options": { "spread": true } }
```

Shared (not private) plugin data survives copy/paste and file duplication —
each new magazine is a duplicate of the template, tags included. The index
lives at `figma.root` under the same namespace, key `index`; entered listing
content lives there too under key `content`.

## Layout

```
manifest.json        dynamic-page access, no network
build.mjs            esbuild: sandbox bundle + UI inlined into dist/ui.html
src/shared/          types + field schema (used by both sides)
src/main/            plugin sandbox: tagging, index, bulk tools
src/ui/              Preact UI iframe
```
