# Dezzy Magazine — Figma Community submission

Copy each section into the matching field of the Figma "Publish plugin" form.

---

## Plugin name

**Dezzy Magazine**

## Tagline (one line)

Turn any layout into a data-driven property magazine — tag once, then fill text and photos in seconds.

## Category

Productivity / Workflow (secondary: Assets, Content)

## Tags

`real estate`, `magazine`, `automation`, `template`, `data merge`, `photos`, `bulk`, `content`, `catalog`, `brochure`

---

## Description

**Build a single-property magazine the fast way.** Dezzy Magazine turns your existing InDesign-style layout into a reusable, data-driven template. Tag each text layer and photo container once, enter the listing details, drop in the shoot, and let the plugin place everything — headlines, captions, prices, and dozens of photos — exactly where it belongs.

Designed for luxury real estate teams and studios producing property magazines, brochures, and listing books at volume, but it works for any repeatable, photo-heavy layout: lookbooks, catalogs, event programs, portfolios.

### What it does

**🏷️ Tag your template once**
Mark text layers as fields (price, tagline, description, agent, room captions…) and photo containers as image slots. Name your layers sensibly — `Kitchen`, `Master Bath`, `#price` — and the one-click scan tags them automatically. Tags live in the file and travel with every duplicate, so a template is set up once and reused forever.

**✍️ Fill content from a form (or a CSV)**
Enter listing data in a clean, grouped form that autosaves into the file. Prefer a spreadsheet? Download a fill-in CSV, complete it, and import — great for handing data entry to someone else. Partial "template" tagging lets you leave boilerplate untouched while swapping only the dynamic words inside a text layer.

**📸 A real photo pipeline, not a fill hack**
Upload 50–100 photos at once. Each is processed one at a time to keep memory flat, and images are only downscaled if they exceed Figma's 4096px ceiling — photos that already fit are stored untouched, so print quality is preserved. Placement uses cover-fit cropping (never stretched), and you can nudge the crop left / center / right per container.

**🎯 Smart auto-assign by category**
Name photos after rooms and the plugin routes them: `kitchen-2.jpg` fills a kitchen slot, `master-bath.jpg` a master-bath slot, and so on. Full-page slots progress through the home in a natural order (entry → living → kitchen → … → exterior). Interior/exterior "pool" slots draw from any matching room. **Preview** and **Mini preview** slots build overview spreads from the whole shoot — Preview leads with exterior, kitchen, living, and master; Mini preview shows one representative image per room. The agent's headshot is detected by name and reserved for the agent slot automatically.

**↔️ Spreads that line up across the gutter**
Couple two containers on facing pages and a single photo tiles seamlessly across both — the crop windows are computed so the image reads as one continuous shot spanning two artboards.

**✅ Validate, apply, done**
A pre-flight check flags empty fields, unassigned slots, and mismatched spreads before you commit. Apply text, photos, or everything in one pass, with progress and cancel. Unused slots turn magenta so nothing ships half-finished. A save-state export bundles your content, photo assignments, layer tags, and the images themselves into a single zip for backup or hand-off.

### Why teams like it

- **Private by design.** No network access, no accounts, no uploads to a server — everything runs locally in your file. (The plugin declares zero allowed domains.)
- **Print-first.** Built around real photo resolution and cover-fit cropping, not screen mockups.
- **Set up once, reuse forever.** Tags and entered data persist in the file and survive duplication.
- **Scales to real jobs.** Tested against 100+ page layouts and full property shoots.

### How to use it

1. Open the plugin on your template page.
2. **Tag** tab — scan layer names or tag manually; auto-number the photo slots.
3. **Content** tab — enter listing details (or import a CSV).
4. **Photos** tab — upload the shoot and auto-assign, or place photos by hand.
5. **Apply** tab — validate, then apply text + photos.

---

## What's new (for the first release / changelog)

**v1.0**
- Layer tagging with one-click name scan and auto-numbering
- Content form with autosave + CSV import/export
- Offline photo pipeline (100+ images) with print-quality preservation
- Category auto-assign, full-page progression, interior/exterior pools
- Preview and Mini preview overview spreads
- Agent-headshot detection by name
- Coupled cross-gutter spreads with seamless cropping
- Validation pre-flight, apply/cancel with progress
- Save-state export/import (content + assignments + tags + images)
- Fully local — no network access

---

## Support / contact

*(Add your support email or a link to your GitHub issues / contact page here before publishing.)*

---

## Screenshot & cover suggestions

Figma requires a cover image (1920×960) and allows several screenshots. Recommended shots:

1. **Cover** — a finished magazine spread beside the plugin panel, with a headline like "Tag once. Fill in seconds."
2. Tag tab showing the tagged layer index.
3. Content tab with the grouped fields filled in.
4. Photos tab mid auto-assign (gallery + slot list).
5. A before/after: empty template → fully populated spread.
6. A coupled full-page spread showing one photo across the gutter.

Keep the panel screenshots at the plugin's native 380px width for crispness, composited onto a neutral canvas.
