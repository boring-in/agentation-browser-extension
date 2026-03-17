import { DEFAULT_CONFIG, getConfig, isSiteDisabled, setConfig, type ExtensionConfig } from '../content/types';
import { McpBridge } from '../content/mcp-bridge';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabledEl = $<HTMLInputElement>('enabled');
const mcpSyncEl = $<HTMLInputElement>('mcpSync');
const mcpUrlEl = $<HTMLInputElement>('mcpUrl');
const pageDot = $<HTMLElement>('pageDot');
const statusText = $<HTMLSpanElement>('statusText');
const sessionField = $<HTMLDivElement>('sessionField');
const sessionIdEl = $<HTMLElement>('sessionId');
const copySessionBtn = $<HTMLButtonElement>('copySession');
const mcpDot = $<HTMLElement>('mcpDot');
const mcpStatusText = $<HTMLSpanElement>('mcpStatusText');
const copyCmdBtn = $<HTMLButtonElement>('copyCmd');
const versionUpdateEl = $<HTMLElement>('versionUpdate');
const mcpDetailEl = $<HTMLDivElement>('mcpDetail');
const blockSiteBtn = $<HTMLButtonElement>('blockSite');
const currentHostnameEl = $<HTMLElement>('currentHostname');
const blockedListEl = $<HTMLDivElement>('blockedList');
const consoleCaptureEl = $<HTMLInputElement>('consoleCapture');
const consoleDot = $<HTMLElement>('consoleDot');
const consoleStatusText = $<HTMLElement>('consoleStatusText');
const consoleActionsEl = $<HTMLDivElement>('consoleActions');
const errorCountEl = $<HTMLElement>('errorCount');
const copyErrorsBtn = $<HTMLButtonElement>('copyErrors');
const clearErrorsBtn = $<HTMLButtonElement>('clearErrors');

declare const __AGENTATION_VERSION__: string;

let currentConfig: ExtensionConfig = DEFAULT_CONFIG;
let activeTabHostname: string | null = null;


// Check for newer agentation version
fetch('https://registry.npmjs.org/agentation/latest', { signal: AbortSignal.timeout(5000) })
  .then((res) => res.json())
  .then((data: { version?: string }) => {
    if (data.version && data.version !== __AGENTATION_VERSION__) {
      versionUpdateEl.textContent = `${__AGENTATION_VERSION__} → ${data.version}`;
      versionUpdateEl.title = `npx agentation-mcp@latest`;
      versionUpdateEl.style.display = 'inline';
      versionUpdateEl.style.cursor = 'pointer';
      versionUpdateEl.addEventListener('click', () => {
        navigator.clipboard.writeText('npx agentation-mcp@latest');
        versionUpdateEl.textContent = 'Copied!';
        setTimeout(() => {
          versionUpdateEl.textContent = `${__AGENTATION_VERSION__} → ${data.version}`;
        }, 1200);
      });
    }
  })
  .catch(() => {});

// Check MCP server status
function checkMcpStatus(url: string): void {
  mcpDot.className = 'dot dot--off';
  mcpStatusText.textContent = 'Checking...';
  copyCmdBtn.style.display = 'none';

  fetch(`${url}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) })
    .then((res) => {
      if (res.ok) {
        mcpDot.className = 'dot dot--on';
        mcpStatusText.textContent = 'Online';
        copyCmdBtn.style.display = 'none';
        mcpIsOnline = true;
        updateConsoleErrorsUI(consoleCaptureEl.checked);
      } else {
        setMcpOffline();
      }
    })
    .catch(() => {
      setMcpOffline();
    });
}

function setMcpOffline(): void {
  mcpDot.className = 'dot dot--off';
  mcpStatusText.textContent = 'Offline';
  copyCmdBtn.style.display = 'inline-flex';
  mcpIsOnline = false;
  updateConsoleErrorsUI(consoleCaptureEl.checked);
}

// Copy start command
copyCmdBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('npx agentation-mcp');
  copyCmdBtn.classList.add('copied');
  setTimeout(() => copyCmdBtn.classList.remove('copied'), 1200);
});

// --- Page status ---

function isSiteBlocked(): boolean {
  if (!activeTabHostname) return false;
  return isSiteDisabled(activeTabHostname, currentConfig.disabledSites);
}

function updatePageStatus(): void {
  if (!currentConfig.enabled) {
    pageDot.className = 'dot dot--off';
    statusText.textContent = 'Disabled';
  } else if (isSiteBlocked()) {
    pageDot.className = 'dot dot--off';
    statusText.textContent = 'Disabled on this site';
  } else {
    pageDot.className = 'dot dot--on';
    statusText.textContent = 'Active';
  }
}

// --- MCP detail visibility ---

function updateMcpDetail(visible: boolean): void {
  mcpDetailEl.classList.toggle('visible', visible);
}

// --- Blocked sites ---

function renderBlockedList(): void {
  blockedListEl.innerHTML = '';
  for (const site of currentConfig.disabledSites) {
    const item = document.createElement('div');
    item.className = 'blocked-item';

    const label = document.createElement('span');
    label.textContent = site;

    const removeBtn = document.createElement('button');
    removeBtn.title = 'Remove';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', () => {
      currentConfig = {
        ...currentConfig,
        disabledSites: currentConfig.disabledSites.filter((s) => s !== site),
      };
      setConfig(currentConfig);
      renderBlockedList();
      updateBlockButton();
      updatePageStatus();
    });

    item.appendChild(label);
    item.appendChild(removeBtn);
    blockedListEl.appendChild(item);
  }
}

function updateBlockButton(): void {
  if (!activeTabHostname) {
    blockSiteBtn.style.display = 'none';
    return;
  }
  const alreadyBlocked = isSiteDisabled(activeTabHostname, currentConfig.disabledSites);
  if (alreadyBlocked) {
    blockSiteBtn.style.display = 'none';
  } else {
    blockSiteBtn.style.display = 'flex';
    currentHostnameEl.textContent = activeTabHostname;
  }
}

blockSiteBtn.addEventListener('click', () => {
  if (!activeTabHostname) return;
  currentConfig = {
    ...currentConfig,
    disabledSites: [...currentConfig.disabledSites, activeTabHostname],
  };
  setConfig(currentConfig);
  renderBlockedList();
  updateBlockButton();
  updatePageStatus();
});

// Load current config into UI
getConfig((config) => {
  currentConfig = config;
  enabledEl.checked = config.enabled;
  mcpSyncEl.checked = config.mcpSync;
  mcpUrlEl.value = config.mcpUrl;
  consoleCaptureEl.checked = config.consoleCapture;
  updateConsoleErrorsUI(config.consoleCapture);
  renderBlockedList();
  updateBlockButton();
  updatePageStatus();

  updateMcpDetail(config.mcpSync);
  if (config.mcpSync && config.mcpUrl) {
    checkMcpStatus(config.mcpUrl);
  } else {
    mcpDot.className = 'dot dot--off';
    mcpStatusText.textContent = 'Disabled';
  }
});

// Query active tab for hostname and session ID
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;

  // Extract hostname for block button and status
  if (tab.url) {
    try {
      activeTabHostname = new URL(tab.url).hostname;
      updateBlockButton();
      updatePageStatus();
    } catch {
      // chrome:// or other special URLs
    }
  }

  // Query content script for session ID and error count
  chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    if (response.sessionId) {
      sessionField.style.display = 'block';
      sessionIdEl.textContent = response.sessionId;
    }
    if (response.errorCount > 0) {
      showErrorCount(response.errorCount);
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

// Auto-save
function saveConfig(): void {
  currentConfig = {
    ...currentConfig,
    enabled: enabledEl.checked,
    mcpSync: mcpSyncEl.checked,
    mcpUrl: McpBridge.isLocalUrl(mcpUrlEl.value.trim()) ? mcpUrlEl.value.trim() : DEFAULT_CONFIG.mcpUrl,
    consoleCapture: consoleCaptureEl.checked,
  };

  setConfig(currentConfig);
  updatePageStatus();
  updateMcpDetail(currentConfig.mcpSync);
  updateConsoleErrorsUI(currentConfig.consoleCapture);

  // Re-check MCP status when relevant settings change
  if (currentConfig.mcpSync && currentConfig.mcpUrl) {
    checkMcpStatus(currentConfig.mcpUrl);
  } else {
    mcpDot.className = 'dot dot--off';
    mcpStatusText.textContent = 'Disabled';
    copyCmdBtn.style.display = 'none';
    mcpIsOnline = false;
    updateConsoleErrorsUI(currentConfig.consoleCapture);
  }
}

let debounceTimer: ReturnType<typeof setTimeout>;
function saveConfigDebounced(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveConfig, 600);
}

// Toggles — save immediately
enabledEl.addEventListener('change', saveConfig);
mcpSyncEl.addEventListener('change', saveConfig);
consoleCaptureEl.addEventListener('change', () => {
  saveConfig();
  updateConsoleErrorsUI(consoleCaptureEl.checked);
});

// Text inputs — save after typing stops
mcpUrlEl.addEventListener('input', saveConfigDebounced);

// --- Console Errors ---

let mcpIsOnline = false;

function updateConsoleErrorsUI(enabled: boolean): void {
  consoleActionsEl.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    consoleDot.className = 'dot dot--off';
    consoleStatusText.textContent = 'Disabled';
  } else if (currentConfig.mcpSync && mcpIsOnline) {
    consoleDot.className = 'dot dot--on';
    consoleStatusText.textContent = 'Sending to MCP';
  } else {
    consoleDot.className = 'dot dot--off';
    consoleStatusText.textContent = 'Capture only';
  }
}

function showErrorCount(count: number): void {
  errorCountEl.textContent = `${count} error${count !== 1 ? 's' : ''}`;
  errorCountEl.style.display = 'inline';
}

function getActiveTabId(cb: (tabId: number) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) cb(tabs[0].id);
  });
}

copyErrorsBtn.addEventListener('click', () => {
  getActiveTabId((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: 'GET_CONSOLE_ERRORS' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      if (response.markdown) {
        navigator.clipboard.writeText(response.markdown);
        copyErrorsBtn.classList.add('copied');
        setTimeout(() => copyErrorsBtn.classList.remove('copied'), 1200);
      }
    });
  });
});

clearErrorsBtn.addEventListener('click', () => {
  getActiveTabId((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: 'CLEAR_CONSOLE_ERRORS' }, () => {
      if (chrome.runtime.lastError) return;
      showErrorCount(0);
    });
  });
});
