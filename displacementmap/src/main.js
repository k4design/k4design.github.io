// This file is bundled into a CLASSIC script by tools/build.mjs — it is never
// loaded as an ES module by the panel. That indirection exists because UXP does
// not inject require() into ES modules and its module loading fails silently:
// the HTML renders, no JavaScript runs, and every control is dead with no error.
// See README, "Why there's a build step".
import photoshop from "photoshop";

import { PRESETS, PARAM_KEYS } from "./presets.js";
import { bakeMaps, inspectItemFolder } from "./pipeline.js";
import { pickOutputFolder, getSavedOutputFolder, getSavedOutputPath } from "./export.js";

const { app, core } = photoshop;

const el = (id) => document.getElementById(id);

const presetPicker = el("preset");
const surfaceHint = el("surface-hint");
const surfacePicker = el("surface");
const surfaceOptions = el("surface-options");
const itemInfo = el("item-info");
const generateBtn = el("generate");
const pickFolderBtn = el("pick-folder");
const resetBtn = el("reset-preset");
const advancedToggle = el("advanced-toggle");
const advancedBody = el("advanced-body");
const folderPathLabel = el("folder-path");
const docNameLabel = el("doc-name");
const statusEl = el("status");
const yUpCheckbox = el("normalYUp");

let outputFolder = null;
let item = null; // parsed item.json for the chosen folder
let busy = false;
// Tracked by hand because sp-picker's `value` is GETTER-ONLY in UXP: assigning
// to it throws "Cannot set property value of [object Object] which has only a
// getter", which aborts whatever handler was running. Selection is expressed by
// the `selected` attribute on menu items, and read back on change.
let selectedSurfaceId = "";

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = kind;
}

function currentPresetName() {
  return presetPicker.value || "fabric";
}

/** Push a preset's values into the parameter fields. */
function loadPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  for (const key of PARAM_KEYS) {
    el(key).value = String(preset[key]);
  }
  yUpCheckbox.checked = preset.normalYUp;
  surfaceHint.textContent = preset.hint;
}

/** Read the (possibly hand-edited) fields back out, falling back to the preset. */
function readParams(name) {
  const preset = PRESETS[name];
  const params = { normalYUp: yUpCheckbox.checked };
  for (const key of PARAM_KEYS) {
    const raw = Number(el(key).value);
    params[key] = Number.isFinite(raw) && raw >= 0 ? raw : preset[key];
  }
  return params;
}

function showFolder(path) {
  folderPathLabel.textContent = path || "not set";
  folderPathLabel.className = path ? "" : "unset";
}

/** Keep the "which document will be baked" line honest. */
function refreshDocName() {
  const doc = app.activeDocument;
  docNameLabel.textContent = doc
    ? `${doc.name} — ${doc.width} × ${doc.height}`
    : "No document open";
}

/**
 * Rebuild the surface picker from the item's own layer ids, so the output
 * filenames can't be mistyped into names the renderer will never look for.
 */
/** Remove every option. Uses removeChild rather than innerHTML, which is one
 *  fewer bet on UXP's partial DOM. */
function clearSurfaceOptions() {
  while (surfaceOptions.firstChild) surfaceOptions.removeChild(surfaceOptions.firstChild);
}

function addSurfaceOption(value, label, selected) {
  const option = document.createElement("sp-menu-item");
  option.setAttribute("value", value);
  if (selected) option.setAttribute("selected", "true");
  option.textContent = label;
  surfaceOptions.appendChild(option);
}

/** A picker with zero options silently does nothing when clicked, which reads as
 *  a broken control. There is always exactly one option. */
function setSurfacePlaceholder(text) {
  clearSurfaceOptions();
  addSurfaceOption("", text, true);
  selectedSurfaceId = "";
}

function loadItem(info) {
  item = info;
  clearSurfaceOptions();
  for (const [i, s] of info.surfaces.entries()) {
    addSurfaceOption(s.id, s.label === s.id ? s.id : `${s.label} (${s.id})`, i === 0);
  }
  selectedSurfaceId = info.surfaces[0].id;

  const doc = app.activeDocument;
  const mismatch =
    doc && (doc.width !== info.canvas.width || doc.height !== info.canvas.height)
      ? `  ⚠ open document is ${doc.width} × ${doc.height}`
      : "";
  itemInfo.textContent =
    `${info.name} — canvas ${info.canvas.width} × ${info.canvas.height}, ` +
    `${info.surfaces.length} surface${info.surfaces.length === 1 ? "" : "s"}${mismatch}`;
}

function clearItem(message) {
  item = null;
  setSurfacePlaceholder("— no item loaded —");
  itemInfo.textContent = message || "";
}

// Disclosure is hand-rolled because UXP's HTML subset doesn't dependably include
// <details>/<summary>.
advancedToggle.addEventListener("click", () => {
  const collapsed = advancedBody.className === "collapsed";
  advancedBody.className = collapsed ? "" : "collapsed";
  advancedToggle.textContent = `${collapsed ? "▾" : "▸"} Advanced parameters`;
});

presetPicker.addEventListener("change", () => loadPreset(currentPresetName()));

// Read the selection back on change; the getter works even though the setter
// doesn't. Falls back to what we already tracked if the value comes back empty.
surfacePicker.addEventListener("change", () => {
  const v = surfacePicker.value;
  if (typeof v === "string" && v) selectedSurfaceId = v;
});

resetBtn.addEventListener("click", () => {
  loadPreset(currentPresetName());
  setStatus("Parameters reset to preset defaults.");
});

// Cheap way to keep the header current without polling: refresh whenever the
// pointer enters the panel, which always precedes the user doing anything.
document.body.addEventListener("pointerenter", refreshDocName);

pickFolderBtn.addEventListener("click", async () => {
  try {
    const folder = await pickOutputFolder();
    if (!folder) return;
    outputFolder = folder;
    showFolder(folder.nativePath);
    setStatus("");
    try {
      loadItem(await inspectItemFolder(folder));
      setStatus(`Loaded ${item.name}. Pick a surface, then Generate.`, "ok");
    } catch (e) {
      clearItem("⚠ not a Mockup Forge item folder");
      setStatus(e.message || String(e), "error");
    }
  } catch (e) {
    setStatus(`Could not set the item folder: ${e.message || e}`, "error");
  }
});

generateBtn.addEventListener("click", async () => {
  if (busy) return;

  refreshDocName();
  if (!app.activeDocument) {
    setStatus("Open the item's base.png in Photoshop first.", "error");
    return;
  }

  // The folder picker cannot open inside a modal scope, so resolve it up front.
  if (!outputFolder) {
    try {
      outputFolder = await pickOutputFolder();
    } catch (e) {
      setStatus(`Could not set the item folder: ${e.message || e}`, "error");
      return;
    }
    if (!outputFolder) {
      setStatus("Pick a Mockup Forge item folder, then try again.", "error");
      return;
    }
    showFolder(outputFolder.nativePath);
    try {
      loadItem(await inspectItemFolder(outputFolder));
    } catch (e) {
      clearItem("⚠ not a Mockup Forge item folder");
      setStatus(e.message || String(e), "error");
      return;
    }
  }

  if (!item) {
    setStatus("That folder has no readable item.json — pick an item directory.", "error");
    return;
  }

  const surfaceId = selectedSurfaceId || item.surfaces[0].id;
  const presetName = currentPresetName();
  const params = readParams(presetName);

  busy = true;
  generateBtn.disabled = true;
  try {
    const result = await core.executeAsModal(
      () =>
        bakeMaps({
          folder: outputFolder,
          surfaceId,
          presetName,
          params,
          onProgress: (msg) => setStatus(msg, "busy"),
        }),
      { commandName: "Bake Mockup Forge Maps" }
    );
    const warn = result.warnings.length ? `\n${result.warnings.join("\n")}` : "";
    setStatus(
      `Done — ${result.item}, surface "${surfaceId}"\n${result.files.join("\n")}${warn}`,
      "ok"
    );
  } catch (e) {
    // Without this the failure mode is a button that appears to do nothing.
    setStatus(`Failed: ${e.message || e}`, "error");
    console.error(e);
  } finally {
    busy = false;
    generateBtn.disabled = false;
  }
});

// BUILD_ID is injected by tools/build.mjs into the bundle preamble.
const buildId = typeof BUILD_ID === "string" ? BUILD_ID : "dev";

(async function init() {
  loadPreset(currentPresetName());
  refreshDocName();
  showFolder(getSavedOutputPath());
  let startupProblem = null;
  try {
    outputFolder = await getSavedOutputFolder();
    showFolder(outputFolder ? outputFolder.nativePath : null);
    if (outputFolder) loadItem(await inspectItemFolder(outputFolder));
    else clearItem("");
  } catch (e) {
    clearItem("⚠ not a Mockup Forge item folder");
    startupProblem = e.message || String(e);
  }
  // Replaces the boot message. Reaching this line proves every listener above
  // was registered, so "Ready" means the panel is genuinely live — not merely
  // rendered. Compare the build id against `node tools/build.mjs` to confirm
  // Photoshop reloaded rather than kept an old bundle.
  if (startupProblem) {
    setStatus(`${startupProblem}\n\nRemembered folder: ${getSavedOutputPath() || "none"}`, "error");
  } else if (item) {
    setStatus(`Ready — ${item.name}, build ${buildId}`, "ok");
  } else {
    setStatus(`Ready — choose a Mockup Forge item folder (build ${buildId})`);
  }
})();
