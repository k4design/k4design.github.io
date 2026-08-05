// Sandbox side: reads frames, detects video fill layers, exports PNG layers,
// and streams them to the UI where compositing + MP4 encoding happens.

interface VideoLayerInfo {
  nodeId: string;
  name: string;
  // Bounds relative to the frame's top-left, in unscaled Figma units
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  scaleMode: string; // FILL | FIT | CROP | TILE
}

interface FrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  videoLayer: VideoLayerInfo | null;
  extraVideoCount: number;
}

const UI_WIDTH = 420;
const DEFAULT_UI_HEIGHT = 760;

figma.showUI(__html__, { width: UI_WIDTH, height: DEFAULT_UI_HEIGHT });

// Restore the last height the user dragged the window to
figma.clientStorage.getAsync('uiHeight').then((h) => {
  if (typeof h === 'number' && h >= 400 && h <= 1400) figma.ui.resize(UI_WIDTH, h);
});

function hasVideoFill(node: SceneNode): boolean {
  if (!('fills' in node)) return false;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return false;
  return fills.some((f) => f.type === 'VIDEO' && f.visible !== false);
}

function findVideoNodes(frame: FrameNode): SceneNode[] {
  const found: SceneNode[] = [];
  if (hasVideoFill(frame)) found.push(frame);
  found.push(...frame.findAll((n) => hasVideoFill(n)));
  return found;
}

function videoLayerInfo(frame: FrameNode, node: SceneNode): VideoLayerInfo {
  const fb = frame.absoluteBoundingBox!;
  const nb = node.absoluteBoundingBox!;
  const fills = 'fills' in node && node.fills !== figma.mixed ? (node.fills as readonly Paint[]) : [];
  const videoPaint = fills.find((f) => f.type === 'VIDEO' && f.visible !== false) as VideoPaint | undefined;
  let cornerRadius = 0;
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    cornerRadius = node.cornerRadius;
  }
  return {
    nodeId: node.id,
    name: node.name,
    x: nb.x - fb.x,
    y: nb.y - fb.y,
    width: nb.width,
    height: nb.height,
    cornerRadius,
    scaleMode: (videoPaint && (videoPaint as any).scaleMode) || 'FILL',
  };
}

function frameInfo(frame: FrameNode): FrameInfo {
  const videos = findVideoNodes(frame);
  return {
    id: frame.id,
    name: frame.name,
    width: frame.width,
    height: frame.height,
    videoLayer: videos.length > 0 ? videoLayerInfo(frame, videos[0]) : null,
    extraVideoCount: Math.max(0, videos.length - 1),
  };
}

function collectFrames(): FrameInfo[] {
  const selected = figma.currentPage.selection.filter(
    (n): n is FrameNode => n.type === 'FRAME'
  );
  const frames = selected.length > 0
    ? selected
    : (figma.currentPage.children.filter((n) => n.type === 'FRAME') as FrameNode[]);
  // Order left-to-right, then top-to-bottom, matching reading order on canvas
  const sorted = frames.slice().sort((a, b) => {
    const ay = a.absoluteBoundingBox?.y ?? a.y;
    const by = b.absoluteBoundingBox?.y ?? b.y;
    if (Math.abs(ay - by) > 1) return ay - by;
    const ax = a.absoluteBoundingBox?.x ?? a.x;
    const bx = b.absoluteBoundingBox?.x ?? b.x;
    return ax - bx;
  });
  return sorted.map(frameInfo);
}

function sendFrames() {
  figma.ui.postMessage({ type: 'frames', frames: collectFrames() });
}

const EXPORT_OFFSET = 100000; // park clones far off-canvas while exporting

async function exportPng(node: SceneNode, scale: number): Promise<Uint8Array> {
  return (node as ExportMixin).exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  });
}

// Find the direct child of `frame` that contains (or is) `node`.
function topLevelAncestor(frame: FrameNode, node: SceneNode): SceneNode | null {
  if (node === frame) return null; // video fill on the frame itself
  let cur: BaseNode = node;
  while (cur.parent && cur.parent !== frame) cur = cur.parent;
  return cur.parent === frame ? (cur as SceneNode) : null;
}

// Export the frame split into a below-video layer and an above-video layer,
// using clones so the user's document is never mutated.
async function exportFrameLayers(
  frameId: string,
  videoNodeId: string,
  scale: number
): Promise<{ below: Uint8Array; above: Uint8Array | null }> {
  const frame = (await figma.getNodeByIdAsync(frameId)) as FrameNode;
  const videoNode = (await figma.getNodeByIdAsync(videoNodeId)) as SceneNode;
  const ancestor = topLevelAncestor(frame, videoNode);

  if (!ancestor) {
    // Video fill is on the frame itself: everything painted above it is "above".
    const aboveClone = frame.clone();
    aboveClone.x = frame.x + EXPORT_OFFSET;
    aboveClone.fills = [];
    let above: Uint8Array | null = null;
    try {
      above = await exportPng(aboveClone, scale);
    } finally {
      aboveClone.remove();
    }
    // Below layer: frame background minus the video fill itself
    const belowClone = frame.clone();
    belowClone.x = frame.x + EXPORT_OFFSET;
    belowClone.fills = (belowClone.fills as readonly Paint[]).filter((f) => f.type !== 'VIDEO');
    for (const child of belowClone.children.slice()) child.remove();
    let below: Uint8Array;
    try {
      below = await exportPng(belowClone, scale);
    } finally {
      belowClone.remove();
    }
    return { below, above };
  }

  const idx = frame.children.indexOf(ancestor);

  // Below: everything under the video's top-level layer (frame bg + children 0..idx-1)
  const belowClone = frame.clone();
  belowClone.x = frame.x + EXPORT_OFFSET;
  let below: Uint8Array;
  try {
    for (const child of belowClone.children.slice(idx)) child.remove();
    below = await exportPng(belowClone, scale);
  } finally {
    belowClone.remove();
  }

  // Above: children idx+1..end on a transparent background
  let above: Uint8Array | null = null;
  if (idx < frame.children.length - 1) {
    const aboveClone = frame.clone();
    aboveClone.x = frame.x + EXPORT_OFFSET;
    try {
      for (const child of aboveClone.children.slice(0, idx + 1)) child.remove();
      aboveClone.fills = [];
      aboveClone.effects = [];
      above = await exportPng(aboveClone, scale);
    } finally {
      aboveClone.remove();
    }
  }

  return { below, above };
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'get-frames') {
      sendFrames();
    } else if (msg.type === 'export-frame') {
      // Frame with no video: single flat PNG
      const frame = (await figma.getNodeByIdAsync(msg.frameId)) as FrameNode;
      const png = await exportPng(frame, msg.scale);
      figma.ui.postMessage({ type: 'frame-png', frameId: msg.frameId, png });
    } else if (msg.type === 'export-frame-layers') {
      const { below, above } = await exportFrameLayers(msg.frameId, msg.videoNodeId, msg.scale);
      figma.ui.postMessage({ type: 'frame-layers', frameId: msg.frameId, below, above });
    } else if (msg.type === 'resize') {
      const h = Math.max(400, Math.min(1400, Math.round(msg.height)));
      figma.ui.resize(UI_WIDTH, h);
      await figma.clientStorage.setAsync('uiHeight', h);
    } else if (msg.type === 'notify') {
      figma.notify(msg.message, { error: !!msg.error });
    } else if (msg.type === 'close') {
      figma.closePlugin();
    }
  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: String(err) });
  }
};

figma.on('selectionchange', sendFrames);
