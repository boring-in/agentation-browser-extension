/**
 * MAIN world script — runs in the page's JS context (not the extension's isolated world).
 * Loaded via manifest.json with "world": "MAIN", bypassing page CSP.
 *
 * Communication uses two channels:
 * 1. DOM attribute buffer — stores all errors as JSON so the content script
 *    can read them on init (covers errors that fire before content script loads)
 * 2. window.postMessage — real-time notification for errors after content script loads
 */

const ATTR = 'data-agentation-errors';
const CHANNEL = 'agentation-console-error';
const MAX_BUFFER = 100;

if (!(window as any).__agentationConsoleHooked) {
  (window as any).__agentationConsoleHooked = true;

  function pushError(err: Record<string, unknown>): void {
    try {
      // 1. Buffer in DOM attribute (persists, readable by isolated world)
      let buffer: unknown[] = [];
      try {
        buffer = JSON.parse(document.documentElement.getAttribute(ATTR) || '[]');
      } catch { /* empty */ }
      buffer.push(err);
      if (buffer.length > MAX_BUFFER) buffer.shift();
      document.documentElement.setAttribute(ATTR, JSON.stringify(buffer));

      // 2. postMessage for real-time notification (works across worlds)
      window.postMessage({ type: CHANNEL, payload: err }, '*');
    } catch {
      // never break the page
    }
  }

  const origError = console.error;

  console.error = function (...args: unknown[]) {
    try {
      const msg = args
        .map((a) => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch { return String(a); }
          }
          return String(a);
        })
        .join(' ');

      pushError({ id: crypto.randomUUID(), message: msg, timestamp: Date.now() });
    } catch {
      // never break the page
    }
    return origError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    pushError({
      id: crypto.randomUUID(),
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: (e.error && e.error.stack) || '',
      timestamp: Date.now(),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg =
      e.reason instanceof Error
        ? e.reason.stack || e.reason.message
        : String(e.reason);
    pushError({
      id: crypto.randomUUID(),
      message: 'Unhandled Promise Rejection: ' + msg,
      timestamp: Date.now(),
    });
  });
}
