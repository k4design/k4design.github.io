figma.showUI(__html__, { width: 340, height: 320 });

type ImagePayload = { name: string; bytes: number[]; position?: number };

function extractTrailingIndex(filename: string): number | null {
  // matches "..._10.png" or "..._1.jpg"
  const m = filename.match(/_(\d+)\.[^.]+$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function extractTagFromNodeName(name: string): number | null {
  // expects "tag:7" anywhere in the layer name
  const m = name.match(/tag\s*:\s*(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

const imageByIndex = new Map<number, string>(); // index -> figma image hash

async function detectExistingImages() {
  const nodes: SceneNode[] = [];
  function walk(node: SceneNode) {
    nodes.push(node);
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  for (const child of figma.currentPage.children) {
    walk(child);
  }

  const imageMap = new Map<number, { hash: string; node: SceneNode }>();

  // Find all nodes with img:1 through img:10 tags that have image fills
  for (const node of nodes) {
    if (!("fills" in node)) continue;

    const tag = node.getPluginData("tag") || "";
    const match = tag.match(/^img:(\d+)$/);
    if (!match) continue;

    const position = parseInt(match[1], 10);
    if (position < 1 || position > 10) continue;

    // Check if this node has an image fill
    const fills = (node as any).fills;
    if (!Array.isArray(fills) || fills.length === 0) continue;

    let imageFill: ImagePaint | null = null;
    for (const fill of fills) {
      if (fill.type === "IMAGE" && "imageHash" in fill) {
        imageFill = fill as ImagePaint;
        break;
      }
    }

    if (imageFill && imageFill.imageHash) {
      // Store the first node we find for each position
      if (!imageMap.has(position)) {
        imageMap.set(position, {
          hash: imageFill.imageHash,
          node: node
        });
      }
    }
  }

  // Get image bytes directly from image hash (not from node export, to avoid rotation)
  const detectedImages: Array<{ position: number; bytes: number[]; hash: string }> = [];
  const positions = Array.from(imageMap.keys()).sort((a, b) => a - b);

  for (const pos of positions) {
    const imgData = imageMap.get(pos);
    if (!imgData) continue;

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
      imageByIndex.set(pos, imgData.hash);
    } catch (e) {
      // Skip if image retrieval fails
    }
  }

  if (detectedImages.length > 0) {
    figma.ui.postMessage({
      type: "EXISTING_IMAGES_DETECTED",
      images: detectedImages
    });
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "IMAGES_SELECTED") {
    imageByIndex.clear();

    const items: ImagePayload[] = msg.items || [];
    let loaded = 0;

    for (const item of items) {
      // Use position from UI if provided, otherwise try to extract from filename
      let idx = item.position;
      if (!idx) {
        idx = extractTrailingIndex(item.name);
      }
      if (!idx) continue;
      if (idx < 1 || idx > 10) continue;

      const bytes = new Uint8Array(item.bytes);
      const image = figma.createImage(bytes);
      imageByIndex.set(idx, image.hash);
      loaded++;
    }

    figma.ui.postMessage({ type: "STATUS", text: `Loaded ${loaded} images (positions 1–10).` });
    return;
  }

  if (msg.type === "FILL_SELECTION") {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: "STATUS", text: "Select at least one rectangle/frame." });
      return;
    }

    let filled = 0;
    for (const node of selection) {
      // You can expand this to traverse children in frames if you want.
      // For now, fill only nodes that support "fills".
      if (!("fills" in node)) continue;

      const tag = extractTagFromNodeName(node.name);
      if (!tag) continue;

      const hash = imageByIndex.get(tag);
      if (!hash) continue;

      const paint: ImagePaint = {
        type: "IMAGE",
        imageHash: hash,
        scaleMode: "FILL",
      };

      const fills = Array.isArray((node as any).fills) ? (node as any).fills : [];
      (node as any).fills = [paint]; // replace fills
      filled++;
    }

    figma.ui.postMessage({ type: "STATUS", text: `Filled ${filled} node(s).` });
    return;
  }
};

async function detectExistingData() {
  const nodes: SceneNode[] = [];
  function walk(node: SceneNode) {
    nodes.push(node);
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  for (const child of figma.currentPage.children) {
    walk(child);
  }

  const dataMap: Record<string, string> = {};
  let statsComboValue: string | null = null;

  // List of all data field tags
  const dataFields = [
    "bedrooms", "bathrooms", "sqft", "price",
    "street", "street2", "cityState",
    "tagline", "description",
    "feature1", "feature2", "feature3", "feature4", "feature5", "feature6",
    "name", "agentTitle", "phone", "email"
  ];

  // Find all text nodes with data tags and extract their values
  for (const node of nodes) {
    if (node.type !== "TEXT") continue;

    const tag = node.getPluginData("tag") || "";
    if (!tag) continue;

    // Check if this is the statsCombo tag
    if (tag === "statsCombo") {
      if (!statsComboValue) {
        statsComboValue = node.characters || "";
      }
      continue;
    }

    // Check if this tag is one of our data fields
    if (dataFields.includes(tag)) {
      // Only store the first value we find for each tag
      if (!(tag in dataMap)) {
        let textValue = node.characters || "";
        // For price, remove formatting to get raw value
        if (tag === "price") {
          // Remove $ and commas
          textValue = textValue.replace(/[$,]/g, "");
        }
        dataMap[tag] = textValue;
      }
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

  // Send detected data to UI
  if (Object.keys(dataMap).length > 0) {
    figma.ui.postMessage({
      type: "EXISTING_DATA_DETECTED",
      data: dataMap
    });
  }
}

// Detect existing images and data on load
detectExistingImages();
detectExistingData();