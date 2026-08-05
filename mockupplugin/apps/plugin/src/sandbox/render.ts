import type { ExportedSurface, ExportedTarget, RenderTarget } from '@mf/shared';
import { PD } from '@mf/shared';
import { base64ToBytes, bytesToBase64 } from './nodes.js';
import { findInstance, findItemNode } from './selection.js';
import { HINT_LAYER_NAME } from './import.js';

/**
 * Exporting design frames and applying finished renders.
 *
 * Both halves are deliberately conservative about the user's document: the
 * export hides the hint layer and puts it back, and applying a render only ever
 * rewrites the item frame's `fills` array. No user node is created, moved or
 * deleted at any point.
 */

export async function exportDesigns(instanceGuids: string[]): Promise<ExportedTarget[]> {
  const out: ExportedTarget[] = [];

  for (const guid of instanceGuids) {
    const target = await findInstance(guid);
    if (!target) continue;
    out.push({ ...target, surfaces: await exportSurfaces(target) });
  }

  return out;
}

async function exportSurfaces(target: RenderTarget): Promise<ExportedSurface[]> {
  const surfaces: ExportedSurface[] = [];

  for (const surface of target.surfaces) {
    const node = await figma.getNodeByIdAsync(surface.designNodeId);
    if (!node || !('exportAsync' in node)) continue;
    const frame = node as FrameNode;

    // The hint is guidance for the designer, not part of the artwork.
    const hints = frame.children.filter((child) => child.name === HINT_LAYER_NAME && child.visible);
    for (const hint of hints) hint.visible = false;

    try {
      const bytes = await frame.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: surface.exportWidth },
      });
      surfaces.push({ ...surface, design: bytesToBase64(bytes) });
    } finally {
      for (const hint of hints) hint.visible = true;
    }
  }

  return surfaces;
}

export interface ApplyResult {
  itemNodeId: string;
}

/**
 * Swaps in a finished render. The image is placed with `FILL` scale mode, so a
 * frame the user has resized still shows the whole mockup at the right ratio,
 * and the frame is nudged back to the render's aspect ratio if it has drifted.
 */
export async function applyRender(
  instanceGuid: string,
  pngBase64: string,
  size: { width: number; height: number },
  renderId: string,
): Promise<ApplyResult> {
  const node = findItemNode(instanceGuid);
  if (!node) {
    throw new Error(
      'That mockup is no longer on this page. Re-import it, or switch to the page holding it.',
    );
  }

  const image = figma.createImage(base64ToBytes(pngBase64));

  if (!('fills' in node)) {
    throw new Error('The mockup frame cannot hold an image fill any more.');
  }

  const previousFills = node.fills;
  const preserved =
    previousFills !== figma.mixed && Array.isArray(previousFills)
      ? previousFills.filter((paint) => paint.type !== 'IMAGE')
      : [];

  node.fills = [
    ...preserved,
    { type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL', opacity: 1, visible: true },
  ];

  // Keep the frame's own ratio honest so the render is not cropped by FILL.
  if (size.width > 0 && size.height > 0 && 'resize' in node) {
    const target = size.width / size.height;
    const current = node.height > 0 ? node.width / node.height : target;
    if (Math.abs(current - target) / target > 0.005) {
      (node as FrameNode).resize(node.width, Math.round(node.width / target));
    }
  }

  node.setPluginData(PD.lastRenderId, renderId);
  return { itemNodeId: node.id };
}
