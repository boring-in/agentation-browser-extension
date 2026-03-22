import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DEFAULT_CONFIG, getConfig, isSiteDisabled, type ExtensionConfig } from './types';
import { McpBridge } from './mcp-bridge';
import {
  startListening,
  getCapturedErrors,
  clearCapturedErrors,
  formatErrorsMarkdown,
  errorToAnnotation,
  type ConsoleError,
} from './console-capture';

// Guarded require — if agentation crashes on this page, console capture still works.
// No static imports from 'agentation' allowed (even import type can leak in webpack).
let AgentationComponent: React.ComponentType<any> | null = null;
try {
  // @ts-expect-error — webpack replaces require() at build time
  const mod = require('agentation');
  AgentationComponent = mod.Agentation ?? mod.PageFeedbackToolbarCSS;
} catch {
  // agentation library failed to load on this page — widget unavailable
}

let root: Root | null = null;
let shadowContainer: ShadowRoot | null = null;
let currentSessionId: string | null = null;
let currentConfig: ExtensionConfig = DEFAULT_CONFIG;
let bridge: McpBridge | null = null;
let bridgeUrl: string = '';
let consoleListeningStarted = false;

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
  const host = window.location.hostname;
  const embeddedHosts = ['admin.shopify.com'];
  return embeddedHosts.some((h) => host === h || host.endsWith(`.${h}`));
}

function render(config: ExtensionConfig): void {
  if (!config.enabled || isSiteDisabled(window.location.hostname, config.disabledSites) || shouldSkipFrame()) {
    unmount();
    return;
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

  // Can't render if agentation library failed to load
  if (!AgentationComponent) return;

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

  const Widget = AgentationComponent;
  root.render(
    <Widget
      onAnnotationAdd={bridge ? async (a: any) => {
        await bridge!.addAnnotation(a);
        syncSessionIdToPopup();
      } : undefined}
      onAnnotationDelete={bridge ? (a: any) => bridge!.deleteAnnotation(a) : undefined}
      onAnnotationUpdate={bridge ? (a: any) => bridge!.updateAnnotation(a) : undefined}
      onAnnotationsClear={bridge ? (a: any[]) => bridge!.clearAnnotations(a) : undefined}
    />
  );
}

function onConsoleError(err: ConsoleError, isNew: boolean): void {
  if (isNew && bridge && currentConfig.mcpSync) {
    const annotation = errorToAnnotation(err);
    bridge.addAnnotation(annotation as any).then(() => syncSessionIdToPopup());
  }
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

function initConsoleCapture(config: ExtensionConfig): void {
  if (config.consoleCapture && !consoleListeningStarted) {
    startListening(onConsoleError);
    consoleListeningStarted = true;
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONFIG_CHANGED') {
    currentConfig = message.config;
    initConsoleCapture(currentConfig);
    render(currentConfig);
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({
      type: 'STATUS',
      injected: !!root,
      sessionId: currentSessionId,
      isIframe,
      errorCount: getCapturedErrors().length,
    });
    return true;
  }

  if (message.type === 'GET_CONSOLE_ERRORS') {
    sendResponse({
      errors: getCapturedErrors(),
      markdown: formatErrorsMarkdown(getCapturedErrors()),
    });
    return true;
  }

  if (message.type === 'CLEAR_CONSOLE_ERRORS') {
    clearCapturedErrors();
    sendResponse({ ok: true });
    return true;
  }
});

// Initial mount
getConfig((config) => {
  currentConfig = config;
  initConsoleCapture(config);
  render(currentConfig);
});
