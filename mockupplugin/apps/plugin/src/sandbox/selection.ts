import { titleize, type RenderTarget, type RenderTargetSurface } from '@mf/shared';
import {
  collectBound,
  findBoundAncestor,
  readBinding,
  readPlaceholder,
  readSolidFill,
  type Binding,
} from './nodes.js';
import { HINT_LAYER_NAME } from './import.js';

export interface ResolvedSelection {
  targets: RenderTarget[];
  foreignCount: number;
}

type BoundNode = { node: BaseNode; binding: Binding };

/**
 * Resolves whatever is selected into renderable instances.
 *
 * The user may select the group, the mockup frame, a design frame, a colour
 * swatch, or something nested inside any of those — all of them must resolve to
 * the same instance. Resolution walks up to the outermost bound ancestor and
 * collects that subtree, which keeps duplicated groups separate: a duplicate
 * shares its original's instance guid, but lives in its own subtree.
 */
export async function resolveSelection(): Promise<ResolvedSelection> {
  const selection = figma.currentPage.selection;
  let foreignCount = 0;

  const subtreeRoots: BaseNode[] = [];
  for (const node of selection) {
    const bound = findBoundAncestor(node);
    if (!bound) {
      foreignCount += 1;
      continue;
    }
    const root = outermostBound(bound.node);
    if (!subtreeRoots.some((existing) => existing === root)) subtreeRoots.push(root);
  }

  const byGuid = new Map<string, BoundNode[]>();
  for (const root of subtreeRoots) collectBound(root, byGuid);

  const targets: RenderTarget[] = [];
  for (const [instanceGuid, nodes] of byGuid) {
    const target = await buildTarget(instanceGuid, nodes);
    if (target) targets.push(target);
  }

  return { targets, foreignCount };
}

/** Look up an instance anywhere on the current page, by guid. */
export async function findInstance(instanceGuid: string): Promise<RenderTarget | null> {
  const byGuid = new Map<string, BoundNode[]>();
  collectBound(figma.currentPage, byGuid);
  const nodes = byGuid.get(instanceGuid);
  if (!nodes) return null;
  return buildTarget(instanceGuid, nodes);
}

/** The item frame for an instance — the node whose fill a render replaces. */
export function findItemNode(instanceGuid: string): SceneNode | null {
  const byGuid = new Map<string, BoundNode[]>();
  collectBound(figma.currentPage, byGuid);
  const nodes = byGuid.get(instanceGuid) ?? [];
  const item = nodes.find((n) => n.binding.role === 'item');
  return item && 'fills' in item.node ? (item.node as SceneNode) : null;
}

function outermostBound(node: BaseNode): BaseNode {
  let best = node;
  let current: BaseNode | null = node.parent;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if (readBinding(current)) best = current;
    current = current.parent;
  }
  return best;
}

async function buildTarget(instanceGuid: string, nodes: BoundNode[]): Promise<RenderTarget | null> {
  const item = nodes.find((n) => n.binding.role === 'item');
  const designs = nodes.filter((n) => n.binding.role === 'design');
  if (!item || designs.length === 0) return null;

  const surfaces: RenderTargetSurface[] = [];
  for (const design of designs) {
    const surfaceId = design.binding.surfaceId;
    if (!surfaceId || !('width' in design.node)) continue;
    const frame = design.node as FrameNode;
    const placeholder = readPlaceholder(design.node);
    if (!placeholder) continue;

    const width = Math.round(frame.width);
    const height = Math.round(frame.height);
    surfaces.push({
      surfaceId,
      designNodeId: frame.id,
      width,
      height,
      aspect: height > 0 ? width / height : 0,
      expectedAspect: placeholder.aspect,
      // Export at the placeholder's recommended resolution, but never below the
      // frame's own size — downscaling a big frame is fine, upscaling a small
      // one just wastes bytes.
      exportWidth: Math.max(1, Math.min(4096, placeholder.recommendedWidth)),
      looksEmpty: looksEmpty(frame),
    });
  }

  if (surfaces.length === 0) return null;

  const colorize: Record<string, string> = {};
  for (const node of nodes) {
    if (node.binding.role !== 'colorize' || !node.binding.colorizeId) continue;
    const hex = readSolidFill(node.node as SceneNode);
    if (hex) colorize[node.binding.colorizeId] = hex;
  }

  return {
    instanceGuid,
    itemId: item.binding.itemId,
    itemName: titleize(item.binding.itemId),
    itemNodeId: item.node.id,
    surfaces,
    colorize,
  };
}

/**
 * True when a design frame holds nothing but the placeholder hint, so the UI can
 * warn before rendering an empty surface.
 */
function looksEmpty(frame: FrameNode): boolean {
  return frame.children.every((child) => child.name === HINT_LAYER_NAME || child.visible === false);
}
