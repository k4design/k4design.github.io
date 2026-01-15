# Real Estate Autofill (Figma Plugin)

## What it does
- Tag layers (pluginData) via the Tagging tab.
- When you assign a tag, the plugin also renames the layer to the tag.
- Apply buttons update ALL tagged layers on the current page (no selection required):
  - Text fields: updates TEXT layers whose tag matches a field key (e.g. `price`, `street`, `feature1`).
  - Images: updates layers tagged `img:1` .. `img:10` using selected images whose filenames end in `_1`..`_10` before extension. Logo can be uploaded separately and uses the `img:logo` tag.

## Image behavior
- Images are applied with `scaleMode: "FILL"`.

## Install (Development)
1. In Figma: Plugins → Development → Import plugin from manifest…
2. Select `manifest.json` in this folder.

## Tag list (text)
bedrooms, bathrooms, sqft, price, street, street2, cityState, tagline, description,
feature1..feature6, name, agentTitle, phone, email

## Tag list (images)
img:1 .. img:10, img:logo
