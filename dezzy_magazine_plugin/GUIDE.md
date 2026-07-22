# Dezzy Magazine — User Guide

A start-to-finish walkthrough for building a single-property magazine. This is the
"do this, then that" companion to the [README](README.md) (which is the full
reference). If you just want to make a magazine, read this.

---

## What the plugin does

You start from a **template file** — a multi-page magazine layout with placeholder
text and empty photo boxes. The plugin lets you:

1. **Tag** each placeholder once (this text box is the *price*, that image box is a
   *kitchen* photo).
2. **Type** the listing details into a form and **upload** the photo shoot.
3. **Apply** — the plugin pours the text and photos into every tagged spot in one pass.

Because tags live *on the layers*, they survive when you duplicate the template. So
you tag the template **once**, then every future listing is: duplicate → fill form →
upload photos → Apply.

The five tabs run left to right in roughly the order you use them:
**Tag · Content · Photos · Apply · Bulk**.

---

## First-time setup (developer / one-time)

If the plugin isn't installed in Figma yet:

```sh
npm install
npm run build
```

Then in the **Figma desktop app**: open any file →
**Plugins → Development → Import plugin from manifest…** → pick `manifest.json` in
this folder. Run it from **Plugins → Development → Dezzy Magazine**.

(If you're editing the code, run `npm run watch` and just reopen the plugin after
each change.)

---

## Part A — Tag the template (do this once per template)

Open the plugin on your **Magazine/Template** page. Everything here happens on the
**Tag** and **Bulk** tabs.

The fast path is to let the bulk tools do the heavy lifting, then fix up by hand.

### 1. Auto-number the photo boxes

Go to **Bulk → Auto-number photo slots**. This walks your page frames (named
`Cover_Outside`, `Cover_Inside`, `Insert Page 1`, `Insert Page 2`, …) in reading
order, finds the placeholder rectangles, and tags them `photo.slot.001`,
`photo.slot.002`, and so on. Two touching boxes of the same size across facing pages
are detected as a **spread** and share one slot number automatically.

### 2. Scan layer names into tags

Go to **Bulk → Scan layer names → tags**. Any layer named like a field gets tagged
automatically:

- A text layer named `price`, `street`, `description`, `feature1`, `phone`,
  `caption.1.body`, etc. → the matching text field.
- Any layer named `#something` → a tag for `something` (text layer → text tag,
  image box → image tag).

This is the reward for naming your template layers sensibly. Anything it doesn't
recognize you'll tag by hand next.

### 3. Categorize the photo boxes

Generic `photo.slot.NNN` tags work, but the magic is **category** slots — so a
"kitchen" photo automatically lands in a kitchen box. Two ways:

- **Bulk → Scan layer names**: a box named `Master Bath 2` or `#kitchen` becomes the
  next numbered slot in that category (`photo.masterbath.02`, `photo.kitchen.01`, …).
- **By hand** on the **Tag** tab: select a box, and in the **Photos (image)** picker
  choose e.g. "Kitchen slot (next #)". Select several boxes at once and each gets its
  own consecutive number in reading order.

Categories the plugin knows: entry/porch, kitchen, dining, living, master bedroom,
master bath, secondary bedroom, secondary bath, office, amenities, garage, outdoor,
exterior, floor plan, and general interior. (Full keyword list in
`src/shared/categories.ts`.)

### 4. Tag anything left over, by hand

On the **Tag** tab, select a layer (or several) on the canvas, then use whichever
picker fits:

- **Content (text)** — for text: Property / Features / Agent / Captions, or a custom
  key.
- **Photos (image)** — for image boxes: named slots (cover, hero, agent headshot),
  category slots, full-page, or a custom slot key.

Each picker has its own **Assign** button so the tag type is never ambiguous.

**Special photo slots worth knowing:**

- **Named slots** (cover, hero, agent headshot) — assigned manually, never
  auto-filled by filename.
- **Full page** (`photo.fullpage.NN`) — big full-bleed images. Auto-assign feeds
  these *every* photo in room-by-room order rather than matching filenames. Variants
  **Full page (left)** / **(right)** exist for spreads.
- **Locks** (see below) — tell the plugin to leave a layer alone.

### 5. Coupling a spread (one image across two pages)

If a single image bleeds across two facing page frames (two separate boxes), select
**both** boxes and click **Couple 2 as spread ⇔** on the Tag tab. They share one
slot (take the same photo) and pin to opposite edges, so the image reads as one
continuous picture with no duplicated or missing pixels down the gutter.

### 6. Crop alignment

Any image tag can pin its crop to an edge instead of centering. Select the box(es)
and use the **Align** toggle (**◄ Left · Center · Right ►**) under "Spread &
alignment."

### 7. Locking layers you never want touched

In the Tag tab's field dropdown, under **Locks**:

- **Locked — keep current image** (`photo.locked`) — permanent artwork/branding the
  plugin must never overwrite.
- **Locked — keep current text** (`text.locked`) — boilerplate, disclaimers, fixed
  headings.

Locked layers are skipped everywhere and reported as "N locked" rather than flagged
as empty.

### 8. Sanity-check your tags

On the **Tag** tab, the **Tag index** card lists every field and how many layers
carry it. **Click any row** to select and zoom to those layers on the canvas — the
quickest way to confirm you tagged the right box.

Use **Rebuild index** to renumber the category slots by layer stacking order (bottom
layer = 01, going up), so slot numbers follow the page rather than tagging order. It
confirms before changing anything and never removes tags.

> ✅ **Template done.** Save it. From now on, each new listing is a duplicate of this
> file — all tags come along for free.

---

## Part B — Build a listing (repeat for every property)

**Duplicate the template file**, open the plugin, and work through Content → Photos →
Apply.

### 1. Enter the content

On the **Content** tab, fill in the form: Property, Features, Agent, Captions, plus
any custom fields. Values **autosave** into the file as you type, so they persist and
travel with the file.

Each field shows how many layers are tagged with it. **"untagged"** means typing a
value there won't land anywhere — a hint you missed a tag back in Part A.

**Shortcut — CSV:** at the top of the Content tab you can **Download CSV** (a
`field,value` file that doubles as a fill-in template for coordinators) and **Import
CSV** to load values in bulk. See `sample-content.csv` for the exact format.

### 2. Upload the photos

On the **Photos** tab, **drag-and-drop** or use the file picker — any number of
photos at once. Full-resolution print quality is preserved (images are only
downscaled if they exceed Figma's 4096px hard limit). Upload as large a batch as you
like; memory stays low because photos are processed one at a time.

### 3. Assign photos to slots

Still on the **Photos** tab, each tagged image slot appears with a dropdown to pick a
photo. But first try:

- **Auto-assign** — category-aware. `master-bath-2.jpg` → a master-bath slot,
  `Kitchen2.jpg` → a kitchen slot. Photos whose category is full or unrecognized
  (`IMG_9928.jpg`) flow into generic slots in filename order. Full-page slots get
  filled room-by-room. Named slots (cover/hero/agent) stay manual.

Then fix up any dropdowns by hand. Name your photo files sensibly
(`kitchen-1.jpg`, `master-bath-2.jpg`, `exterior-drone.jpg`) and Auto-assign does
almost everything.

> 💡 Slots left unassigned get filled **solid magenta** at Apply, so empty
> placeholders are impossible to miss.

### 4. Preview before you commit — Dry run

On the **Apply** tab, click **Dry run**. Instantly (no canvas changes) you see: how
many text layers will update, which tagged fields are still empty, and which values
you entered have no tagged layer. Click any row to select those layers.

For a deeper check, **Check magazine** rebuilds the index from scratch and reports
text ready vs empty, photo slots assigned vs missing, values with nowhere to go, and
**spread drift** (a coupled spread whose two halves no longer match in size).

### 5. Apply

On the **Apply** tab:

- **Apply all text** (or per-group: Property / Agent / …) — pours text into every
  tagged text layer.
- **Apply photos** — cover-fits each assigned photo into its box; spread halves share
  one seamless image; unassigned slots go magenta.

Each apply is a **single Undo step**, shows a progress bar, and can be **cancelled**
mid-run (one Undo reverts a partial run). Missing fonts are skipped and reported,
never fatal.

That's the whole loop. Export your pages from Figma as usual.

---

## Saving & restoring a whole listing

On the **Bulk** tab:

- **Download save state (.zip)** — bundles all field values (`data.csv`), photo
  assignments (`assignments.csv`), and every photo (`images/`) into one archive. Your
  complete listing, portable.
- **Upload save state (.zip)** — restores content, photos, and assignments from such
  an archive (after a confirmation). Nothing changes on the canvas until you Apply.

Great for handing a listing between people or archiving finished issues.

---

## Handy fix-up tools (Bulk tab)

- **Retag containers from images** — already placed photos but the tags are wrong?
  This reads the image in each box, identifies it by filename, and re-tags the box to
  the right category. Shows a preview and only changes tags after you confirm.
- **Clear all tags** — strips every tag from the page (keeps your content and photos).
  Use when you want to re-tag from scratch.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| A value I typed didn't show up | The field is **untagged** — check the count on the Content tab, then tag the layer on the Tag tab. |
| A box came out **magenta** | Its slot was **unassigned** — pick a photo on the Photos tab and re-apply. |
| Some text didn't apply | Layer is **text-locked**, or its **font is missing** (check the apply report). |
| A spread looks misaligned or has a seam | **Spread drift** — the two halves changed size. Run **Check magazine**, then **Align spread fills** (Tag tab). |
| A thumbnail is blank / "missing from Figma's store" | Photo was lost before the **image vault** existed — re-upload the same file and it re-links automatically (same content hash). |
| Photos gallery looks empty on reopen | Normal — thumbnails rebuild automatically as the plugin pulls bytes back from Figma. |
| Don't delete the **"🗄 Dezzy image vault"** rectangle | It pins your uploaded photos' bytes in the file. Leave it be. |

---

## The 30-second version

**Once per template:** Bulk → Auto-number → Scan layer names → hand-tag the rest →
check the Tag index.

**Per listing:** Duplicate template → Content form (or Import CSV) → Photos upload →
Auto-assign → Apply tab: Dry run → Apply all text → Apply photos → export.
