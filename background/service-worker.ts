import { getConfig } from '../content/types';

function updateBadge(enabled: boolean): void {
  const text = enabled ? 'ON' : '';
  const color = enabled ? '#22c55e' : '#6b7280';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Set initial badge state
getConfig((config) => {
  updateBadge(config.enabled);
});

// Update badge when config changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) {
    updateBadge(changes.enabled.newValue as boolean);
  }
});

// Forward config changes to all tabs
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'sync') return;

  getConfig((config) => {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'CONFIG_CHANGED',
            config,
          }).catch(() => {
            // Tab may not have content script loaded
          });
        }
      }
    });
  });
});
