# Community listing — copy and submission checklist

Everything the Figma publish modal asks for, ready to paste. Submission itself
happens in the **Figma desktop app**: Plugins → Manage plugins → publish a new
plugin → import from `apps/plugin/release/mockup-forge/manifest.json`
(run `npm run build:prod --workspace @mf/plugin` first).

---

## Name

Mockup Forge

## Tagline (short description)

Render your designs onto photorealistic product mockups — phones, mugs,
shirts, billboards, even video — without leaving Figma.

## Category

Design tools

## Tags

mockup, product mockup, smart object, render, device mockup, t-shirt,
packaging, presentation, video

## Description

Drop your artwork into a frame, click Render, and it comes back
photographically warped onto the product — smart-object compositing, minus
Photoshop.

**How it works**

1. Browse the mockup library and click a tile — it lands on your canvas with a
   correctly-proportioned design frame beside it.
2. Place anything in the design frame: images, text, components, whole layouts.
3. Click Render. The mockup's photo updates with your artwork warped on. Your
   design frame stays editable — tweak and re-render as often as you like.

**What makes the renders real**

- True perspective transforms for flat surfaces; cylindrical wraps for mugs
  and bottles; fabric displacement for shirts and totes.
- The photo's own shadows and highlights carry into your artwork.
- Recolour product parts (mug body, shirt fabric) with shading preserved.

**Video mockups**

Pick a clip up to 30 seconds and watch it play back warped onto the product,
right in the plugin. Export the result as MP4 — encoded locally on your
machine. Rendered clips stay in the plugin until you delete them.

**No accounts. No sign-up.** Install and render.

## Network & privacy disclosure

This plugin talks to exactly one origin (listed in the manifest): its render
service. Your exported design frames are sent there over HTTPS solely to
composite the mockup, are processed in memory, and are **never stored** —
there are no accounts, no analytics, and no tracking. Video clips never leave
your machine except as individual frames sent to the same render service;
video encoding happens locally in the plugin.

## Support contact

<!-- fill in before submitting -->
kyle.foreman@lpt.com

---

## Assets in this folder

| File                   | Use in the publish modal        |
| ---------------------- | ------------------------------- |
| `icon.png`             | Icon (128×128)                  |
| `thumbnail.png`        | Cover / thumbnail (1920×1080)   |
| `carousel-warps.png`   | Carousel image 1                |
| `carousel-colorize.png`| Carousel image 2                |
| `carousel-video.png`   | Carousel image 3                |

Regenerate any time with `npx tsx tools/make-community-assets.ts` (run
`tools/render-sample.ts` first so the sample renders exist).

---

## Submission checklist

**Before the deploy exists, none of this ships.** The plugin compiles the
production origin in; a Community install with no server behind it is a broken
listing.

- [ ] Deploy the render service (`docs/DEPLOY.md`) and confirm
      `https://mockup-forge.fly.dev/health` returns 11+ items.
      If the app name changed, update `manifest.production.json` first.
- [ ] `npm run build:prod --workspace @mf/plugin` — zero localhost, zip built.
- [ ] Smoke the release build in Figma desktop: import
      `apps/plugin/release/mockup-forge/manifest.json`, render a mug against
      the **production** service, render a video clip.
- [ ] Make a playground file: two imported mockups with sample artwork placed,
      one pre-rendered. (Optional but strongly recommended by Figma.)
- [ ] Figma desktop → Plugins → Manage plugins → Publish. Paste the copy
      above; upload icon, thumbnail, carousel images; fill the security
      disclosure using the Network & privacy paragraph.
- [ ] Submit for review. Status arrives by email; the listing shows
      "In review" until approved.

**After approval**

- [ ] Install from the Community listing on a machine that has never seen this
      repo, and render something. That is the actual plug-and-play test.
- [ ] Watch `fly logs` for the first days; rate-limit or width-clamp tuning is
      an env change + `fly deploy`, no re-review.
- [ ] Catalog growth (real photography, new items) is server-side only — no
      plugin update, no re-review.

**What triggers a re-review**

Any change to the plugin bundle or manifest: new UI, new allowed domain,
renamed plugin. Server-side changes never do.
