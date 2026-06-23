// OwnerSeller user-map capture harness.
// Drives headless Chromium against the live Vite dev server (http://localhost:5273)
// and writes full-page PNGs into owner-seller-user-map/screenshots/.
// Themed public pages are captured in all 3 themes (classic/editorial/bold);
// hub/admin/auth are single-look. Auth is demo-mode: POST /api/auth/sign-in with
// any password returns { user, token } that we seed into localStorage (os_session_v1).
// Theme is seeded via localStorage 'os-theme'. Detail-page URLs are derived from
// their list pages so they're always valid.

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// The Vite dev server runs over HTTPS with a self-signed cert — accept it.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE = "https://localhost:5273";
const OUT  = "D:/Documents/LPT Realty/Flagship Logos/owner-seller-user-map/screenshots";
const THEMES = ["classic", "editorial", "bold"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── auth ────────────────────────────────────────────────────────────────────
async function signIn(email) {
  const res = await fetch(`${BASE}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "demo" }),
  });
  if (!res.ok) throw new Error(`sign-in ${email} → HTTP ${res.status}`);
  const data = await res.json();
  return { user: data.user, token: data.token };
}

// ── page prep ───────────────────────────────────────────────────────────────
async function prep(page, theme, auth) {
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluateOnNewDocument((t, a) => {
    try { localStorage.setItem("os-theme", t); } catch (_) {}
    if (a) { try { localStorage.setItem("os_session_v1", JSON.stringify({ user: a.user, token: a.token })); } catch (_) {} }
  }, theme, auth || null);
}

async function settle(page) {
  // force reveal + kill transitions, eager-load images, scroll through, wait fonts
  await page.addStyleTag({ content: `
    *,*::before,*::after { animation-duration:.001s!important; animation-delay:0s!important; transition:none!important; }
    .reveal, [class*="reveal"] { opacity:1!important; transform:none!important; }
  `}).catch(() => {});
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => { try { i.loading = "eager"; } catch (_) {} });
    await new Promise((res) => {
      let y = 0; const id = setInterval(() => {
        window.scrollBy(0, 800); y += 800;
        if (y >= document.body.scrollHeight) { clearInterval(id); window.scrollTo(0, 0); res(); }
      }, 50);
    });
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (_) {} }
  });
  await sleep(700);
}

async function shoot(browser, { url, out, theme = "classic", auth = null, mobile = false }) {
  const page = await browser.newPage();
  try {
    await page.setViewport(mobile
      ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { width: 1440, height: 900, deviceScaleFactor: 1 });
    await prep(page, theme, auth);
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(1300);                       // let the reveal safety-timeout + countups finish
    await settle(page);
    const finalPath = new URL(page.url()).pathname;
    const abs = path.join(OUT, out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    await page.screenshot({ path: abs, fullPage: true });
    const redirected = finalPath !== url.split("?")[0] && !url.startsWith(finalPath);
    console.log(`  ${redirected ? "!" : "✓"} ${out}${redirected ? `  (landed ${finalPath})` : ""}`);
    return true;
  } catch (e) {
    console.log(`  ✗ ${out} — ${String(e.message).split("\n")[0]}`);
    return false;
  } finally { await page.close(); }
}

async function deriveFirstPath(browser, listUrl, auth, reSrc, fallback) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1440, height: 900 });
    await prep(page, "classic", auth);
    await page.goto(`${BASE}${listUrl}`, { waitUntil: "networkidle2", timeout: 45000 });
    await sleep(900);
    const found = await page.evaluate((src) => {
      const re = new RegExp(src);
      for (const a of document.querySelectorAll("a[href]")) {
        let p; try { p = new URL(a.href).pathname; } catch (_) { continue; }
        if (re.test(p)) return p;
      }
      return null;
    }, reSrc);
    console.log(`  · derived ${listUrl} → ${found || fallback + " (fallback)"}`);
    return found || fallback;
  } catch (e) {
    console.log(`  · derive ${listUrl} failed (${e.message.split("\n")[0]}) → ${fallback}`);
    return fallback;
  } finally { await page.close(); }
}

// ── run ───────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: "new",
  acceptInsecureCerts: true,
  args: ["--ignore-certificate-errors", "--no-sandbox"],
});

let ok = 0, fail = 0;
const tally = (r) => (r ? ok++ : fail++);

console.log("» auth");
const SARAH = await signIn("sarah@example.com");
const ADMIN = await signIn("admin@ownerseller.com");
console.log(`  seller=${SARAH.user.email} (${SARAH.user.role}), admin=${ADMIN.user.email} (${ADMIN.user.role})`);

console.log("» deriving detail-page URLs");
const buyDetail  = await deriveFirstPath(browser, "/buy",                null,  "^/buy/\\d+$",            "/buy/1");
const hubProp    = await deriveFirstPath(browser, "/hub",                SARAH, "^/hub/\\d+$",            "/hub/1");
const hubConv    = await deriveFirstPath(browser, "/hub/conversations",  SARAH, "^/hub/conversations/\\d+$", "/hub/conversations/1");
const admTicket  = await deriveFirstPath(browser, "/admin/tickets",      ADMIN, "^/admin/tickets/\\d+$",  "/admin/tickets/1");
const admGuideEd = await deriveFirstPath(browser, "/admin/guides",       ADMIN, "^/admin/guides/\\d+/edit$", "/admin/guides/1/edit");
const admSeller  = await deriveFirstPath(browser, "/admin/sellers",      ADMIN, "^/admin/sellers/\\d+$",  "/admin/sellers/1");

// themed public pages — home route differs per theme; others share route (os-theme styles them)
const THEMED = [
  { file: "home",              routeByTheme: { classic: "/", editorial: "/2", bold: "/v3" } },
  { file: "valuation",         route: "/valuation" },
  { file: "quiz",              route: "/quiz" },
  { file: "sign-in",           route: "/sign-in" },
  { file: "buy",               route: "/buy" },
  { file: "buy-detail",        route: buyDetail },
  { file: "tools",             route: "/tools" },
  { file: "tool-net-proceeds", route: "/tools/net-proceeds" },
  { file: "tool-pricing",      route: "/tools/pricing-sandbox" },
  { file: "tool-photo-list",   route: "/tools/photo-list" },
  { file: "learn",             route: "/learn" },
  { file: "learn-article",     route: "/learn/twelve-photos-every-listing-needs" },
  { file: "about",             route: "/about" },
  { file: "privacy",           route: "/privacy" },
  { file: "terms",             route: "/terms" },
  { file: "support",           route: "/support" },
  { file: "support-book-call", route: "/support/book-call" },
  { file: "support-topic",     route: "/support/topics/pricing" },
  { file: "support-article",   route: "/support/why-no-offers" },
];

for (const theme of THEMES) {
  console.log(`» themed public — ${theme}`);
  for (const p of THEMED) {
    const url = p.routeByTheme ? p.routeByTheme[theme] : p.route;
    tally(await shoot(browser, { url, out: `themes/${theme}/${p.file}.png`, theme }));
  }
}

// single-look pages (classic styling)
const SINGLE = [
  { url: "/this-route-does-not-exist", out: "not-found.png" },
  // seller hub
  { url: "/hub",                       out: "hub.png",                  auth: SARAH },
  { url: hubProp,                      out: "hub-property.png",         auth: SARAH },
  { url: "/hub/valuation",             out: "hub-valuation.png",        auth: SARAH },
  { url: "/hub/quiz",                  out: "hub-quiz.png",             auth: SARAH },
  { url: "/hub/tools",                 out: "hub-tools.png",            auth: SARAH },
  { url: "/hub/tools/net-proceeds",    out: "hub-tool.png",             auth: SARAH },
  { url: "/hub/learn",                 out: "hub-learn.png",            auth: SARAH },
  { url: "/hub/learn/closing-without-an-agent", out: "hub-article.png", auth: SARAH },
  { url: "/hub/saved",                 out: "hub-saved.png",            auth: SARAH },
  { url: "/hub/tours",                 out: "hub-tours.png",            auth: SARAH },
  { url: "/hub/conversations",         out: "hub-conversations.png",    auth: SARAH },
  { url: hubConv,                      out: "hub-conversation.png",     auth: SARAH },
  { url: "/hub/settings",              out: "hub-settings.png",         auth: SARAH },
  { url: "/hub/support",               out: "hub-support.png",          auth: SARAH },
  { url: "/hub/support/book-call",     out: "hub-support-call.png",     auth: SARAH },
  { url: "/hub/support/topics/pricing",out: "hub-support-topic.png",    auth: SARAH },
  { url: "/hub/support/why-no-offers", out: "hub-support-article.png",  auth: SARAH },
  // admin
  { url: "/admin",                     out: "admin.png",                auth: ADMIN },
  { url: "/admin/tickets",             out: "admin-tickets.png",        auth: ADMIN },
  { url: admTicket,                    out: "admin-ticket.png",         auth: ADMIN },
  { url: "/admin/guides",              out: "admin-guides.png",         auth: ADMIN },
  { url: "/admin/guides/new",          out: "admin-guide-new.png",      auth: ADMIN },
  { url: admGuideEd,                   out: "admin-guide-edit.png",     auth: ADMIN },
  { url: "/admin/sellers",             out: "admin-sellers.png",        auth: ADMIN },
  { url: admSeller,                    out: "admin-seller.png",         auth: ADMIN },
];
console.log("» single-look (hub / admin / error)");
for (const s of SINGLE) tally(await shoot(browser, { ...s, theme: "classic" }));

// mobile — key pages, classic
const MOBILE = [
  { url: "/",          out: "mobile/home.png" },
  { url: "/valuation", out: "mobile/valuation.png" },
  { url: "/buy",       out: "mobile/buy.png" },
  { url: "/hub",       out: "mobile/hub.png", auth: SARAH },
];
console.log("» mobile (390×844, classic)");
for (const m of MOBILE) tally(await shoot(browser, { ...m, theme: "classic", mobile: true }));

await browser.close();
console.log(`\nDONE — ${ok} ok, ${fail} failed`);
