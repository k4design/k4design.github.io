FallCon 2026 — static site package
==================================

Upload the CONTENTS of this folder to your web root (or a subfolder).
Any static web server works — Apache, nginx, IIS, S3+CloudFront, cPanel.
There is no build step, no Node, no database.

  index.html            the site
  sponsor-apply.html    sponsor application form (linked from the site)
  support.js            page runtime (required)
  image-slot.js         renders the 3 <image-slot> photo areas (required)
  img/                  44 images + the hero video (only files the site uses)
  .image-slots.state.json   empty on purpose; stops image-slot.js 404ing

REQUIRES OUTBOUND INTERNET from the visitor's browser (not your server):
  fonts.googleapis.com / fonts.gstatic.com   Anton, Archivo Black, Fraunces, Inter
  unpkg.com                                  React + ReactDOM (page runtime)
  browser.sentry-cdn.com                     error reporting
  fast.wistia.com                            the two embedded videos
  register.lptrealty.com                     ticket links
If your visitors are behind a firewall that blocks these, the page will not
render correctly — tell me and I can vendor the runtime locally.

BEFORE GOING LIVE — update the share image URL to your own domain.
In index.html, two tags still point at the old Netlify host:
  <meta property="og:image"  content="https://fallcon2026.netlify.app/img/shareimage.jpg">
  <meta name="twitter:image" content="https://fallcon2026.netlify.app/img/shareimage.jpg">
Change both to https://YOUR-DOMAIN/img/shareimage.jpg or link previews will
keep loading from Netlify.

RECOMMENDED SERVER SETTINGS
  - gzip/brotli for .html .js .svg  (index.html is ~230 KB uncompressed)
  - long cache headers for /img/ (filenames are versioned by hand, e.g. ?v=2)
  - serve .webm as video/webm if your server does not already

NOT INCLUDED (on purpose)
  review.html and netlify/ — the commenting tool. It needs Netlify Functions
  and will not work on a generic server.
