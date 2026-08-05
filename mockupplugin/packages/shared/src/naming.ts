/**
 * Node naming and pluginData keys.
 *
 * Names are for humans and are allowed to drift — every binding the plugin
 * relies on lives in pluginData, so renaming or moving a node never breaks
 * the link between an item frame and its design frames.
 */

export const PLUGIN_PREFIX = '[MF]';

export const PD = {
  /** 'item' | 'design' | 'colorize' */
  role: 'mf:role',
  itemId: 'mf:itemId',
  surfaceId: 'mf:surfaceId',
  colorizeId: 'mf:colorizeId',
  instanceGuid: 'mf:instance',
  /** JSON blob of the placeholder for this design frame. */
  placeholder: 'mf:placeholder',
  /** Item canvas size, so renders can be applied at the right ratio. */
  canvas: 'mf:canvas',
  lastRenderId: 'mf:lastRenderId',
  version: 'mf:v',
} as const;

export const PD_VERSION = '1';

export type NodeRole = 'item' | 'design' | 'colorize';

/** "mug-ceramic-front-01" -> "Mug Ceramic Front 01" */
export function titleize(id: string): string {
  return id
    .split('-')
    .map((part) => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

export function itemFrameName(itemId: string): string {
  return `${PLUGIN_PREFIX} ${titleize(itemId)}`;
}

export function designFrameName(itemId: string, surfaceId: string): string {
  return `${PLUGIN_PREFIX} Design → ${itemId} / ${surfaceId}`;
}

export function colorizeSwatchName(itemId: string, colorizeId: string): string {
  return `${PLUGIN_PREFIX} Colour → ${itemId} / ${colorizeId}`;
}

export function instanceGroupName(itemId: string): string {
  return `${PLUGIN_PREFIX} ${titleize(itemId)} — Mockup`;
}
