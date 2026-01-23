figma.showUI(__html__, { width: 360, height: 700 });

// imageHash lookup: { "1": hash, ..., "logo": hash }
var images: Record<string, string> = {};

function getTag(node: SceneNode): string {
  try {
    return node.getPluginData("tag") || "";
  } catch (e) {
    return "";
  }
}

function setTagAndRename(node: SceneNode, tag: string): void {
  try {
    node.setPluginData("tag", tag || "");
  } catch (e) {}

  // Rename layer to tag; if clearing, avoid blank names
  try {
    if (tag) node.name = tag;
    else node.name = "untagged";
  } catch (e) {}
}

function formatPrice(v: string | undefined): string {
  if (!v) return "";
  if (/[,$]/.test(v)) return v;

  const n = Number(String(v).replace(/[^\d]/g, ""));
  if (!isFinite(n)) return v;

  const s = String(Math.floor(n));
  const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + withCommas;
}

// Walk entire page (no selection needed)
function walk(node: SceneNode, out: SceneNode[]): void {
  out.push(node);
  if (node && "children" in node && node.children && node.children.length) {
    for (let i = 0; i < node.children.length; i++) {
      walk(node.children[i], out);
    }
  }
}

function allNodesOnPage(): SceneNode[] {
  const out: SceneNode[] = [];
  const kids = figma.currentPage.children;
  for (let i = 0; i < kids.length; i++) {
    walk(kids[i], out);
  }
  return out;
}

async function setText(node: TextNode, val: string, start?: number, end?: number): Promise<void> {
  // Load fonts before editing
  if (node.fontName === figma.mixed) {
    const len = node.characters.length;
    const checkEnd = Math.max(1, len);

    for (let i = 0; i < checkEnd; i++) {
      const checkStart = Math.min(i, Math.max(0, len - 1));
      const rangeFont = node.getRangeFontName(checkStart, checkStart + 1);
      if (rangeFont !== figma.mixed) {
        await figma.loadFontAsync(rangeFont);
      }
    }
  } else {
    await figma.loadFontAsync(node.fontName);
  }

  // If start and end are provided, set text only for that range
  if (start !== undefined && end !== undefined && start >= 0 && end > start) {
    try {
      // Use insertCharacters to replace the range
      // First delete the range, then insert new text
      const currentText = node.characters;
      const beforeText = currentText.substring(0, start);
      const afterText = currentText.substring(end);
      const newText = beforeText + (val || "") + afterText;
      node.characters = newText;
    } catch (e) {
      // Fallback to full text replacement if range editing fails
      node.characters = val || "";
    }
  } else {
    // Full text replacement
    node.characters = val || "";
  }
}

async function applyDataAll(data: Record<string, string>): Promise<void> {
  const nodes = allNodesOnPage();
  let count = 0;

  // Copy data (no spread)
  const map: Record<string, string> = {};
  for (const k in data) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      map[k] = data[k];
    }
  }
  map.price = formatPrice(data && data.price ? data.price : "");
  
  // Format statsCombo tag by combining bedrooms, bathrooms, and sqft
  if (data.bedrooms || data.bathrooms || data.sqft) {
    const bedrooms = (data.bedrooms || "").toString().trim();
    const bathrooms = (data.bathrooms || "").toString().trim();
    const sqft = (data.sqft || "").toString().trim();
    
    const parts: string[] = [];
    if (bedrooms) parts.push(bedrooms + " Bedrooms");
    if (bathrooms) parts.push(bathrooms + " Bathrooms");
    if (sqft) parts.push(sqft + " sq/ft");
    
    map.statsCombo = parts.join("  |  ");
  } else {
    map.statsCombo = "";
  }
  
  // Format featuresBulleted tag by combining feature1-feature6 with line breaks
  const features: string[] = [];
  for (let f = 1; f <= 6; f++) {
    const featureKey = "feature" + f;
    const featureValue = (data[featureKey] || "").toString().trim();
    if (featureValue) {
      features.push(featureValue);
    }
  }
  map.featuresBulleted = features.join("\n");

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n || n.type !== "TEXT") continue;

    // Check for text ranges first
    try {
      const textRanges = n.getPluginData("textRanges");
      if (textRanges) {
        const ranges = JSON.parse(textRanges);
        if (ranges && ranges.length > 0) {
          // Apply data to each text range
          for (let r = 0; r < ranges.length; r++) {
            const range = ranges[r];
            if (range.tag && Object.prototype.hasOwnProperty.call(map, range.tag)) {
              await setText(n, map[range.tag], range.start, range.end);
              count++;
            }
          }
          continue; // Skip full-node tagging if ranges exist
        }
      }
    } catch (e) {
      // If range parsing fails, fall through to full-node tagging
    }

    // Full-node tagging (backwards compatibility)
    const tag = getTag(n);
    if (!tag) continue;

    if (Object.prototype.hasOwnProperty.call(map, tag)) {
      await setText(n, map[tag]);
      count++;
    }
  }

  figma.ui.postMessage({ type: "STATUS", text: "Updated " + count + " text layers (all tagged on page)." });
}

async function applyImagesAll(): Promise<void> {
  const nodes = allNodesOnPage();
  let count = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n) continue;
    if (!("fills" in n)) continue;
    if (n.locked) continue;

    const tag = getTag(n);
    if (!tag) continue;

    let idx: string | null = null;
    const m = tag.match(/^img:(\d+)$/);
    if (m) {
      idx = m[1]; // Accept any number, no limit
    } else if (tag === "img:logo") {
      idx = "logo";
    } else {
      // Allow custom image tags (e.g., img:custom)
      // Check if it starts with "img:" and use the rest as the index
      if (tag.startsWith("img:")) {
        idx = tag.substring(4); // Everything after "img:"
      } else {
        continue;
      }
    }

    const hash = images[idx];
    if (!hash) continue;

    try {
      // Get image to calculate dimensions for cover effect
      const image = figma.getImageByHash(hash);
      if (!image) continue;
      
      // Get image dimensions
      await image.getBytesAsync();
      
      const fills = (n as any).fills;
      let fillsArray: readonly Paint[] = [];
      if (Array.isArray(fills)) {
        fillsArray = fills;
      }
      
      // Find existing image fill to preserve filters only
      let existingFilters: any = undefined;
      for (let j = 0; j < fillsArray.length; j++) {
        if (fillsArray[j] && fillsArray[j].type === "IMAGE") {
          const imgFill = fillsArray[j] as ImagePaint;
          if (imgFill.filters !== undefined) {
            existingFilters = imgFill.filters;
          }
          break;
        }
      }
      
      // Remove all fills first to completely clear any transforms
      const nonImageFills: Paint[] = [];
      for (let k = 0; k < fillsArray.length; k++) {
        if (fillsArray[k] && fillsArray[k].type !== "IMAGE") {
          // Keep non-image fills
          nonImageFills.push(fillsArray[k]);
        }
      }
      
      // Temporarily clear all fills to force Figma to reset any previous image transforms
      (n as any).fills = nonImageFills;
      
      // Create new image fill with FILL mode
      // FILL mode scales the image to completely fill the container
      const newImageFill: any = {
        type: "IMAGE",
        imageHash: hash,
        scaleMode: "FILL"
      };
      
      // Preserve filters if they existed
      if (existingFilters !== undefined) {
        newImageFill.filters = existingFilters;
      }
      
      // Add the new image fill as the first fill (background layer)
      // This ensures it's behind any other fills that might exist
      nonImageFills.unshift(newImageFill);
      
      // Apply the new fills array
      (n as any).fills = nonImageFills;
      count++;
    } catch (e) {
      console.log("Error applying image: " + String(e));
    }
  }

  figma.ui.postMessage({ type: "STATUS", text: "Updated " + count + " image layers (all tagged on page)." });
}

// Selection -> UI sync
function pushSelectionTagToUI(): void {
  const sel = figma.currentPage.selection;

  if (!sel || sel.length === 0) {
    figma.ui.postMessage({
      type: "SELECTION_TAG",
      tag: "",
      text: "No selection. Select one or more layers to tag."
    });
    return;
  }

  if (sel.length === 1) {
    const node = sel[0];
    const t = getTag(node) || "";
    
    // Check if there's a text selection within this text node
    let hasTextSelection = false;
    let textRange: { start: number; end: number; tag?: string } | null = null;
    const nodeName = node.name || "(layer)";
    
    if (node.type === "TEXT" && "characters" in node) {
      // Check if there's a text selection (Figma API doesn't directly expose this in plugin context)
      // We'll check for stored text ranges in plugin data
      try {
        const textRanges = node.getPluginData("textRanges");
        if (textRanges) {
          const ranges = JSON.parse(textRanges);
          if (ranges && ranges.length > 0) {
            hasTextSelection = true;
            // Use the first range as indication (actual selection would come from selectionchange event)
            textRange = ranges[0];
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    let statusText = "Selected: " + nodeName + " • current tag: " + (t || "(none)");
    if (hasTextSelection && textRange) {
      statusText += " • text range: " + textRange.start + "-" + textRange.end;
    }
    
    figma.ui.postMessage({
      type: "SELECTION_TAG",
      tag: t,
      text: statusText,
      hasTextSelection: hasTextSelection,
      textRange: textRange,
      nodeName: nodeName
    });
    return;
  }

  const first = getTag(sel[0]) || "";
  let same = true;
  for (let i = 1; i < sel.length; i++) {
    if ((getTag(sel[i]) || "") !== first) { same = false; break; }
  }

  figma.ui.postMessage({
    type: "SELECTION_TAG",
    tag: same ? first : "",
    text: same
      ? ("Selected " + sel.length + " layers • current tag: " + (first || "(none)"))
      : ("Selected " + sel.length + " layers • mixed tags (choose a tag to overwrite)")
  });
}

async function getFramePreview(): Promise<void> {
  try {
    const page = figma.currentPage;
    if (!page || !page.children || page.children.length === 0) {
      figma.ui.postMessage({
        type: "FRAME_PREVIEW",
        imageData: "",
        pageWidth: 0,
        pageHeight: 0,
        highlights: [],
        frameName: "",
        frameIndex: 0,
        totalFrames: 0
      });
      return;
    }

    const nodes = allNodesOnPage();
    
    // Find frames on the page (also check for components and instances which can be exported)
    const frames: (FrameNode | ComponentNode | InstanceNode)[] = [];
    for (let f = 0; f < nodes.length; f++) {
      const nodeType = nodes[f] ? nodes[f].type : "";
      if (nodeType === "FRAME" || nodeType === "COMPONENT" || nodeType === "INSTANCE") {
        // Check if it has exportAsync
        if (nodes[f] && typeof (nodes[f] as any).exportAsync === "function") {
          frames.push(nodes[f] as FrameNode | ComponentNode | InstanceNode);
        }
      }
    }

    let targetNode: FrameNode | ComponentNode | InstanceNode | null = null;
    let bounds: { x: number; y: number; width: number; height: number } | null = null;
    let pageWidth = 0;
    let pageHeight = 0;
    let frameName = "";
    let frameIndex = 0;
    const totalFrames = frames.length;

    if (frames.length > 0) {
      // Check if a frame is currently selected
      const selection = figma.currentPage.selection;
      let selectedFrame: FrameNode | ComponentNode | InstanceNode | null = null;
      
      if (selection && selection.length > 0) {
        // Check if any selected node is a frame
        for (let s = 0; s < selection.length; s++) {
          const selNode = selection[s];
          if (selNode && (selNode.type === "FRAME" || selNode.type === "COMPONENT" || selNode.type === "INSTANCE")) {
            if (typeof (selNode as any).exportAsync === "function") {
              selectedFrame = selNode as FrameNode | ComponentNode | InstanceNode;
              break;
            }
          }
        }
      }
      
      if (selectedFrame) {
        // Use the selected frame
        targetNode = selectedFrame;
        bounds = selectedFrame.absoluteBoundingBox;
        frameName = selectedFrame.name || "Unnamed Frame";
        // Find index of selected frame in frames array
        for (let idx = 0; idx < frames.length; idx++) {
          if (frames[idx] === selectedFrame) {
            frameIndex = idx + 1;
            break;
          }
        }
      } else {
        // Use the largest frame (fallback behavior)
        let largestFrame = frames[0];
        let largestArea = 0;
        for (let l = 0; l < frames.length; l++) {
          const fbbox = frames[l].absoluteBoundingBox;
          if (fbbox) {
            const area = fbbox.width * fbbox.height;
            if (area > largestArea) {
              largestArea = area;
              largestFrame = frames[l];
            }
          }
        }
        targetNode = largestFrame;
        frameName = largestFrame.name || "Unnamed Frame";
        // Find index of largest frame in frames array
        for (let idx2 = 0; idx2 < frames.length; idx2++) {
          if (frames[idx2] === largestFrame) {
            frameIndex = idx2 + 1;
            break;
          }
        }
      }
      
      bounds = targetNode.absoluteBoundingBox;
      if (bounds) {
        pageWidth = bounds.width;
        pageHeight = bounds.height;
      }
    } else {
      // No frames found - cannot export page directly, need a frame
      figma.ui.postMessage({
        type: "FRAME_PREVIEW",
        imageData: "",
        pageWidth: 0,
        pageHeight: 0,
        highlights: [],
        frameName: "",
        frameIndex: 0,
        totalFrames: 0,
        error: "No frames found on page. Please create a frame to use preview."
      });
      figma.ui.postMessage({ type: "STATUS", text: "Preview requires at least one frame on the page." });
      return;
    }

    if (pageWidth <= 0 || pageHeight <= 0 || !targetNode) {
      figma.ui.postMessage({
        type: "FRAME_PREVIEW",
        imageData: "",
        pageWidth: 0,
        pageHeight: 0,
        highlights: [],
        frameName: "",
        frameIndex: 0,
        totalFrames: totalFrames
      });
      return;
    }
    
    // Verify exportAsync exists
    if (typeof (targetNode as any).exportAsync !== "function") {
      figma.ui.postMessage({
        type: "FRAME_PREVIEW",
        imageData: "",
        pageWidth: 0,
        pageHeight: 0,
        highlights: [],
        frameName: frameName,
        frameIndex: frameIndex,
        totalFrames: totalFrames,
        error: "Selected node type '" + targetNode.type + "' does not support exportAsync"
      });
      return;
    }

    // Export as image (only frames support exportAsync)
    let imageBytes: Uint8Array;
    try {
      // Check if exportAsync exists
      if (typeof (targetNode as any).exportAsync !== "function") {
        throw new Error("exportAsync is not a function on this node type: " + targetNode.type);
      }
      
      imageBytes = await (targetNode as any).exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: 1 }
      });
      
      if (!imageBytes || !(imageBytes instanceof Uint8Array)) {
        throw new Error("exportAsync did not return Uint8Array");
      }
    } catch (e) {
      figma.ui.postMessage({ type: "STATUS", text: "Could not export preview: " + String(e) });
      figma.ui.postMessage({
        type: "FRAME_PREVIEW",
        imageData: "",
        pageWidth: 0,
        pageHeight: 0,
        highlights: [],
        frameName: frameName,
        frameIndex: frameIndex,
        totalFrames: totalFrames,
        error: String(e)
      });
      return;
    }

    // Convert Uint8Array to base64 (manual implementation for plugin environment)
    const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64 = "";
    let i = 0;
    while (i < imageBytes.length) {
      const a = imageBytes[i++];
      const b = i < imageBytes.length ? imageBytes[i++] : 0;
      const c = i < imageBytes.length ? imageBytes[i++] : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      base64 += base64Chars.charAt((bitmap >> 18) & 63);
      base64 += base64Chars.charAt((bitmap >> 12) & 63);
      base64 += i - 2 < imageBytes.length ? base64Chars.charAt((bitmap >> 6) & 63) : "=";
      base64 += i - 1 < imageBytes.length ? base64Chars.charAt(bitmap & 63) : "=";
    }

    // Collect tagged nodes with their positions (relative to exported bounds)
    // Only include nodes that are within or overlap the current frame bounds
    const highlights: Array<{ tag: string; name: string; x: number; y: number; width: number; height: number }> = [];
    const baseX = bounds?.x || 0;
    const baseY = bounds?.y || 0;
    const frameRight = baseX + (bounds?.width || 0);
    const frameBottom = baseY + (bounds?.height || 0);
    
    for (let k = 0; k < nodes.length; k++) {
      const node = nodes[k];
      if (!node || !("absoluteBoundingBox" in node)) continue;

      const tag = getTag(node);
      if (!tag) continue;

      const bbox = node.absoluteBoundingBox;
      if (!bbox) continue;
      
      // Check if node is within or overlaps the frame bounds
      const nodeRight = bbox.x + bbox.width;
      const nodeBottom = bbox.y + bbox.height;
      
      // Node must overlap with frame bounds
      if (nodeRight < baseX || bbox.x > frameRight || nodeBottom < baseY || bbox.y > frameBottom) {
        continue; // Skip nodes outside the frame
      }
      
      highlights.push({
        tag: tag,
        name: node.name || "(unnamed)",
        x: bbox.x - baseX,
        y: bbox.y - baseY,
        width: bbox.width,
        height: bbox.height
      });
    }

    figma.ui.postMessage({
      type: "FRAME_PREVIEW",
      imageData: base64,
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      highlights: highlights,
      frameName: frameName,
      frameIndex: frameIndex,
      totalFrames: totalFrames
    });
  } catch (e) {
    figma.ui.postMessage({ type: "STATUS", text: "Preview error: " + String(e) });
  }
}

// Track if detection is in progress to prevent multiple simultaneous calls
let detectingImages = false;
let detectingData = false;

async function detectExistingImages(): Promise<void> {
  // Prevent multiple simultaneous detection calls
  if (detectingImages) {
    return;
  }
  detectingImages = true;
  
  try {
    // Scan current page for tagged images
    const nodes = allNodesOnPage();
    const imageMap: Record<string | number, { hash: string; node: SceneNode; isLogo?: boolean }> = {};
    
    // Find all nodes with img:1, img:2, etc. or img:logo tags that have image fills
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n) continue;
      if (!("fills" in n)) continue;
      if (n.locked) continue; // Skip locked nodes
      
      const tag = getTag(n);
      if (!tag) continue;
      
      let position: string | number | null = null;
      let isLogo = false;
      
      // Check for img:1, img:2, etc. (no limit)
      const m = tag.match(/^img:(\d+)$/);
      if (m) {
        const pos = parseInt(m[1], 10);
        if (pos >= 1) {
          position = pos;
        }
      } else if (tag === "img:logo") {
        // Handle logo tag
        position = "logo";
        isLogo = true;
      }
      
      if (!position) continue;
      
      // Check if this node has an image fill
      const fills = (n as any).fills;
      if (!Array.isArray(fills) || fills.length === 0) continue;
      
      let imageFill: ImagePaint | null = null;
      for (let j = 0; j < fills.length; j++) {
        if (fills[j] && fills[j].type === "IMAGE" && fills[j].imageHash) {
          imageFill = fills[j] as ImagePaint;
          break;
        }
      }
      
      if (imageFill && imageFill.imageHash) {
        // Store the first node we find for each position
        if (!imageMap[position]) {
          imageMap[position] = {
            hash: imageFill.imageHash,
            node: n,
            isLogo: isLogo
          };
        }
      }
    }
    
    // Get image bytes directly from image hash (not from node export, to avoid rotation)
    const detectedImages: Array<{ position: number | string; bytes: number[]; hash: string }> = [];
    
    // Separate numeric positions and logo
    const numericPositions: number[] = [];
    let hasLogo = false;
    
    for (const key in imageMap) {
      if (Object.prototype.hasOwnProperty.call(imageMap, key)) {
        if (key === "logo") {
          hasLogo = true;
        } else {
          const numPos = parseInt(String(key), 10);
          if (!isNaN(numPos)) {
            numericPositions.push(numPos);
          }
        }
      }
    }
    
    // Sort numeric positions
    numericPositions.sort((a, b) => a - b);
    
    // Process numeric positions first
    for (let k = 0; k < numericPositions.length; k++) {
      const pos = numericPositions[k];
      const imgData = imageMap[pos];
      
      try {
        // Get the image object from the hash
        const image = figma.getImageByHash(imgData.hash);
        if (!image) continue;
        
        // Get the raw image bytes (without any node transformations like rotation)
        const imageBytes = await image.getBytesAsync();
        
        // Convert Uint8Array to array for message passing
        const bytesArray: number[] = [];
        for (let b = 0; b < imageBytes.length; b++) {
          bytesArray.push(imageBytes[b]);
        }
        
        detectedImages.push({
          position: pos,
          bytes: bytesArray,
          hash: imgData.hash
        });
        
        // Also store in images map for applying
        images[String(pos)] = imgData.hash;
      } catch (e) {
        // Skip if image retrieval fails
        console.log("Failed to get image for position " + pos + ": " + String(e));
      }
    }
    
    // Process logo if present
    if (hasLogo && imageMap.logo) {
      const logoData = imageMap.logo;
      try {
        const logoImage = figma.getImageByHash(logoData.hash);
        if (logoImage) {
          const logoBytes = await logoImage.getBytesAsync();
          const logoBytesArray: number[] = [];
          for (let b = 0; b < logoBytes.length; b++) {
            logoBytesArray.push(logoBytes[b]);
          }
          
          detectedImages.push({
            position: "logo",
            bytes: logoBytesArray,
            hash: logoData.hash
          });
          
          // Store in images map for applying
          images.logo = logoData.hash;
        }
      } catch (e) {
        console.log("Failed to get logo image: " + String(e));
      }
    }
    
    // Always send message, even if empty, so UI knows detection completed
    figma.ui.postMessage({
      type: "EXISTING_IMAGES_DETECTED",
      images: detectedImages
    });
  } catch (e) {
    figma.ui.postMessage({ type: "STATUS", text: "Error detecting images: " + String(e) });
  } finally {
    detectingImages = false;
  }
}

figma.on("selectionchange", function () {
  pushSelectionTagToUI();
});

pushSelectionTagToUI();

async function detectExistingData(): Promise<void> {
  // Prevent multiple simultaneous detection calls
  if (detectingData) {
    return;
  }
  detectingData = true;
  
  try {
    // Scan current page for tagged text nodes
    const nodes = allNodesOnPage();
    const dataMap: Record<string, string> = {};
    let statsComboValue: string | null = null;
    let featuresBulletedValue: string | null = null;
    
    // List of known data field tags (for reference, but we accept any tag now)
    const knownDataFields = [
      "bedrooms", "bathrooms", "sqft", "price",
      "street", "street2", "cityState",
      "tagline", "description",
      "feature1", "feature2", "feature3", "feature4", "feature5", "feature6",
      "name", "agentTitle", "phone", "email"
    ];
    
    // Find all text nodes with data tags and extract their values
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n) continue;
      if (n.type !== "TEXT") continue;
      if (n.locked) continue; // Skip locked nodes
      
      const tag = getTag(n);
      if (!tag) continue;
      
      // Check if this is the statsCombo tag (handle separately)
      if (tag === "statsCombo") {
        if (!statsComboValue) {
          statsComboValue = n.characters || "";
        }
        continue;
      }
      
      // Check if this is the featuresBulleted tag (handle separately)
      if (tag === "featuresBulleted") {
        if (!featuresBulletedValue) {
          featuresBulletedValue = n.characters || "";
        }
        continue;
      }
      
      // Accept any tag (custom tags are now supported)
      // Only store the first value we find for each tag
      if (!dataMap.hasOwnProperty(tag)) {
        let textValue = n.characters || "";
        // For price, remove formatting to get raw value
        if (tag === "price") {
          // Remove $ and commas
          textValue = textValue.replace(/[$,]/g, "");
        }
        dataMap[tag] = textValue;
      }
      
      // Also check for text ranges in this node
      try {
        const textRanges = n.getPluginData("textRanges");
        if (textRanges) {
          const ranges = JSON.parse(textRanges);
          if (ranges && ranges.length > 0) {
            for (let rIdx = 0; rIdx < ranges.length; rIdx++) {
              const range = ranges[rIdx];
              const rangeTag = range.tag;
              if (rangeTag && !dataMap.hasOwnProperty(rangeTag)) {
                let rangeText = n.characters.substring(range.start, range.end);
                if (rangeTag === "price") {
                  rangeText = rangeText.replace(/[$,]/g, "");
                }
                dataMap[rangeTag] = rangeText;
              }
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Parse statsCombo if individual tags are missing
    if (statsComboValue && (!dataMap.bedrooms || !dataMap.bathrooms || !dataMap.sqft)) {
      // Parse combo tag - handles formats like:
      // "3 BR | 2 BA | 1,500 sq ft"
      // "3BR / 2BA / 1500 sqft"
      // "3 Bedroom, 2 Bathroom, 1500 Sq Ft"
      // etc.
      const comboText = statsComboValue.trim();
      
      // Try to extract bedrooms (look for numbers followed by BR, Bedroom, etc.)
      if (!dataMap.bedrooms) {
        const bedMatch = comboText.match(/(\d+)\s*(?:BR|Bedroom|Bed|bd|bed)/i);
        if (bedMatch && bedMatch[1]) {
          dataMap.bedrooms = bedMatch[1];
        }
      }
      
      // Try to extract bathrooms (look for numbers followed by BA, Bathroom, Bath, etc.)
      if (!dataMap.bathrooms) {
        const bathMatch = comboText.match(/(\d+)\s*(?:BA|Bathroom|Bath|ba|bath)/i);
        if (bathMatch && bathMatch[1]) {
          dataMap.bathrooms = bathMatch[1];
        }
      }
      
      // Try to extract sqft (look for numbers with commas/spaces followed by sqft, sq ft, etc.)
      if (!dataMap.sqft) {
        const sqftMatch = comboText.match(/(\d{1,3}(?:[,\s]\d{3})*)\s*(?:sqft|sq\s*ft|square\s*feet?|sf)/i);
        if (sqftMatch && sqftMatch[1]) {
          // Remove commas and spaces from sqft value
          dataMap.sqft = sqftMatch[1].replace(/[,\s]/g, "");
        } else {
          // Try simpler pattern - just numbers before "sq" keywords
          const simpleSqftMatch = comboText.match(/(\d+(?:,\d{3})*)\s*(?:sq|sf)/i);
          if (simpleSqftMatch && simpleSqftMatch[1]) {
            dataMap.sqft = simpleSqftMatch[1].replace(/[,\s]/g, "");
          }
        }
      }
    }
    
    // Parse featuresBulleted if individual feature tags are missing
    if (featuresBulletedValue) {
      // Split by line breaks and trim each feature
      const features = featuresBulletedValue.split(/\r?\n/);
      let featureIndex = 1;
      
      for (let f = 0; f < features.length && featureIndex <= 6; f++) {
        const feature = features[f].trim();
        // Only use non-empty features
        if (feature) {
          const featureKey = "feature" + featureIndex;
          // Only populate if this feature field isn't already set
          if (!dataMap.hasOwnProperty(featureKey)) {
            dataMap[featureKey] = feature;
          }
          featureIndex++;
        }
      }
    }
    
    // Always send message, even if empty, so UI knows detection completed
    figma.ui.postMessage({
      type: "EXISTING_DATA_DETECTED",
      data: dataMap
    });
  } catch (e) {
    figma.ui.postMessage({ type: "STATUS", text: "Error detecting data: " + String(e) });
  } finally {
    detectingData = false;
  }
}

// Detect existing images and data on load (only once on initial load)
// Run detection after UI is shown
detectExistingImages();
detectExistingData();

figma.ui.onmessage = async (msg: any) => {
  if (!msg || !msg.type) return;

  if (msg.type === "IMAGES_SELECTED") {
    // Don't clear logo when regular images are updated
    const logoHash = images["logo"];
    images = {};
    if (logoHash) {
      images["logo"] = logoHash;
    }
    
    const items: Array<{ name: string; bytes: number[]; position?: number }> = msg.items || [];
    let loaded = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || !item.name || !item.bytes) continue;

      // Use position from UI if provided, otherwise try to extract from filename
      let position = item.position;
      if (!position) {
        const mm = String(item.name).match(/_(0?[1-9]|10)\./);
        if (mm) {
          position = parseInt(mm[1], 10);
        }
      }

      if (position && position >= 1) {
        try {
          const img = figma.createImage(new Uint8Array(item.bytes));
          images[String(position)] = img.hash;
          loaded++;
        } catch (e) {
          // Skip if image creation fails
        }
      }
    }

    figma.ui.postMessage({ type: "IMG_STATUS", text: "Images loaded: " + loaded + " (positions 1-" + loaded + ")" });
    figma.ui.postMessage({ type: "STATUS", text: "Images loaded." });
    return;
  }

  if (msg.type === "LOGO_SELECTED") {
    if (msg.bytes && msg.bytes.length > 0) {
      try {
        const img = figma.createImage(new Uint8Array(msg.bytes));
        images["logo"] = img.hash;
        figma.ui.postMessage({ type: "STATUS", text: "Logo loaded." });
      } catch (e) {
        figma.ui.postMessage({ type: "STATUS", text: "Error loading logo: " + String(e) });
      }
    } else {
      // Clear logo
      delete images["logo"];
      figma.ui.postMessage({ type: "STATUS", text: "Logo cleared." });
    }
    return;
  }

  if (msg.type === "APPLY_DATA_ALL") {
    applyDataAll(msg.data || {}).catch(function(e) {
      figma.ui.postMessage({ type: "STATUS", text: "Error applying data: " + String(e) });
    });
    return;
  }

  if (msg.type === "APPLY_IMAGES_ALL") {
    applyImagesAll().catch(function(e) {
      figma.ui.postMessage({ type: "STATUS", text: "Error applying images: " + String(e) });
    });
    return;
  }

  if (msg.type === "SET_TAG_FROM_UI") {
    const sel = figma.currentPage.selection;
    if (!sel || sel.length === 0) {
      figma.ui.postMessage({ type: "STATUS", text: "Select layer(s) first to tag." });
      pushSelectionTagToUI();
      return;
    }

    const tag = msg.tag || "";
    const textRange = msg.textRange || null;
    
    // If tag is empty, clear tags and ranges
    if (!tag) {
      for (let clearIdx = 0; clearIdx < sel.length; clearIdx++) {
        const clearNode = sel[clearIdx];
        setTagAndRename(clearNode, "");
        if (clearNode.type === "TEXT") {
          try {
            clearNode.setPluginData("textRanges", "[]");
          } catch (e) {}
        }
      }
      figma.ui.postMessage({
        type: "STATUS",
        text: "Cleared tag on " + sel.length + " layer(s) and renamed to 'untagged'."
      });
      pushSelectionTagToUI();
      return;
    }
    
    for (let i = 0; i < sel.length; i++) {
      const node = sel[i];
      
      // Handle partial text tagging if text range is provided and node is a text node
      if (textRange && node.type === "TEXT" && textRange.start !== undefined && textRange.end !== undefined) {
        try {
          // Set tag on the text range using plugin data
          // Store range info: tag:range:start:end format in plugin data
          const rangeKey = "tagRange:" + tag + ":" + textRange.start + ":" + textRange.end;
          node.setPluginData(rangeKey, "1");
          
          // Also set the tag on the node for backwards compatibility
          setTagAndRename(node, tag);
          
          // Apply text formatting or styling to indicate the tagged range
          // Note: Figma doesn't support per-range plugin data directly,
          // so we'll use a different approach: store ranges in a JSON format
          const existingRanges = node.getPluginData("textRanges") || "[]";
          const ranges = JSON.parse(existingRanges);
          ranges.push({
            tag: tag,
            start: textRange.start,
            end: textRange.end
          });
          node.setPluginData("textRanges", JSON.stringify(ranges));
        } catch (e) {
          console.log("Error setting text range tag: " + String(e));
          // Fallback to full node tagging
          setTagAndRename(node, tag);
        }
      } else {
        // Regular full-node tagging
        setTagAndRename(node, tag);
      }
    }

    let statusMsg = tag
      ? ('Tagged ' + sel.length + ' layer(s) with "' + tag + '"')
      : ("Cleared tag on " + sel.length + " layer(s)");
    
    if (textRange && textRange.start !== undefined) {
      statusMsg += " (text range: " + textRange.start + "-" + textRange.end + ")";
    }
    
    figma.ui.postMessage({
      type: "STATUS",
      text: statusMsg + "."
    });

    pushSelectionTagToUI();
    
    // Auto-refresh preview if it exists
    figma.ui.postMessage({ type: "REFRESH_PREVIEW_IF_ACTIVE" });
    return;
  }

  if (msg.type === "GET_FRAME_PREVIEW") {
    getFramePreview();
    return;
  }

  if (msg.type === "REFRESH_DATA") {
    detectExistingData();
    return;
  }

  if (msg.type === "REFRESH_IMAGES") {
    detectExistingImages();
    return;
  }

  if (msg.type === "GET_SELECTION_INFO") {
    pushSelectionTagToUI();
    return;
  }
};