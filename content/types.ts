export interface ExtensionConfig {
  enabled: boolean;
  mcpSync: boolean;
  mcpUrl: string;
  disabledSites: string[];
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
  mcpSync: false,
  mcpUrl: 'http://localhost:4747',
  disabledSites: [],
};

/** Type-safe wrapper for chrome.storage.sync.get */
export function getConfig(cb: (config: ExtensionConfig) => void): void {
  chrome.storage.sync.get(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    (stored) => cb(stored as unknown as ExtensionConfig)
  );
}

/** Type-safe wrapper for chrome.storage.sync.set */
export function setConfig(config: ExtensionConfig, cb?: () => void): void {
  chrome.storage.sync.set(config as unknown as Record<string, unknown>, cb ?? (() => {}));
}

export type MessageType =
  | { type: 'GET_CONFIG' }
  | { type: 'CONFIG_CHANGED'; config: ExtensionConfig }
  | { type: 'TOGGLE_WIDGET' }
  | { type: 'SESSION_CREATED'; sessionId: string }
  | { type: 'GET_STATUS' }
  | { type: 'STATUS'; injected: boolean; sessionId: string | null };
