import {
  colorizeSwatchName,
  designFrameName,
  instanceGroupName,
  itemFrameName,
  PLUGIN_PREFIX,
  type ItemDetail,
} from '@mf/shared';
import {
  base64ToBytes,
  hexToRgb,
  makeGuid,
  writeBinding,
  writeCanvasSize,
  writePlaceholder,
} from './nodes.js';

/**
 * Placing an item on the canvas.
 *
 * The layout is: the mockup frame on the left, its design frames stacked to the
 * right, and any colour swatches below those. Everything is grouped so the user
 * can drag one object, and every node carries the pluginData that binds it back
 * to the item.
 */

/** Longest edge of the item frame as placed, in canvas pixels. */
const ITEM_WORKING_SIZE = 900;
/** Width of each design frame as placed. */
const DESIGN_WIDTH = 320;
const GAP = 48;
const SWATCH = 44;

/** 32x32 two-tone checkerboard, tiled as the design frame's backdrop. */
const CHECKERBOARD_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABlBMVEXo6Oj39/ecsLB5AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGklEQVR42mNgRAMM6GBUwYhSMBouowqQFAAAJFwCAd/mpXUAAAAASUVORK5CYII=';

export const HINT_LAYER_NAME = `${PLUGIN_PREFIX} Hint`;

export interface ImportResult {
  instanceGuid: string;
  itemNodeId: string;
}

export async function importItem(detail: ItemDetail, previewBase64: string): Promise<ImportResult> {
  const instanceGuid = makeGuid(detail.id);

  const image = figma.createImage(base64ToBytes(previewBase64));
  const aspect = detail.canvas.width / detail.canvas.height;
  const itemWidth = aspect >= 1 ? ITEM_WORKING_SIZE : ITEM_WORKING_SIZE * aspect;
  const itemHeight = aspect >= 1 ? ITEM_WORKING_SIZE / aspect : ITEM_WORKING_SIZE;

  const itemFrame = figma.createFrame();
  itemFrame.name = itemFrameName(detail.id);
  itemFrame.resize(Math.round(itemWidth), Math.round(itemHeight));
  itemFrame.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  itemFrame.clipsContent = true;
  itemFrame.cornerRadius = 4;
  writeBinding(itemFrame, { role: 'item', itemId: detail.id, instanceGuid });
  writeCanvasSize(itemFrame, detail.canvas);

  // Drop the group at the viewport centre so it lands where the user is looking.
  const origin = {
    x: Math.round(figma.viewport.center.x - (itemWidth + GAP + DESIGN_WIDTH) / 2),
    y: Math.round(figma.viewport.center.y - itemHeight / 2),
  };
  itemFrame.x = origin.x;
  itemFrame.y = origin.y;
  figma.currentPage.appendChild(itemFrame);

  const created: SceneNode[] = [itemFrame];

  // Hint text needs a font resolved up front; if the font is unavailable the
  // import still succeeds, just without the hint label.
  let fontLoaded = true;
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  } catch {
    fontLoaded = false;
  }

  let cursorY = origin.y;
  const designX = origin.x + Math.round(itemWidth) + GAP;

  for (const surface of detail.surfaces) {
    const height = Math.round(DESIGN_WIDTH / surface.placeholder.aspect);
    const frame = figma.createFrame();
    frame.name = designFrameName(detail.id, surface.id);
    frame.resize(DESIGN_WIDTH, Math.max(1, height));
    frame.x = designX;
    frame.y = cursorY;
    frame.clipsContent = true;
    frame.cornerRadius = 2;

    const checker = figma.createImage(base64ToBytes(CHECKERBOARD_PNG));
    // A tiled image fill, not child rectangles: the user's artwork goes inside
    // this frame, so the backdrop must not occupy the layer list.
    frame.fills = [
      { type: 'IMAGE', imageHash: checker.hash, scaleMode: 'TILE', scalingFactor: 0.5 },
    ];

    writeBinding(frame, {
      role: 'design',
      itemId: detail.id,
      instanceGuid,
      surfaceId: surface.id,
    });
    writePlaceholder(frame, surface.placeholder);
    writeCanvasSize(frame, detail.canvas);

    if (fontLoaded) {
      const hint = figma.createText();
      hint.fontName = { family: 'Inter', style: 'Medium' };
      hint.fontSize = 12;
      hint.characters = surface.placeholder.hint || 'Place your design here, then click Render';
      hint.textAlignHorizontal = 'CENTER';
      hint.textAutoResize = 'HEIGHT';
      hint.fills = [{ type: 'SOLID', color: { r: 0.42, g: 0.45, b: 0.5 } }];
      hint.name = HINT_LAYER_NAME;
      hint.resize(Math.max(40, DESIGN_WIDTH - 48), hint.height);
      frame.appendChild(hint);
      hint.x = 24;
      hint.y = Math.max(8, Math.round((frame.height - hint.height) / 2));
      // Locked so it cannot be nudged while positioning artwork. It is hidden
      // automatically during export, so it never reaches a render.
      hint.locked = true;
    }

    figma.currentPage.appendChild(frame);
    created.push(frame);
    cursorY += frame.height + 24;
  }

  if (detail.colorize.length > 0) {
    let swatchX = designX;
    const swatchY = cursorY + 8;
    for (const colour of detail.colorize) {
      const swatch = figma.createRectangle();
      swatch.name = colorizeSwatchName(detail.id, colour.id);
      swatch.resize(SWATCH, SWATCH);
      swatch.x = swatchX;
      swatch.y = swatchY;
      swatch.cornerRadius = 6;
      swatch.fills = [{ type: 'SOLID', color: hexToRgb(colour.default) }];
      swatch.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.82 } }];
      swatch.strokeWeight = 1;
      writeBinding(swatch, {
        role: 'colorize',
        itemId: detail.id,
        instanceGuid,
        colorizeId: colour.id,
      });
      figma.currentPage.appendChild(swatch);
      created.push(swatch);
      swatchX += SWATCH + 12;
    }
  }

  // Grouping keeps the mockup and its inputs together when dragged. The group
  // itself carries the binding too, so selecting it resolves the instance.
  const group = figma.group(created, figma.currentPage);
  group.name = instanceGroupName(detail.id);
  writeBinding(group, { role: 'group', itemId: detail.id, instanceGuid });
  writeCanvasSize(group, detail.canvas);

  figma.currentPage.selection = detail.surfaces.length > 0 ? [created[1] ?? itemFrame] : [itemFrame];
  figma.viewport.scrollAndZoomIntoView([group]);

  return { instanceGuid, itemNodeId: itemFrame.id };
}
