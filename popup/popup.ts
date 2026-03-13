import { DEFAULT_CONFIG, getConfig, setConfig, type ExtensionConfig } from '../content/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabledEl = $<HTMLInputElement>('enabled');
const mcpSyncEl = $<HTMLInputElement>('mcpSync');
const mcpUrlEl = $<HTMLInputElement>('mcpUrl');
const disabledSitesEl = $<HTMLTextAreaElement>('disabledSites');
const saveBtn = $<HTMLButtonElement>('save');
const statusDot = document.querySelector('.dot') as HTMLElement;
const statusText = $<HTMLSpanElement>('statusText');
const sessionField = $<HTMLDivElement>('sessionField');
const sessionIdEl = $<HTMLElement>('sessionId');
const copySessionBtn = $<HTMLButtonElement>('copySession');

// Load current config into UI
getConfig((config) => {
  enabledEl.checked = config.enabled;
  mcpSyncEl.checked = config.mcpSync;
  mcpUrlEl.value = config.mcpUrl;
  disabledSitesEl.value = config.disabledSites.join('\n');
});

// Query active tab for widget status
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0]?.id;
  if (!tabId) return;

  chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusDot.className = 'dot dot--off';
      statusText.textContent = 'Not injected';
      return;
    }

    if (response.injected) {
      statusDot.className = 'dot dot--on';
      statusText.textContent = 'Active';
    } else {
      statusDot.className = 'dot dot--off';
      statusText.textContent = 'Disabled on this page';
    }

    if (response.sessionId) {
      sessionField.style.display = 'block';
      sessionIdEl.textContent = response.sessionId;
    }
  });
});

// Copy session ID
copySessionBtn.addEventListener('click', () => {
  const text = sessionIdEl.textContent;
  if (text) {
    navigator.clipboard.writeText(text);
  }
});

// Save config
saveBtn.addEventListener('click', () => {
  const config: ExtensionConfig = {
    enabled: enabledEl.checked,
    mcpSync: mcpSyncEl.checked,
    mcpUrl: mcpUrlEl.value.trim() || DEFAULT_CONFIG.mcpUrl,
    disabledSites: disabledSitesEl.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  setConfig(config, () => {
    saveBtn.textContent = 'Saved!';
    saveBtn.classList.add('saved-flash');
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.classList.remove('saved-flash');
    }, 1200);
  });
});
