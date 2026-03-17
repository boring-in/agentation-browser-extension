import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Agentation } from 'agentation';
import { DEFAULT_CONFIG, getConfig, isSiteDisabled, type ExtensionConfig } from './types';
import { McpBridge } from './mcp-bridge';

let root: Root | null = null;
let shadowContainer: ShadowRoot | null = null;
let currentSessionId: string | null = null;
let currentConfig: ExtensionConfig = DEFAULT_CONFIG;
let bridge: McpBridge | null = null;
let bridgeUrl: string = '';

function getProjectId(): string {
  const { hostname, port, protocol } = window.location;
  const effectivePort = port || (protocol === 'https:' ? '443' : '80');
  return `${hostname}:${effectivePort}`;
}

function syncSessionIdToPopup(): void {
  if (bridge?.sessionId && bridge.sessionId !== currentSessionId) {
    currentSessionId = bridge.sessionId;
    chrome.runtime.sendMessage({ type: 'SESSION_CREATED', sessionId: currentSessionId });
  }
}

const isIframe = window !== window.top;

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
  if (!config.enabled || isSiteDisabled(window.location.hostname, config.disabledSites) || shouldSkipFrame()) {
    unmount();
    return;
  }

  if (!shadowContainer) {
    if (!document.body) return;
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

  // Bridge lifecycle: create/recreate only when mcpUrl changes
  if (config.mcpSync && config.mcpUrl) {
    if (!bridge || bridgeUrl !== config.mcpUrl) {
      bridge = new McpBridge(config.mcpUrl, getProjectId());
      bridgeUrl = config.mcpUrl;
    }
  } else {
    bridge = null;
    bridgeUrl = '';
  }

  root.render(
    <Agentation
      onAnnotationAdd={bridge ? async (a) => {
        await bridge!.addAnnotation(a);
        syncSessionIdToPopup();
      } : undefined}
      onAnnotationDelete={bridge ? (a) => bridge!.deleteAnnotation(a) : undefined}
      onAnnotationUpdate={bridge ? (a) => bridge!.updateAnnotation(a) : undefined}
      onAnnotationsClear={bridge ? (a) => bridge!.clearAnnotations(a) : undefined}
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

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONFIG_CHANGED') {
    currentConfig = message.config;
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
