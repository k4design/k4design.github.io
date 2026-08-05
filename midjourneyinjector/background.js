// There is no popup any more — the UI is the on-page panel in panel.js. Clicking the
// toolbar icon toggles that panel, which is how you get it back after clicking Exit.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https:\/\/www\.midjourney\.com\//.test(tab.url || '')) {
    // Nothing to inject into. Say so in the badge rather than failing silently.
    await flashBadge(tab.id, 'MJ?');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  } catch (_) {
    // No content script in this tab — it was loaded before the extension was installed
    // or last reloaded. A page reload is the fix.
    await flashBadge(tab.id, '↻');
  }
});

async function flashBadge(tabId, text) {
  try {
    await chrome.action.setBadgeText({ text, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#e0a33c', tabId });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }).catch(() => {}), 2500);
  } catch (_) {
    // Tab went away mid-flash; nothing worth reporting.
  }
}
