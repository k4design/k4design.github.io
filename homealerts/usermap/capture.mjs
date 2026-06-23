// HomeAlerts user-map screenshot harness.
// Drives headless Chromium against the local static HTML files and writes
// full-page PNGs into usermap/shots/. No server, no auth — just file:// loads.
//
// Reuses the puppeteer install from ../35353-usermap/_capture/node_modules.
// Run from the project root:  node usermap/capture.mjs

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, "..");          // homealerts/

// Reuse the puppeteer install from the sibling 35353-usermap capture kit.
const require = createRequire(
  path.join(PROJECT, "35353-usermap/_capture/package.json")
);
const puppeteer = require("puppeteer");
const OUT = path.join(__dirname, "shots");
const fileUrl = (rel) => pathToFileURL(path.join(PROJECT, rel)).href;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoScroll(page) {
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
  await sleep(500);
}

async function shoot(browser, { url, out, mobile, fullPage = true, before, clip }) {
  const page = await browser.newPage();
  try {
    await page.setViewport(
      mobile
        ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1 }
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
    await sleep(900);
    await autoScroll(page);
    await sleep(400);
    if (before) { await page.evaluate(before); await sleep(700); }
    const abs = path.join(OUT, out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    await page.screenshot({ path: abs, fullPage: clip ? false : fullPage, clip });
    console.log("  ✓", out);
    return true;
  } catch (e) {
    console.log("  ✗", out, "—", e.message.split("\n")[0]);
    return false;
  } finally {
    await page.close();
  }
}

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  acceptInsecureCerts: true,
  args: ["--ignore-certificate-errors", "--no-sandbox"],
});

const HOME = fileUrl("index.html");
const SEARCH = fileUrl("propertysearch.html");

let ok = 0, fail = 0;
const tally = (r) => (r ? ok++ : fail++);

console.log("» landing (index.html)");
tally(await shoot(browser, { url: HOME, out: "01-landing/01_home.png" }));
tally(await shoot(browser, { url: HOME, out: "01-landing/02_home-mobile.png", mobile: true }));
tally(await shoot(browser, {
  url: HOME, out: "01-landing/03_listing-detail.png", fullPage: false,
  before: () => { window.scrollTo(0, 0); if (window.openModal) window.openModal(1); },
}));
tally(await shoot(browser, {
  url: HOME, out: "01-landing/04_signup.png",
  before: () => { document.getElementById("signup")?.scrollIntoView(); },
}));

console.log("» search (propertysearch.html)");
tally(await shoot(browser, { url: SEARCH, out: "02-search/01_property-search.png" }));
tally(await shoot(browser, { url: SEARCH, out: "02-search/02_property-search-mobile.png", mobile: true }));

await browser.close();
console.log(`\nDONE — ${ok} ok, ${fail} failed`);
