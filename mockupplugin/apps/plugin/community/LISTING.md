# Community listing — copy and submission checklist

Paste-ready copy for the Figma publish modal. Submission happens in the
**Figma desktop app**: Plugins → Manage plugins → publish a new plugin →
import from `apps/plugin/release/mockup-forge/manifest.json`
(run `npm run build:prod --workspace @mf/plugin` first).

---

## Name

Mockup Forge

## Tagline (short description)

Put your designs on real products — phones, mugs, shirts, billboards, even
video — without leaving Figma.

## Category

Design tools

## Tags

mockup, product mockup, presentation, device mockup, apparel, packaging,
branding, video, render

## Description

Mockup Forge turns flat artwork into product shots. Pick a mockup, drop your
design into the frame it gives you, and click Render — your artwork comes back
wrapped onto the product, following its curves, creases and lighting like it
was printed there.

**How it works**

1. Browse the mockup library and click one. It arrives on your canvas with a
   correctly proportioned frame beside it.
2. Put anything you like in that frame — images, text, components, whole
   layouts.
3. Click Render. The product photo updates with your design on it.

Your design frame stays live and editable the whole time, so changing a colour
and re-rendering takes one click. Nothing you made is ever overwritten.

**Mockups that look real**

- Flat surfaces get true perspective. Mugs and bottles wrap around. Shirts and
  totes ripple with the fabric.
- The product photo's own shadows and highlights fall across your artwork.
- Recolour the product itself — a white mug to black, a tee to navy — and the
  shading stays believable.
- Devices, apparel, packaging, print and branding, from phone screens to
  street billboards.

**Video, not just stills**

Drop in a video clip and watch it play back on the product inside the plugin.
Export the result as an MP4 with the original clip's audio intact, ready to
drop into a deck or a social post. Rendered clips stay in the plugin until you
delete them, so you can replay or re-download any of them later.

**Batch it**

Select several mockups and render them all in one pass — a whole set of product
shots from one piece of artwork.

**No accounts, no sign-up, nothing to configure.** Install it and render.

## Network & privacy disclosure

This plugin connects to one service, listed in its manifest, which does the
image compositing. Your exported artwork is sent there over a secure connection
purely to produce the mockup, is processed in memory, and is never stored.
There are no accounts, no analytics and no tracking. Video files stay on your
own machine — only the individual frames being composited are sent, and the
finished video is assembled locally.

## Support contact

kyle.foreman@lpt.com

---

## Assets in this folder

| File                    | Use in the publish modal      |
| ----------------------- | ----------------------------- |
| `icon.png`              | Icon (128×128)                |
| `thumbnail.png`         | Cover / thumbnail (1920×1080) |
| `carousel-warps.png`    | Carousel image 1              |
| `carousel-colorize.png` | Carousel image 2              |
| `carousel-video.png`    | Carousel image 3              |

Regenerate with `npx tsx tools/make-community-assets.ts` (run
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
      the **production** service, then render a video clip with audio.
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
