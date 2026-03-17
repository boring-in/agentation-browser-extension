import { getConfig } from '../content/types';

function updateBadge(enabled: boolean): void {
  chrome.action.setBadgeText({ text: ' ' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#22c55e' : '#9ca3af' });
}

// Set initial badge state
getConfig((config) => {
  updateBadge(config.enabled);
});

// Single listener for all storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  // Update badge if enabled changed
  if (changes.enabled) {
    updateBadge(changes.enabled.newValue as boolean);
  }

  // Build config from changes and broadcast to all tabs
  getConfig((config) => {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'CONFIG_CHANGED',
            config,
          }).catch(() => {});
        }
      }
    });
  });
});
