# Real Estate Autofill (Figma Plugin)

## What it does
- Tag layers (pluginData) via the Tagging tab.
- When you assign a tag, the plugin also renames the layer to the tag.
- Apply buttons update ALL tagged layers on the current page (no selection required):
  - Text fields: updates TEXT layers whose tag matches a field key (e.g. `price`, `street`, `feature1`).
  - Images: updates layers tagged `img:1`, `img:2`, etc. (unlimited images supported). Logo can be uploaded separately and uses the `img:logo` tag.
- Supports custom tags for both text and images
- Supports partial text tagging (tagging portions of text within text nodes)

## Image behavior
- Images are applied with `scaleMode: "FILL"`.

## Build Instructions

This plugin uses TypeScript. To generate `code.js`:

1. Install dependencies:
```bash
npm install
```

2. Build the plugin:
```bash
npm run build
```

This will compile `code.ts` into `code.js`.

**Note:** The current `code.ts` file is incomplete. The working `code.js` file contains the full implementation with all features. For now, use the existing `code.js` file directly.

## Install (Development)
1. Build the plugin (see Build Instructions above)
2. In Figma: Plugins → Development → Import plugin from manifest…
3. Select `manifest.json` in this folder.

## Tag list (text)
bedrooms, bathrooms, sqft, price, street, street2, cityState, tagline, description,
feature1..feature6, name, agentTitle, phone, email

## Tag list (images)
img:1, img:2, img:3, ... (unlimited images), img:logo

## Custom Tags
- Add custom tags via the "+ Add" button in the Tagging tab
- Custom tags work just like built-in tags
- Custom image tags should start with "img:" prefix
