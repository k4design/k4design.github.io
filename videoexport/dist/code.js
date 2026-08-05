"use strict";
(() => {
  // src/code.ts
  var UI_WIDTH = 420;
  var DEFAULT_UI_HEIGHT = 760;
  figma.showUI(__html__, { width: UI_WIDTH, height: DEFAULT_UI_HEIGHT });
  figma.clientStorage.getAsync("uiHeight").then((h) => {
    if (typeof h === "number" && h >= 400 && h <= 1400) figma.ui.resize(UI_WIDTH, h);
  });
  function hasVideoFill(node) {
    if (!("fills" in node)) return false;
    const fills = node.fills;
    if (fills === figma.mixed || !Array.isArray(fills)) return false;
    return fills.some((f) => f.type === "VIDEO" && f.visible !== false);
  }
  function findVideoNodes(frame) {
    const found = [];
    if (hasVideoFill(frame)) found.push(frame);
    found.push(...frame.findAll((n) => hasVideoFill(n)));
    return found;
  }
  function videoLayerInfo(frame, node) {
    const fb = frame.absoluteBoundingBox;
    const nb = node.absoluteBoundingBox;
    const fills = "fills" in node && node.fills !== figma.mixed ? node.fills : [];
    const videoPaint = fills.find((f) => f.type === "VIDEO" && f.visible !== false);
    let cornerRadius = 0;
    if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
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
      scaleMode: videoPaint && videoPaint.scaleMode || "FILL"
    };
  }
  function frameInfo(frame) {
    const videos = findVideoNodes(frame);
    return {
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      videoLayer: videos.length > 0 ? videoLayerInfo(frame, videos[0]) : null,
      extraVideoCount: Math.max(0, videos.length - 1)
    };
  }
  function collectFrames() {
    const selected = figma.currentPage.selection.filter(
      (n) => n.type === "FRAME"
    );
    const frames = selected.length > 0 ? selected : figma.currentPage.children.filter((n) => n.type === "FRAME");
    const sorted = frames.slice().sort((a, b) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const ay = (_b = (_a = a.absoluteBoundingBox) == null ? void 0 : _a.y) != null ? _b : a.y;
      const by = (_d = (_c = b.absoluteBoundingBox) == null ? void 0 : _c.y) != null ? _d : b.y;
      if (Math.abs(ay - by) > 1) return ay - by;
      const ax = (_f = (_e = a.absoluteBoundingBox) == null ? void 0 : _e.x) != null ? _f : a.x;
      const bx = (_h = (_g = b.absoluteBoundingBox) == null ? void 0 : _g.x) != null ? _h : b.x;
      return ax - bx;
    });
    return sorted.map(frameInfo);
  }
  function sendFrames() {
    figma.ui.postMessage({ type: "frames", frames: collectFrames() });
  }
  var EXPORT_OFFSET = 1e5;
  async function exportPng(node, scale) {
    return node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: scale }
    });
  }
  function topLevelAncestor(frame, node) {
    if (node === frame) return null;
    let cur = node;
    while (cur.parent && cur.parent !== frame) cur = cur.parent;
    return cur.parent === frame ? cur : null;
  }
  async function exportFrameLayers(frameId, videoNodeId, scale) {
    const frame = await figma.getNodeByIdAsync(frameId);
    const videoNode = await figma.getNodeByIdAsync(videoNodeId);
    const ancestor = topLevelAncestor(frame, videoNode);
    if (!ancestor) {
      const aboveClone = frame.clone();
      aboveClone.x = frame.x + EXPORT_OFFSET;
      aboveClone.fills = [];
      let above2 = null;
      try {
        above2 = await exportPng(aboveClone, scale);
      } finally {
        aboveClone.remove();
      }
      const belowClone2 = frame.clone();
      belowClone2.x = frame.x + EXPORT_OFFSET;
      belowClone2.fills = belowClone2.fills.filter((f) => f.type !== "VIDEO");
      for (const child of belowClone2.children.slice()) child.remove();
      let below2;
      try {
        below2 = await exportPng(belowClone2, scale);
      } finally {
        belowClone2.remove();
      }
      return { below: below2, above: above2 };
    }
    const idx = frame.children.indexOf(ancestor);
    const belowClone = frame.clone();
    belowClone.x = frame.x + EXPORT_OFFSET;
    let below;
    try {
      for (const child of belowClone.children.slice(idx)) child.remove();
      below = await exportPng(belowClone, scale);
    } finally {
      belowClone.remove();
    }
    let above = null;
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
      if (msg.type === "get-frames") {
        sendFrames();
      } else if (msg.type === "export-frame") {
        const frame = await figma.getNodeByIdAsync(msg.frameId);
        const png = await exportPng(frame, msg.scale);
        figma.ui.postMessage({ type: "frame-png", frameId: msg.frameId, png });
      } else if (msg.type === "export-frame-layers") {
        const { below, above } = await exportFrameLayers(msg.frameId, msg.videoNodeId, msg.scale);
        figma.ui.postMessage({ type: "frame-layers", frameId: msg.frameId, below, above });
      } else if (msg.type === "resize") {
        const h = Math.max(400, Math.min(1400, Math.round(msg.height)));
        figma.ui.resize(UI_WIDTH, h);
        await figma.clientStorage.setAsync("uiHeight", h);
      } else if (msg.type === "notify") {
        figma.notify(msg.message, { error: !!msg.error });
      } else if (msg.type === "close") {
        figma.closePlugin();
      }
    } catch (err) {
      figma.ui.postMessage({ type: "error", message: String(err) });
    }
  };
  figma.on("selectionchange", sendFrames);
})();
