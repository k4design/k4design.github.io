// All Midjourney DOM coupling lives here. When the site changes and the extension stops
// working, this is the only file you should need to touch.
//
// How to re-derive a selector:
//   1. Open https://www.midjourney.com/imagine and open DevTools.
//   2. Right-click the prompt bar -> Inspect. Find the nearest ancestor with a stable id
//      or data-* attribute (today that is #desktop_input_bar) and the actual editable
//      element inside it (textarea / input / [contenteditable]).
//   3. In the console, `document.querySelectorAll(SEL.inputBar)` should return exactly one
//      element.
//   4. Midjourney's class names are build-hashed, so prefer ids, data-attributes, roles,
//      and *substring* class matches ([class*="..."]) over exact class names.
//
// Each entry is a list tried in order, most specific first, so a single UI change degrades
// to a fallback instead of breaking outright.

var SEL = {
  // The editable prompt field.
  inputBar: [
    '#desktop_input_bar textarea',
    '#desktop_input_bar input[type="text"]',
    '#desktop_input_bar [contenteditable="true"]',
    '#desktop_input_bar [role="textbox"]',
    'textarea[placeholder*="magine" i]',
    '[contenteditable="true"][data-placeholder*="magine" i]',
  ],

  // Fallback submit control, used only if pressing Enter does nothing.
  sendButton: [
    '#desktop_input_bar button[type="submit"]',
    '#desktop_input_bar button[aria-label*="submit" i]',
    '#desktop_input_bar button[aria-label*="send" i]',
  ],
};

/** Return the first element matching any selector in `list`, or null. */
function pick(list, root) {
  const scope = root || document;
  for (const sel of list) {
    try {
      const el = scope.querySelector(sel);
      if (el) return el;
    } catch (_) {
      // Bad or unsupported selector — skip it.
    }
  }
  return null;
}
