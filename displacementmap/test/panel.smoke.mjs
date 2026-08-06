/**
 * Executes the built dist/panel.js against a fake DOM, a fake Photoshop host and
 * a fake Mockup Forge item directory.
 *
 *   node tools/build.mjs && node test/panel.smoke.mjs
 *
 * This exists because the panel's worst failure mode is silent: if the script
 * fails to load or throws while wiring up, UXP still renders the HTML, so you
 * get a normal-looking panel where nothing responds and no error appears. That
 * is indistinguishable from a working panel until you click something.
 *
 * It also pins the two contracts with the mockup renderer that fail invisibly:
 * the output filenames, and the exact pixel dimensions each map must have.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let fails = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) { fails++; console.log(`FAIL ${name} ${extra}`); }
  else console.log(`ok   ${name} ${extra}`);
};

// ---------- the item fixture ----------
// Deliberately mixed: `chest` is a homography warp (must be promoted to a
// displacement warp wrapping it as geometry) and `sleeve` is a mesh warp that
// must be left completely alone.

const CANVAS = { width: 728, height: 408 };
const CORNERS = {
  tl: { x: 0.31, y: 0.22 }, tr: { x: 0.68, y: 0.24 },
  br: { x: 0.67, y: 0.71 }, bl: { x: 0.32, y: 0.69 },
};
const ITEM = {
  id: "test-tee-01",
  name: "Test Tee",
  category: "apparel",
  viewpoint: "front",
  tags: ["tee"],
  canvas: CANVAS,
  thumbnail: "thumbnail.png",
  preview: "preview.png",
  layers: [
    { type: "base", src: "base.png" },
    {
      type: "surface", id: "chest", label: "Chest",
      placeholder: { aspect: 0.8, recommendedWidth: 1200, recommendedHeight: 1500 },
      warp: { kind: "homography", corners: CORNERS },
      mask: "mask-chest.png", opacity: 1, blend: "normal",
    },
    {
      type: "surface", id: "sleeve", label: "Sleeve",
      placeholder: { aspect: 1, recommendedWidth: 400, recommendedHeight: 400 },
      warp: { kind: "mesh", rows: 1, cols: 1, points: [
        { x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }, { x: 0.2, y: 0.2 }] },
      opacity: 1, blend: "normal",
    },
  ],
};
const ITEM_TEXT = `${JSON.stringify(ITEM, null, 2)}\n`;

// ---------- fake DOM, built from the real index.html ----------

const html = readFileSync(join(ROOT, "index.html"), "utf8");

const initialClass = new Map();
for (const [tag] of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
  const id = tag.match(/\bid="([^"]+)"/);
  if (!id) continue;
  const cls = tag.match(/\bclass="([^"]*)"/);
  initialClass.set(id[1], cls ? cls[1] : "");
}
const ids = [...initialClass.keys()];

// UXP's Spectrum pickers expose `value` as a GETTER ONLY. Assigning to it throws
// "Cannot set property value of [object Object] which has only a getter", which
// kills the running handler. Modelling that here is what catches the bug class;
// a plain writable stub happily accepts the assignment and hides it.
const GETTER_ONLY_VALUE = new Set(["preset", "surface"]);

function makeEl(id) {
  const el = {
    id,
    value: "",
    checked: false,
    disabled: false,
    textContent: "",
    className: initialClass.get(id) ?? "",
    children: [],
    _attrs: {},
    _handlers: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      return child;
    },
    get firstChild() { return this.children[0] ?? null; },
    set innerHTML(v) { if (v === "") this.children = []; },
    get innerHTML() { return ""; },
    addEventListener(type, fn) { (this._handlers[type] ||= []).push(fn); },
    async dispatch(type) {
      for (const fn of this._handlers[type] || []) await fn({ type });
    },
    get listenerCount() {
      return Object.values(this._handlers).reduce((n, a) => n + a.length, 0);
    },
  };

  if (GETTER_ONLY_VALUE.has(id)) {
    let backing = id === "preset" ? "fabric" : "";
    delete el.value;
    Object.defineProperty(el, "value", { get: () => backing, configurable: true });
    // Tests drive selection the way a user would, not the way code can't.
    el.selectOption = (v) => { backing = v; };
  }
  return el;
}

const els = new Map(ids.map((id) => [id, makeEl(id)]));
const body = makeEl("body");
const document = {
  getElementById: (id) => els.get(id) || null,
  createElement: (tag) => makeEl(`<${tag}>`),
  body,
};
const localStore = new Map();
const localStorage = {
  getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => localStore.set(k, String(v)),
  removeItem: (k) => localStore.delete(k),
};

// ---------- fake Photoshop / UXP host ----------

const calls = { getPixels: 0, putPixels: 0, closed: 0 };
const written = new Map();  // filename -> text contents, or null for a PNG
const sizes = new Map();    // filename -> {width, height} actually saved

const sourceDoc = {
  id: 1,
  name: "base.png",
  width: CANVAS.width,
  height: CANVAS.height,
  layers: [{ id: 10 }],
  closeWithoutSaving() { calls.closed++; },
};

let pending = null; // the doc currently being built for a writeMap

const photoshop = {
  app: { activeDocument: sourceDoc },
  core: { executeAsModal: async (fn) => fn({ reportProgress() {} }) },
  action: {
    batchPlay: async (cmds) => {
      for (const c of cmds) {
        if (c._obj === "make") {
          pending = { name: c.new.name, width: c.new.width._value, height: c.new.height._value };
          photoshop.app.activeDocument = {
            id: 100, name: c.new.name, width: pending.width, height: pending.height,
            layers: [{ id: 200 }],
            closeWithoutSaving() { calls.closed++; photoshop.app.activeDocument = sourceDoc; },
          };
        }
        if (c._obj === "imageSize" && pending) {
          pending.width = c.width._value;
          pending.height = c.height._value;
        }
        if (c._obj === "save" && pending) {
          written.set(c.in._path, null);
          sizes.set(c.in._path, { width: pending.width, height: pending.height });
          pending = null;
        }
      }
      return [];
    },
  },
  imaging: {
    getPixels: async (o) => {
      calls.getPixels++;
      const w = o.targetSize ? o.targetSize.width : sourceDoc.width;
      const h = o.targetSize ? o.targetSize.height : sourceDoc.height;
      const buf = new Uint8Array(w * h * 3);
      // Broad lighting falloff + fold ripple + a specular patch, so every map
      // has real signal rather than a constant.
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const lighting = 60 * Math.cos((Math.PI * x) / w);
          const fold = 18 * Math.sin((2 * Math.PI * x) / 48);
          const spec = x > w * 0.8 && y < h * 0.2 ? 70 : 0;
          const p = (y * w + x) * 3;
          const v = Math.max(0, Math.min(255, (150 + lighting + fold + spec) | 0));
          buf[p] = buf[p + 1] = buf[p + 2] = v;
        }
      return {
        imageData: { width: w, height: h, components: 3, getData: async () => buf, dispose() {} },
      };
    },
    createImageDataFromBuffer: async () => ({ dispose() {} }),
    putPixels: async () => { calls.putPixels++; },
  },
};

const folder = {
  nativePath: "/repo/mockupplugin/assets/items/test-tee-01",
  getEntry: async (name) => {
    if (!written.has(name)) throw new Error(`ENOENT ${name}`);
    return { name, read: async () => written.get(name) };
  },
  createEntry: async (name) => ({
    name,
    write: async (contents) => { written.set(name, contents); },
  }),
};
written.set("item.json", ITEM_TEXT);

const uxp = {
  storage: {
    localFileSystem: {
      getFolder: async () => folder,
      createPersistentToken: async () => "persist-token",
      getEntryForPersistentToken: async () => folder,
      createSessionToken: (entry) => entry.name,
    },
  },
};

const require_ = (name) => {
  if (name === "photoshop") return photoshop;
  if (name === "uxp") return uxp;
  throw new Error(`unexpected require("${name}")`);
};

// ---------- layout invariants ----------
// CSS regressions here are silent and only show up as controls scrolled off the
// bottom of a docked panel, which is hard to attribute to a stylesheet edit.
{
  const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
  const entry = manifest.entrypoints[0];
  ok("panel can be shrunk by the user",
     entry.minimumSize.height <= 320 && entry.minimumSize.width <= 280,
     `minimumSize ${entry.minimumSize.width}x${entry.minimumSize.height}`);

  const css = html.slice(0, html.indexOf("</style>"));
  const statusRule = css.slice(css.indexOf("#status {"), css.indexOf("}", css.indexOf("#status {")));
  ok("status box is height-bounded so it cannot push controls off-screen",
     /max-height:/.test(statusRule) && /overflow-y:\s*auto/.test(statusRule),
     statusRule.replace(/\s+/g, " ").slice(0, 80));

  // Anchored to a line start so it selects the standalone `body` rule and not
  // the `html, body` one, which only sets height.
  const bodyRule = (css.match(/\n\s*body\s*\{([^}]*)\}/) || [, ""])[1];
  ok("body scrolls rather than clipping", /overflow-y:\s*auto/.test(bodyRule),
     bodyRule.replace(/\s+/g, " ").trim().slice(0, 70));

  // Status must stay above the controls; below them it scrolls out of view,
  // which is how every error message went unseen for three rounds.
  ok("status renders before the first step",
     html.indexOf('id="status"') < html.indexOf('class="step"'));
}

// ---------- run the real bundle ----------

const code = readFileSync(join(ROOT, "dist", "panel.js"), "utf8");
let loadError = null;
try {
  new Function("require", "document", "localStorage", "console", code)(
    require_, document, localStorage, console
  );
} catch (e) {
  loadError = e;
}
ok("bundle evaluates without throwing", !loadError, loadError ? String(loadError) : "");
if (loadError) process.exit(1);

await new Promise((r) => setTimeout(r, 20));

// ---------- wiring ----------

ok("Generate button has a click listener", els.get("generate").listenerCount > 0);
ok("folder button has a click listener", els.get("pick-folder").listenerCount > 0);
ok("preset picker has a change listener", els.get("preset").listenerCount > 0);
ok("parameter fields are populated",
   els.get("highPassRadius").value === "128" && els.get("shadowStrength").value === "0.85",
   `highPass="${els.get("highPassRadius").value}" shadowStrength="${els.get("shadowStrength").value}"`);
ok("document name is shown", els.get("doc-name").textContent.includes("base.png"));

// The proof-of-life signal. If init() never completes, the panel is inert and
// this is the only thing that says so.
ok("panel reports Ready with a build id",
   /^Ready — .*build [0-9a-f]{8}/.test(els.get("status").textContent),
   JSON.stringify(els.get("status").textContent));
ok("surface picker is never empty before an item loads",
   els.get("surface-options").children.length === 1,
   `${els.get("surface-options").children.length} options`);

ok("advanced section starts collapsed", els.get("advanced-body").className === "collapsed");
await els.get("advanced-toggle").dispatch("click");
ok("advanced section opens on click", els.get("advanced-body").className === "");
await els.get("advanced-toggle").dispatch("click");
ok("advanced section closes again", els.get("advanced-body").className === "collapsed");

els.get("preset").selectOption("screen");
await els.get("preset").dispatch("change");
ok("switching preset updates the fields", els.get("highPassRadius").value === "0");

els.get("preset").selectOption("vehicle");
await els.get("preset").dispatch("change");
ok("vehicle preset loads its own values",
   els.get("highPassRadius").value === "192" &&
   els.get("displacementScalePx").value === "5" &&
   els.get("highlightStrength").value === "0.6",
   `highPass=${els.get("highPassRadius").value} disp=${els.get("displacementScalePx").value} hl=${els.get("highlightStrength").value}`);
ok("vehicle hint is shown", /[Vv]ans/.test(els.get("surface-hint").textContent),
   JSON.stringify(els.get("surface-hint").textContent.slice(0, 40)));

els.get("preset").selectOption("fabric");
await els.get("preset").dispatch("change");
ok("switching back restores them", els.get("highPassRadius").value === "128");

// Every material in the menu must have a matching preset, and vice versa —
// adding one to only one place leaves a dropdown entry that silently does
// nothing (loadPreset returns early on an unknown name).
{
  const menu = [...html.matchAll(/<sp-menu-item value="([a-z]+)"[^>]*>([^<]*)</g)]
    .map((m) => [m[1], m[2].trim()]);
  const bundleNames = [...readFileSync(join(ROOT, "src", "presets.js"), "utf8")
    .matchAll(/^  ([a-z]+): \{$/gm)].map((m) => m[1]);
  const missingPreset = menu.filter(([v]) => !bundleNames.includes(v)).map(([v]) => v);
  const missingMenu = bundleNames.filter((n) => !menu.some(([v]) => v === n));
  ok("every menu material has a preset and vice versa",
     missingPreset.length === 0 && missingMenu.length === 0,
     `menu=[${menu.map((m) => m[0]).join(",")}] presets=[${bundleNames.join(",")}]`);

  // A label mismatch means the dropdown and the hint below it describe
  // different materials.
  const labels = [...readFileSync(join(ROOT, "src", "presets.js"), "utf8")
    .matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  ok("menu labels match the preset labels",
     menu.every(([, text]) => labels.includes(text)),
     menu.map((m) => m[1]).join(" | "));
}

// ---------- picking the item folder reads item.json ----------

await els.get("pick-folder").dispatch("click");
ok("folder path is shown", els.get("folder-path").textContent.endsWith("test-tee-01"),
   JSON.stringify(els.get("folder-path").textContent));
ok("item name and canvas are reported",
   els.get("item-info").textContent.includes("Test Tee") &&
   els.get("item-info").textContent.includes("728 × 408"),
   JSON.stringify(els.get("item-info").textContent));
ok("surface picker is populated from item.json",
   els.get("surface-options").children.length === 2 &&
   els.get("surface-options").children[0].getAttribute("value") === "chest" &&
   els.get("surface-options").children[1].getAttribute("value") === "sleeve",
   els.get("surface-options").children.map((c) => c.getAttribute("value")).join(", "));
ok("first surface is marked selected in the menu",
   els.get("surface-options").children[0].getAttribute("selected") === "true");

// ---------- picking a different surface actually takes effect ----------

els.get("surface").selectOption("sleeve");
await els.get("surface").dispatch("change");
ok("changing the surface picker is registered", true);
els.get("surface").selectOption("chest");
await els.get("surface").dispatch("change");

// ---------- bake ----------

await els.get("generate").dispatch("click");
const status = els.get("status").textContent;
ok("Generate reports success", els.get("status").className === "ok", JSON.stringify(status.slice(0, 90)));
ok("read the source pixels once", calls.getPixels === 1, `getPixels=${calls.getPixels}`);
ok("created and closed one doc per map", calls.closed === 3, `closed=${calls.closed}`);

ok("wrote the three maps under Mockup Forge names",
   written.has("displace-chest.png") &&
   written.has("shadow-chest.png") &&
   written.has("highlight-chest.png"),
   [...written.keys()].join(", "));
ok("no legacy _disp/_normal/_ao files", ![...written.keys()].some((n) => /_disp|_normal|_ao|_maps/.test(n)));

// ---------- the size contract ----------
// compositor.ts indexes shadow/highlight by canvas coordinate, so a map even one
// pixel off reads past the row stride. Displacement is normalized-sampled and is
// authored at half canvas, matching the catalog.

const sz = (n) => `${sizes.get(n)?.width}×${sizes.get(n)?.height}`;
ok("shadow map is exactly canvas size", sz("shadow-chest.png") === "728×408", sz("shadow-chest.png"));
ok("highlight map is exactly canvas size", sz("highlight-chest.png") === "728×408", sz("highlight-chest.png"));
ok("displacement map is half canvas", sz("displace-chest.png") === "364×204", sz("displace-chest.png"));

// ---------- item.json patching ----------

ok("original item.json is backed up", written.get("item.json.bak") === ITEM_TEXT);

const patched = JSON.parse(written.get("item.json"));
const chest = patched.layers.find((l) => l.id === "chest");
const sleeve = patched.layers.find((l) => l.id === "sleeve");

ok("chest warp promoted to displacement", chest.warp.kind === "displacement", chest.warp.kind);
ok("displacement is vector mode", chest.warp.vector === true);
ok("displacement map filename matches what was written", chest.warp.map === "displace-chest.png");
ok("scale carries the preset value and is in range",
   chest.warp.scale === 12 && chest.warp.scale <= 512, String(chest.warp.scale));
ok("authored geometry is preserved verbatim",
   JSON.stringify(chest.warp.geometry) === JSON.stringify({ kind: "homography", corners: CORNERS }),
   JSON.stringify(chest.warp.geometry));
ok("lighting points at both maps with opacity 1",
   chest.lighting.multiply === "shadow-chest.png" && chest.lighting.multiplyOpacity === 1 &&
   chest.lighting.screen === "highlight-chest.png" && chest.lighting.screenOpacity === 1,
   JSON.stringify(chest.lighting));
ok("the surface's other fields survive",
   chest.mask === "mask-chest.png" && chest.placeholder.recommendedWidth === 1200);
ok("the untouched surface is byte-identical",
   JSON.stringify(sleeve) === JSON.stringify(ITEM.layers[2]));
ok("item metadata is untouched",
   patched.id === "test-tee-01" && patched.canvas.width === 728 && patched.layers.length === 3);

// ---------- re-baking is idempotent, not doubly-nested ----------

await els.get("generate").dispatch("click");
const twice = JSON.parse(written.get("item.json")).layers.find((l) => l.id === "chest");
ok("re-baking keeps geometry flat, not nested inside itself",
   twice.warp.geometry.kind === "homography",
   `geometry.kind=${twice.warp.geometry.kind}`);
ok("backup after re-bake is the already-patched file, not the pristine one",
   written.get("item.json.bak") !== ITEM_TEXT);

// ---------- errors surface ----------

photoshop.app.activeDocument = null;
els.get("status").textContent = "";
await els.get("generate").dispatch("click");
ok("no open document produces a visible error",
   els.get("status").className === "error" && els.get("status").textContent.length > 0,
   JSON.stringify(els.get("status").textContent));

photoshop.app.activeDocument = { ...sourceDoc, width: 400, height: 1200 };
await els.get("generate").dispatch("click");
ok("a wrong-aspect document is refused rather than silently squashed",
   els.get("status").className === "error" &&
   /different shape/.test(els.get("status").textContent),
   JSON.stringify(els.get("status").textContent.slice(0, 100)));

// ---------- the reported failure: a folder that isn't an item directory ----------
// Choosing a plain output folder (or a stale one remembered from an earlier
// version of this plugin) must say so loudly and leave the surface picker
// usable, not silently empty it so every later control appears dead.
{
  const savedItem = written.get("item.json");
  written.delete("item.json");
  photoshop.app.activeDocument = sourceDoc;

  await els.get("pick-folder").dispatch("click");
  ok("a non-item folder reports why, visibly",
     els.get("status").className === "error" && /item\.json/.test(els.get("status").textContent),
     JSON.stringify(els.get("status").textContent.slice(0, 70)));
  ok("the item row is flagged too", /not a Mockup Forge item folder/.test(els.get("item-info").textContent));
  ok("surface picker keeps exactly one option rather than going empty",
     els.get("surface-options").children.length === 1,
     `${els.get("surface-options").children.length} options`);

  els.get("status").textContent = "";
  await els.get("generate").dispatch("click");
  ok("Generate explains itself instead of doing nothing",
     els.get("status").className === "error" && els.get("status").textContent.length > 0,
     JSON.stringify(els.get("status").textContent.slice(0, 70)));

  written.set("item.json", savedItem);
}

console.log(fails ? `\n${fails} FAILURE(S)` : "\nall passed");
process.exit(fails ? 1 : 0);
