// See imaging.js — require() is unavailable inside UXP ES modules.
import photoshop from "photoshop";
import uxp from "uxp";
import { createDocumentFromRgb } from "./imaging.js";

const { action } = photoshop;
const fs = uxp.storage.localFileSystem;

const FOLDER_TOKEN_KEY = "dispmap.outputFolderToken";
const FOLDER_PATH_KEY = "dispmap.outputFolderPath";

/**
 * Show the folder picker and remember the choice across sessions.
 * MUST be called outside executeAsModal — file pickers can't open inside a
 * modal scope.
 * @returns {Promise<Folder|null>}
 */
export async function pickOutputFolder() {
  const folder = await fs.getFolder();
  if (!folder) return null;
  const token = await fs.createPersistentToken(folder);
  localStorage.setItem(FOLDER_TOKEN_KEY, token);
  localStorage.setItem(FOLDER_PATH_KEY, folder.nativePath);
  return folder;
}

/** @returns {Promise<Folder|null>} the previously chosen folder, if still valid */
export async function getSavedOutputFolder() {
  const token = localStorage.getItem(FOLDER_TOKEN_KEY);
  if (!token) return null;
  try {
    return await fs.getEntryForPersistentToken(token);
  } catch (e) {
    // Folder was moved, deleted, or the token was invalidated — forget it.
    localStorage.removeItem(FOLDER_TOKEN_KEY);
    localStorage.removeItem(FOLDER_PATH_KEY);
    return null;
  }
}

export function getSavedOutputPath() {
  return localStorage.getItem(FOLDER_PATH_KEY);
}

/**
 * Write one map as a PNG.
 *
 * UXP has no dependable image encoder, so the buffer round-trips through a
 * throwaway Photoshop document which PS then saves as PNG.
 *
 * @param {Folder} folder destination
 * @param {string} filename
 * @param {Uint8Array} rgb chunky RGB
 * @param {number} width
 * @param {number} height
 * @param {{width: number, height: number}} [targetSize] resample to exactly this
 *   before saving. Mockup Forge indexes shadow/highlight maps by canvas
 *   coordinate (compositor.ts:127-143), so those must match the item's canvas
 *   exactly — a map even one pixel off reads past the row stride and skews.
 *   Photoshop's own resampler does the work rather than a hand-rolled one.
 */
export async function writeMap(folder, filename, rgb, width, height, targetSize) {
  const doc = await createDocumentFromRgb(rgb, width, height, filename);
  try {
    if (targetSize && (targetSize.width !== width || targetSize.height !== height)) {
      await action.batchPlay(
        [
          {
            _obj: "imageSize",
            width: { _unit: "pixelsUnit", _value: targetSize.width },
            height: { _unit: "pixelsUnit", _value: targetSize.height },
            constrainProportions: false,
            interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicSharper" },
          },
        ],
        { synchronousExecution: false }
      );
    }
    // Creating the entry first is what grants Photoshop write access to the path.
    const entry = await folder.createEntry(filename, { overwrite: true });
    const token = await fs.createSessionToken(entry);
    await action.batchPlay(
      [
        {
          _obj: "save",
          as: {
            _obj: "PNGFormat",
            method: { _enum: "PNGMethod", _value: "quick" },
            PNGInterlaceType: { _enum: "PNGInterlaceType", _value: "PNGInterlaceNone" },
            compression: 6,
          },
          in: { _path: token, _kind: "local" },
          copy: true,
          lowerCase: true,
        },
      ],
      { synchronousExecution: false }
    );
  } finally {
    await doc.closeWithoutSaving();
  }
}

/** Read a UTF-8 text file from a folder, or null if it isn't there. */
export async function readTextFile(folder, filename) {
  try {
    const entry = await folder.getEntry(filename);
    const text = await entry.read();
    // A non-string read is a missing/unreadable file, not content. Passing it
    // through produced a baffling "undefined is not valid JSON" instead of the
    // actual problem.
    return typeof text === "string" ? text : null;
  } catch (e) {
    return null;
  }
}

/** Write a UTF-8 text file into a folder, overwriting. */
export async function writeTextFile(folder, filename, contents) {
  const entry = await folder.createEntry(filename, { overwrite: true });
  await entry.write(contents);
}
