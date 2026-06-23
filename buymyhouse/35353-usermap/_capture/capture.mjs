// 35353 user-map screenshot harness.
// Drives headless Chromium against the live Vite dev server (HTTPS, mkcert) and
// writes full-page PNGs into the user-map folders, organized by version where the
// page has Classic/Bold/Warm variants. Auth-gated /app/* pages are reached by
// minting a dev JWT (secret matches backend default) and seeding localStorage —
// no passwords touched, DB opened read-only.

import puppeteer from "puppeteer";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, "..");           // usermap dir
const BASE   = "https://localhost:3000";
const SECRET = "35353_dev_secret";
const DB_PATH = "D:/Documents/Claude/Test/35353 Website/backend/35353.db";

// Only capture a subset when passed as args, e.g. `node capture.mjs marketing mobile`
const ONLY = process.argv.slice(2);
const want = (tag) => ONLY.length === 0 || ONLY.includes(tag);

// ── auth payloads ─────────────────────────────────────────────────────────────
function authFor(id) {
  const db = new Database(DB_PATH, { readonly: true });
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  delete u.password_hash;
  if (u.current_team_id) {
    const m = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?")
      .get(u.current_team_id, u.id);
    u.team_role = m?.role || null;
  }
  db.close();
  const token = jwt.sign({ userId: id }, SECRET, { expiresIn: "7d" });
  return { token, user: u };
}
const AGENT = authFor(1);   // Jane Doe — enterprise, 4 listings + leads
const ADMIN = authFor(9);   // admin@35353.com — staff

// ── manifest ────────────────────────────────────────────────────────────────
// versioned families: captured at three URL prefixes → three version folders
const VERSIONS = [
  { key: "classic", prefix: "" },
  { key: "bold",    prefix: "/v2" },
  { key: "warm",    prefix: "/v3" },
];

const MARKETING = [
  { file: "01_home",         pathFor: (p) => `${p || "/"}` },
  { file: "02_for-agents",   pathFor: (p) => `${p}/for-agents` },
  { file: "03_pricing",      pathFor: (p) => `${p}/pricing` },
  { file: "04_integrations", pathFor: (p) => `${p}/integrations` },
  { file: "05_resources",    pathFor: (p) => `${p}/resources` },
];
const CONSUMER_VERSIONED = [
  { file: "01_find",              pathFor: (p) => `${p}/find` },
  { file: "02_find-with-results", pathFor: (p) => `${p}/find?q=Maple` },
];
const MOBILE_VERSIONED = [
  { file: "01_home",       pathFor: (p) => `${p || "/"}` },
  { file: "02_find",       pathFor: (p) => `${p}/find` },
  { file: "03_for-agents", pathFor: (p) => `${p}/for-agents` },
  { file: "04_pricing",    pathFor: (p) => `${p}/pricing` },
];

// single-look pages: { url, out, auth?, mobile? }
const SHARED = [
  // consumer (shared look)
  { url: "/p/HOME123", out: "02-consumer/03_public-listing.png" },
  { url: "/p/INVALID", out: "02-consumer/04_public-listing-notfound.png" },
  // auth
  { url: "/signin",          out: "03-auth/01_signin.png" },
  { url: "/register",        out: "03-auth/02_register.png" },
  { url: "/forgot-password", out: "03-auth/03_forgot-password.png" },
  { url: "/reset-password?token=sample-token", out: "03-auth/04_reset-password.png" },
  { url: "/verify-email",    out: "03-auth/05_verify-email-placeholder.png" },
  // agent dashboard (auth as Jane)
  { url: "/app/dashboard",     out: "04-agent-dashboard/01_dashboard.png",        auth: AGENT },
  { url: "/app/listings",      out: "04-agent-dashboard/02_listings.png",         auth: AGENT },
  { url: "/app/listings/new",  out: "04-agent-dashboard/03_listing-new.png",      auth: AGENT },
  { url: "/app/listings/1",    out: "04-agent-dashboard/04_listing-detail.png",   auth: AGENT },
  { url: "/app/prospects",     out: "04-agent-dashboard/05_prospects.png",        auth: AGENT },
  { url: "/app/prospects/1",   out: "04-agent-dashboard/06_lead-detail.png",      auth: AGENT },
  { url: "/app/showings",      out: "04-agent-dashboard/07_showings.png",         auth: AGENT },
  { url: "/app/messages",      out: "04-agent-dashboard/08_messages.png",         auth: AGENT },
  { url: "/app/team",          out: "04-agent-dashboard/09_team.png",             auth: AGENT },
  { url: "/app/analytics",     out: "04-agent-dashboard/10_analytics.png",        auth: AGENT },
  { url: "/app/notifications", out: "04-agent-dashboard/11_notifications.png",    auth: AGENT },
  { url: "/app/settings",      out: "04-agent-dashboard/12_account-settings.png", auth: AGENT },
  { url: "/app/support",       out: "04-agent-dashboard/13_support.png",          auth: AGENT },
  { url: "/app/billing",       out: "04-agent-dashboard/14_billing-placeholder.png", auth: AGENT },
  // admin (auth as staff)
  { url: "/app/admin", out: "05-admin/01_admin-overview.png", auth: ADMIN },
  // legal
  { url: "/legal/privacy",      out: "06-legal-compliance/01_privacy.png" },
  { url: "/legal/terms",        out: "06-legal-compliance/02_terms.png" },
  { url: "/legal/tcpa",         out: "06-legal-compliance/03_tcpa.png" },
  { url: "/help",               out: "06-legal-compliance/04_help-center-placeholder.png" },
  { url: "/help/sign-templates",out: "06-legal-compliance/05_sign-templates-placeholder.png" },
  // errors
  { url: "/this-route-does-not-exist", out: "07-error/01_404-not-found.png" },
  { url: "/500",                       out: "07-error/02_500-server-error.png" },
  { url: "/p/INVALID",                 out: "07-error/03_public-listing-empty.png" },
  // mobile shared
  { url: "/p/HOME123",     out: "09-mobile/05_public-listing.png", mobile: true },
  { url: "/app/dashboard", out: "09-mobile/06_dashboard.png",      mobile: true, auth: AGENT },
  { url: "/app/listings",  out: "09-mobile/07_listings.png",       mobile: true, auth: AGENT },
  { url: "/app/prospects", out: "09-mobile/08_prospects.png",      mobile: true, auth: AGENT },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoScroll(page) {
  // trigger lazy-loaded images + IntersectionObserver reveals, then return to top
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 600;
      const timer = setInterval(() => {
        const h = document.body.scrollHeight;
        window.scrollBy(0, step);
        total += step;
        if (total >= h) { clearInterval(timer); resolve(); }
      }, 60);
    });
    window.scrollTo(0, 0);
  });
  await sleep(450);
}

async function shoot(browser, { url, out, auth, mobile }) {
  const page = await browser.newPage();
  try {
    await page.setViewport(
      mobile
        ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1 }
    );
    if (auth) {
      // establish origin, seed token+user, then load the gated route
      await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.evaluate((a) => {
        localStorage.setItem("35353_token", a.token);
        localStorage.setItem("35353_user", JSON.stringify(a.user));
        // Suppress every guided tour: the store key is a JSON map of
        // tour-id → true (see frontend/src/stores/tour.js, data/tours.js).
        const tourIds = ["dashboard","listings","new-listing","prospects",
          "lead-detail","showings","analytics","team","messages","settings"];
        const seen = {};
        for (const id of tourIds) seen[id] = true;
        localStorage.setItem("35353_tours_seen_v1", JSON.stringify(seen));
      }, auth);
    }
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 45000 });
    await sleep(900);
    await autoScroll(page);
    await sleep(400);
    const abs = path.join(ROOT, out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    await page.screenshot({ path: abs, fullPage: true });
    console.log("  ✓", out);
    return true;
  } catch (e) {
    console.log("  ✗", out, "—", e.message.split("\n")[0]);
    return false;
  } finally {
    await page.close();
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: "new",
  acceptInsecureCerts: true,
  args: ["--ignore-certificate-errors", "--no-sandbox"],
});

let ok = 0, fail = 0;
const tally = (r) => (r ? ok++ : fail++);

if (want("marketing")) {
  console.log("» marketing (versioned)");
  for (const v of VERSIONS)
    for (const m of MARKETING)
      tally(await shoot(browser, { url: m.pathFor(v.prefix), out: `01-marketing/${v.key}/${m.file}.png` }));
}
if (want("consumer")) {
  console.log("» consumer find (versioned)");
  for (const v of VERSIONS)
    for (const c of CONSUMER_VERSIONED)
      tally(await shoot(browser, { url: c.pathFor(v.prefix), out: `02-consumer/${v.key}/${c.file}.png` }));
}
if (want("mobile-mkt")) {
  console.log("» mobile marketing (versioned)");
  for (const v of VERSIONS)
    for (const m of MOBILE_VERSIONED)
      tally(await shoot(browser, { url: m.pathFor(v.prefix), out: `09-mobile/${v.key}/${m.file}.png`, mobile: true }));
}
if (want("shared")) {
  console.log("» shared single-look pages");
  for (const s of SHARED) tally(await shoot(browser, s));
}
if (want("app")) {
  console.log("» auth-gated app pages only (tour suppressed)");
  for (const s of SHARED.filter((s) => s.auth)) tally(await shoot(browser, s));
}

await browser.close();
console.log(`\nDONE — ${ok} ok, ${fail} failed`);
