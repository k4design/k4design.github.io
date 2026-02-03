# LPT Index — Lofty-Compatible HTML Snippets

Copy-paste these snippets into Lofty's embedded HTML modules. Each file is one section from `index.html`.

## Before pasting

1. **CSS**: In Lofty's module settings, add a link to the main stylesheet (if the platform allows):
   ```html
   <link rel="stylesheet" href="https://k4design.github.io/lpt/avasya.css" />
   ```
   If you can only paste body content, paste the snippet as-is; styling may depend on Lofty's page CSS.

2. **Assets**: Snippets use full URLs (`https://k4design.github.io/lpt/...`) so images and video work when embedded.

3. **Scripts**: Some sections use JS (Wistia video, canvas animation, carousels). If Lofty strips script, add the needed scripts in Lofty's custom code or use static fallbacks.

## Snippets

| File | Section |
|------|--------|
| `01-hero.html` | Hero with video, headline, CTAs, stats, scrolling ticker |
| `02-featured-in.html` | Featured In logos |
| `03-awards.html` | Awards & Recognition carousel |
| `04-mission.html` | Fastest Growing / mission + map |
| `05-leadership.html` | Meet the People Behind LPT (leadership grid) |
| `06-why-agents-choose.html` | Why Agents Choose LPT + accommodation cards |
| `07-dezzy-ai.html` | Agent Technology / dezzy.ai hero (uses canvas) |
| `08-feature-cards.html` | Mission Model & Tools + Wistia video |
| `09-support.html` | Agent Success Team / Fast Reliable Support |
| `10-agent-stories.html` | Agent Wins testimonial carousel |
| `11-compensation.html` | Compensation Architecture / comp table |
| `12-cta.html` | Ready to Level Up / contact form |
| `13-google-reviews.html` | Google Reviews carousel (10 reviews, auto-rotating) |

Order matches the index page. Use any subset in any order in Lofty.

## One-time setup (if Lofty allows)

- **Stylesheet**: `<link rel="stylesheet" href="https://k4design.github.io/lpt/avasya.css" />`
- **Fonts** (optional): `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />`
- **Wistia** (for hero CTA + feature-cards video): `<script src="https://fast.wistia.com/player.js" async></script>` and `<script src="https://fast.wistia.com/embed/sm4mracms7.js" async type="module"></script>`
- **Carousels / canvas**: If Lofty supports custom JS, include the relevant parts of `scripts.js` (awards carousel, testimonial carousel, AI background). The Google reviews snippet (`13-google-reviews.html`) includes its own carousel script inline. Replace the sample review text with real quotes from LPT Realty's Google listing if desired.
