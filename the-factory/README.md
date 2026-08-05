# The Factory

Internal library of the creative team's custom tools — Figma plugins, Chrome
extensions, and a Mac/iPhone dashboard. The index is a
two-pane browser: plugins grouped by category down the left, the selected
guide in the pane on the right. Each guide is also a standalone page you can
open, print, or send on its own.

Live at `https://k4design.github.io/the-factory/` (password below).

## Adding a plugin

1. `cp guides/_template.html guides/<slug>.html` and fill in the `[[BRACKETS]]`.
   The template's section spine is deliberate — keep the order so every guide is
   skimmable in the same places.
2. Pick an accent colour in the guide's small `<style>` block (dezzy owns the
   library pink). Guides are dark-first, so pick something that carries on
   near-black.
3. Drop a logo in `assets/icons/` (optional — see the README in there).
4. Add an entry to `plugins.js`, with a `category` that matches one of the
   `CATEGORIES` at the top of that file — add a new one there first if none fit.
   `CATEGORIES` also sets the order the groups appear in the sidebar:

```js
{
  slug: 'video-export',
  name: 'Video Export',
  tagline: 'One line on what it removes from your day.',
  category: 'Video & Motion',
  icon: 'assets/icons/video-export.png',   // or an emoji, or omit it
  status: 'live',            // live | beta | review | retired
  version: '1.0',
  owner: 'Kyle',
  updated: '2026-08-04',     // YYYY-MM-DD, sorts newest-first on the index
  tags: ['video', 'automation'],
  guide: 'guides/video-export.html',
},
```

That's it — the sidebar builds itself from that list. Every row has a 1:1 80×80
icon slot beside the name; with no `icon` set the slot shows the plugin's
initials, so names stay aligned either way. `retired` entries sink to
the bottom of their category and go dim rather than disappearing, because people
go looking for them. A plugin whose category isn't declared still shows up,
grouped at the end, instead of silently vanishing.

The selected plugin lives in the URL hash (`index.html#frame-to-mp4`), so a
guide can be linked, bookmarked, and survives a reload.

## The password

`skunkworks` — change it by replacing `PASSWORD_SHA256` in `assets/gate.js`;
instructions for generating the hash are in the comment at the top of that file.

**The gate is client-side only.** It keeps casual visitors out and nothing more:
the hash and every guide file are readable in view-source, so anyone determined
gets in. The `noindex` meta on each page plus `/robots.txt` at the repo root do
the real work of keeping these pages out of search results.

So: **no secrets in guides.** No API keys, tokens, client names, or unreleased
deal details. If a plugin's setup needs a key, write "ask Kyle for the key."

If that ever becomes too limiting, moving to a real server-side gate
(Cloudflare Pages + a Worker that checks the password and sets a signed cookie)
is a half-day job and doesn't change any of the file layout here.

## Local preview

Double-click `index.html`. That's it — no server, no build step. There's no
`fetch` anywhere, so every page works opened straight off disk, and the password
gate skips itself on `file://` (whoever has the files already has the guides).

## Layout

```
login.html      password field, sets a sessionStorage flag
index.html      two-pane browser: categorised list left, guide in a frame right
plugins.js      the plugin list + CATEGORIES — the one file you edit
assets/
  img/          app screenshots used inside guides
  guide.css     the house style for guides — dark tech-docs, pink and black
  library.css   the shell only: login page + the index's two panes
  icons/        square plugin logos, referenced by `icon` in plugins.js
  gate.js       session check (requireUnlock / attemptUnlock / lock)
  cta.js        scroll progress → the guide's Open-in-Figma button colour
  index.js      builds the sidebar, filters it, drives the right-hand pane
guides/
  _template.html      copy this for the next plugin
  dezzy-magazine.html worked example: .pg-* Figma panel mockups, .crop close-ups
  frametoMP4.html     brings its own design system rather than library.css
sampleguide/    the original standalone dezzy guide (see note below)
```

`sampleguide/dezzy-magazine-guide.html` is the pre-library original. It is
ungated and not noindexed, so it's a public copy of a guide we just put behind
a password — delete it once you're happy with the port.

## A note on guide styling

All three guides now share one structure and one colour scheme:

- **Structure** follows the Frame to MP4 guide — sticky nav with section
  links, centred hero (icon, status pill, gradient headline, CTAs), then
  `kicker → h2 → sub` sections, card grids, a numbered stepper, callouts,
  FAQ accordions.
- **Colour** is the dezzy AutoFill palette — blue `#4d8dff` / violet
  `#8b5cf6` on near-black, with a light-mode variant, so guides follow the
  reader's system theme.

`assets/guide.css` holds that system and is what `_template.html` and
`dezzy-magazine.html` link. `frametoMP4.html` and `AutoLayout.html` keep
their own inline stylesheets — they carry bespoke UI mockups that would be
lost in a swap — but were retuned to the same proportions, so the three read
as one product. Frame to MP4 keeps its darker blue/violet original.

There are no entrance animations on any guide; content is painted at full
opacity on load.

The `.pg-*` Figma-panel mockups and `.crop` close-ups stay light in both
themes, because they stand in for screenshots of Figma's own light UI.

## App screenshots

`assets/img/autofill-*.png` are the dezzy AutoFill plugin's real UI, not
mockups: its own `ui.html` (from the `dezzyfill/` project) rendered in a browser
at plugin width and captured at 2×. They show the interface empty, since nothing
is answering on the Figma side.

To re-shoot after a UI change, serve the repo root and load `ui.html` in a
wrapper that hides `#loadingOverlay` (it spins forever outside Figma) and clicks
the tab you want, then screenshot at 420×600 with `--force-device-scale-factor=2`.

## The Open-in-Figma button

Each guide has a fixed button, bottom-right, linking to the plugin on Figma
Community. Its colour tracks how far you've read: blue at the top of the guide,
violet at the bottom, so it doubles as a progress indicator.

`assets/cta.js` writes scroll progress to `--cta-p` (0…1) on `<html>`; the
`.plugin-cta` rule slides a five-times-oversized blue→violet gradient by that
amount. No colour maths in JS — one custom property, the rest is CSS.

Add the URL for a new guide in the `.plugin-cta` anchor near the bottom of the
file. **Frame to MP4 has the styles but no button yet** — its Community URL
hasn't been supplied.
