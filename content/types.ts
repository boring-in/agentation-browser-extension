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

/** Check whether a hostname matches any entry in the disabled-sites list. */
export function isSiteDisabled(hostname: string, disabledSites: string[]): boolean {
  return disabledSites.some(
    (site) => hostname === site || hostname.endsWith(`.${site}`)
  );
}