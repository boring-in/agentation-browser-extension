import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Agentation } from 'agentation';
import { DEFAULT_CONFIG, getConfig, type ExtensionConfig } from './types';

let root: Root | null = null;
let shadowContainer: ShadowRoot | null = null;
let currentSessionId: string | null = null;
let currentConfig: ExtensionConfig = DEFAULT_CONFIG;

const isIframe = window !== window.top;

function isSiteDisabled(config: ExtensionConfig): boolean {
  const hostname = window.location.hostname;
  return config.disabledSites.some(
    (site) => hostname === site || hostname.endsWith(`.${site}`)
  );
}

/**
 * When running in an iframe host (e.g. Shopify admin), skip the top frame
 * so only the embedded app iframe gets the widget.
 */
function shouldSkipFrame(): boolean {
  if (isIframe) return false; // always render inside iframes
  // If the top frame contains a cross-origin iframe with our widget,
  // we'd get duplicates. Skip top frame on known embedded-app hosts.
  const host = window.location.hostname;
  const embeddedHosts = ['admin.shopify.com'];
  return embeddedHosts.some((h) => host === h || host.endsWith(`.${h}`));
}

function render(config: ExtensionConfig): void {
  if (!config.enabled || isSiteDisabled(config) || shouldSkipFrame()) {
    unmount();
    return;
  }

  if (!shadowContainer) {
    const wrapper = document.createElement('div');
    wrapper.id = 'agentation-ext-root';
    wrapper.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;';
    document.body.appendChild(wrapper);
    shadowContainer = wrapper.attachShadow({ mode: 'open' });
  }

  if (!root) {
    const mountPoint = document.createElement('div');
    shadowContainer.appendChild(mountPoint);
    root = createRoot(mountPoint);
  }

  const mcpEnabled = config.mcpSync && config.mcpUrl;

  root.render(
    <Agentation
      endpoint={mcpEnabled ? config.mcpUrl : undefined}
      onSessionCreated={(sessionId: string) => {
        currentSessionId = sessionId;
        chrome.runtime.sendMessage({ type: 'SESSION_CREATED', sessionId });
      }}
    />
  );
}

function unmount(): void {
  if (root) {
    root.unmount();
    root = null;
  }
  const el = document.getElementById('agentation-ext-root');
  if (el) {
    el.remove();
  }
  shadowContainer = null;
  currentSessionId = null;
}

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONFIG_CHANGED') {
    currentConfig = message.config;
    render(currentConfig);
  }

  if (message.type === 'TOGGLE_WIDGET') {
    currentConfig.enabled = !currentConfig.enabled;
    render(currentConfig);
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({
      type: 'STATUS',
      injected: !!root,
      sessionId: currentSessionId,
      isIframe,
    });
    return true;
  }
});

// Initial mount
getConfig((config) => {
  currentConfig = config;
  render(currentConfig);
});

// React to storage changes (e.g. settings changed from another tab)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  for (const [key, { newValue }] of Object.entries(changes)) {
    (currentConfig as unknown as Record<string, unknown>)[key] = newValue;
  }

  render(currentConfig);
});
