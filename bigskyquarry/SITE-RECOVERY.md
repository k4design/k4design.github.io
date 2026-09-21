# bigskyquarry.com — static recovery

A self-hosted static copy of the live site, captured **2026-09-21**.

The original is WordPress on WP Engine running a hand-built custom theme
(`wp-content/themes/bigskyquarry`, Foundation-based) — no page builder, which is
why it couldn't be reproduced from the admin. This is a faithful copy of the
*rendered* site, not a rebuild of the theme.

- **Site:** `site/` — deployable as-is to GitHub Pages or any static host
- **Tooling:** `tools/` — the capture/rewrite/verify scripts, so this can be re-run

## What was captured

| | |
|---|---|
| HTML pages | 47 |
| Files total | 984 (~121 MB) |
| Local references verified | 10,162 — **0 broken** |
| Pages byte-identical to live | **46 / 47** |

The one non-identical page (`learn-more/`) differs only in per-request Gravity
Forms tokens and its randomised honeypot label. No content difference.

Covered: all 14 pages, 13 news posts, 6 home designs, 3 home types, the news
category archive + its page 2, and 10 monthly date archives. The last twelve
were missing from Yoast's sitemap and were found by crawling.

`/author/*` URLs appear in the sitemap but **404 on the live site too**, so
they were not recreated.

## Choices worth knowing

**Relative links throughout.** Works at a domain root, in a subfolder
(`k4design.github.io/bigskyquarry/site/`), or anywhere else, with no rewrite.

**`canonical`, OpenGraph, Twitter and JSON-LD still point at
`https://bigskyquarry.com`.** Deliberate — those should name the real site.
Change them if this copy becomes canonical somewhere else.

**Redirects resolved at build time.** Four live 301s (three old pre-`/news/`
permalinks, plus `category/news/page/1/`) were rewritten to their targets, so no
link depends on a redirect rule a static host won't have.

**Adobe Fonts self-hosted.** `legitima` and `oswald` were pulled from the
Typekit kit into `site/wp-content/themes/bigskyquarry/assets/fonts/typekit/`,
so the site no longer depends on a domain-locked kit. ⚠️ *Adobe's terms expect
these served from their CDN. Fine for an archive; check licensing before
serving self-hosted fonts publicly long-term — otherwise restore the original
`<link>` to `https://use.typekit.net/xga3pog.css`.*

**Instagram images localised.** The four feed images were saved from
`cdninstagram.com`, whose URLs expire. (The plugin's own `*thumb.webp` cache
404s on the live site too — not a capture gap.)

## Known limitations

**The contact form does not submit.** It was Gravity Forms; its security tokens
are single-use, so the original path cannot work statically — and cross-origin
POST back to WordPress won't either. `site/static-assets/static-form.js`
intercepts submission and shows *"This form isn't connected yet — please email…"*
rather than silently dropping a lead.

To reconnect, set one line in that file:

```js
var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxxx";
```

Any backend accepting a `multipart/form-data` POST works (Formspree, Basin,
Netlify Forms). Fields, for rebuilding it elsewhere:

| Field | Name | Type |
|---|---|---|
| First / Last name | `input_1`, `input_3` | text |
| Email / Confirm | `input_4`, `input_5` | email |
| Phone | `input_6` | tel |
| ZIP | `input_7` | text |
| I am a… (5 boxes) | `input_10.1`–`.5` | checkbox |
| Working with an agent? | `input_16` | radio (Yes/No) |
| Agent first / last | `input_17.3`, `input_17.6` | text |
| Agency or brokerage | `input_15` | text |
| Email opt-in | `input_13.1` | checkbox |
| *(honeypot — leave empty)* | `input_18` | text |

**`admin-ajax.php` calls 404.** Affects only Instagram "load more"; the feed
itself is pre-rendered and displays fine.

**Content is frozen.** No CMS — news posts and home designs are now hand-edited
HTML.

**Third-party embeds still load from their own services** (unavoidable, and they
work): SightMap (interactive site plan), Vimeo, Google Maps, Google Tag Manager
`GTM-KPGLBCGK`, Termly cookie consent, reCAPTCHA, Adobe InDesign brochure, and
the Font Awesome **Pro** kit `1bd1dbc926` — Pro can't legitimately be
self-hosted, and the site uses `fa-light`, which Free doesn't include.

⚠️ The Google Maps key `AIzaSyAjSpaGpGxvqxxxe4SEwsqYZf05eyNHAEk` is public in
the markup (as on the live site). If it's HTTP-referrer-restricted to
`bigskyquarry.com`, maps will fail on any other domain — add the new one in
Google Cloud Console.

## Re-running the capture

```bash
cd tools
python3 mirror.py     # fetch pages listed in all_urls_full.txt
python3 extract.py    # find asset URLs in the HTML
python3 dl.py assets.txt
python3 rewrite.py    # mirror/ -> site/, relativise + patch
python3 verify.py     # assert every local reference resolves
python3 fidelity.py   # diff every page against live
python3 crawl.py      # re-discover pages missing from the sitemap
```

## Previewing locally

Use a server — `file://` won't resolve the directory-style URLs.

```bash
cd site && python3 -m http.server 8777
```
