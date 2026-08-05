import { NODE_ROLES, PD, PD_VERSION, type NodeRole, type Placeholder } from '@mf/shared';

/**
 * pluginData access and the base64 bridge.
 *
 * Every binding between an imported mockup and its frames lives here. Node
 * names are cosmetic; these keys are the contract, so renaming or moving a
 * node in the layers panel cannot break a render.
 */

export interface Binding {
  role: NodeRole;
  itemId: string;
  instanceGuid: string;
  surfaceId?: string;
  colorizeId?: string;
}

export function readBinding(node: BaseNode): Binding | null {
  const rawRole = node.getPluginData(PD.role);
  if (!NODE_ROLES.includes(rawRole as NodeRole)) return null;
  const role = rawRole as NodeRole;
  const itemId = node.getPluginData(PD.itemId);
  const instanceGuid = node.getPluginData(PD.instanceGuid);
  if (!itemId || !instanceGuid) return null;

  const surfaceId = node.getPluginData(PD.surfaceId);
  const colorizeId = node.getPluginData(PD.colorizeId);
  return {
    role,
    itemId,
    instanceGuid,
    ...(surfaceId ? { surfaceId } : {}),
    ...(colorizeId ? { colorizeId } : {}),
  };
}

export function writeBinding(node: BaseNode, binding: Binding): void {
  node.setPluginData(PD.version, PD_VERSION);
  node.setPluginData(PD.role, binding.role);
  node.setPluginData(PD.itemId, binding.itemId);
  node.setPluginData(PD.instanceGuid, binding.instanceGuid);
  if (binding.surfaceId) node.setPluginData(PD.surfaceId, binding.surfaceId);
  if (binding.colorizeId) node.setPluginData(PD.colorizeId, binding.colorizeId);
}

export function writePlaceholder(node: BaseNode, placeholder: Placeholder): void {
  node.setPluginData(PD.placeholder, JSON.stringify(placeholder));
}

export function readPlaceholder(node: BaseNode): Placeholder | null {
  const raw = node.getPluginData(PD.placeholder);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Placeholder>;
    if (
      typeof parsed.aspect !== 'number' ||
      typeof parsed.recommendedWidth !== 'number' ||
      typeof parsed.recommendedHeight !== 'number'
    ) {
      return null;
    }
    return {
      aspect: parsed.aspect,
      recommendedWidth: parsed.recommendedWidth,
      recommendedHeight: parsed.recommendedHeight,
      hint: parsed.hint ?? '',
    };
  } catch {
    return null;
  }
}

export function writeCanvasSize(node: BaseNode, size: { width: number; height: number }): void {
  node.setPluginData(PD.canvas, JSON.stringify(size));
}

export function readCanvasSize(node: BaseNode): { width: number; height: number } | null {
  const raw = node.getPluginData(PD.canvas);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { width?: number; height?: number };
    if (typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null;
    return { width: parsed.width, height: parsed.height };
  } catch {
    return null;
  }
}

/**
 * Nearest ancestor-or-self carrying a Mockup Forge binding. Users select
 * whatever is convenient — a nested text layer, a child of a design frame — and
 * every one of those should resolve to the frame that owns it.
 */
export function findBoundAncestor(node: BaseNode | null): { node: BaseNode; binding: Binding } | null {
  let current: BaseNode | null = node;
  while (current) {
    const binding = readBinding(current);
    if (binding) return { node: current, binding };
    current = current.parent;
  }
  return null;
}

/** Collect every bound descendant of a node, including the node itself. */
export function collectBound(root: BaseNode, into: Map<string, { node: BaseNode; binding: Binding }[]>): void {
  const binding = readBinding(root);
  if (binding) {
    const list = into.get(binding.instanceGuid) ?? [];
    list.push({ node: root, binding });
    into.set(binding.instanceGuid, list);
  }
  if ('children' in root) {
    for (const child of (root as ChildrenMixin).children) collectBound(child, into);
  }
}

/* ------------------------------------------------------------------ */
/* base64                                                              */
/* ------------------------------------------------------------------ */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * `figma.base64Decode` exists in current plugin API versions; the manual paths
 * keep the plugin working on older hosts where it does not.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const api = figma as unknown as { base64Decode?: (s: string) => Uint8Array };
  if (typeof api.base64Decode === 'function') return api.base64Decode(base64);

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const length = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(length);
  let bits = 0;
  let accumulator = 0;
  let index = 0;
  for (let i = 0; i < clean.length; i += 1) {
    accumulator = (accumulator << 6) | B64_CHARS.indexOf(clean.charAt(i));
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index] = (accumulator >> bits) & 0xff;
      index += 1;
    }
  }
  return index === length ? out : out.subarray(0, index);
}

export function bytesToBase64(bytes: Uint8Array): string {
  const api = figma as unknown as { base64Encode?: (b: Uint8Array) => string };
  if (typeof api.base64Encode === 'function') return api.base64Encode(bytes);

  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64_CHARS.charAt((triple >> 18) & 63);
    out += B64_CHARS.charAt((triple >> 12) & 63);
    out += i + 1 < bytes.length ? B64_CHARS.charAt((triple >> 6) & 63) : '=';
    out += i + 2 < bytes.length ? B64_CHARS.charAt(triple & 63) : '=';
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* misc canvas helpers                                                 */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: Number.parseInt(clean.slice(0, 2), 16) / 255,
    g: Number.parseInt(clean.slice(2, 4), 16) / 255,
    b: Number.parseInt(clean.slice(4, 6), 16) / 255,
  };
}

export function rgbToHex(rgb: RGB): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

/** First visible solid fill of a node, as hex. */
export function readSolidFill(node: SceneNode): string | null {
  if (!('fills' in node)) return null;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return null;
  for (const paint of fills) {
    if (paint.type === 'SOLID' && paint.visible !== false) return rgbToHex(paint.color);
  }
  return null;
}

/**
 * A short, collision-resistant id. Instance guids only need to be unique within
 * a document, and this is called a handful of times per import.
 */
export function makeGuid(prefix: string): string {
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
  }
  return `${prefix}-${random}`;
}
