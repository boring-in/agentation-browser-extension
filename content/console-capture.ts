export interface ConsoleError {
  id: string;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: number;
  count: number;
  lastSeen: number;
}

/** Must match constants in console-injector.ts */
const ATTR = 'data-agentation-errors';
const CHANNEL = 'agentation-console-error';

/** Maximum unique errors to keep in memory */
const MAX_ERRORS = 100;

/** In-memory deduplicated error buffer */
const capturedErrors: ConsoleError[] = [];

/** message -> index in capturedErrors for O(1) dedup lookup */
const errorIndex = new Map<string, number>();

function dedupeKey(msg: string, source?: string, lineno?: number): string {
  return `${msg}\0${source ?? ''}\0${lineno ?? ''}`;
}

function addOrMerge(incoming: ConsoleError): boolean {
  const key = dedupeKey(incoming.message, incoming.source, incoming.lineno);
  const existingIdx = errorIndex.get(key);

  if (existingIdx !== undefined) {
    const existing = capturedErrors[existingIdx];
    existing.count += 1;
    existing.lastSeen = incoming.timestamp;
    return false;
  }

  if (capturedErrors.length >= MAX_ERRORS) {
    const removed = capturedErrors.shift()!;
    errorIndex.delete(dedupeKey(removed.message, removed.source, removed.lineno));
    errorIndex.clear();
    capturedErrors.forEach((e, i) => {
      errorIndex.set(dedupeKey(e.message, e.source, e.lineno), i);
    });
  }

  incoming.count = 1;
  incoming.lastSeen = incoming.timestamp;
  capturedErrors.push(incoming);
  errorIndex.set(key, capturedErrors.length - 1);
  return true;
}

let errorCallback: ((err: ConsoleError, isNew: boolean) => void) | null = null;

function processRawError(raw: Record<string, unknown>): void {
  const err = raw as unknown as ConsoleError;
  const isNew = addOrMerge(err);
  if (errorCallback) {
    errorCallback(err, isNew);
  }
}

/**
 * Self-initializing: listen for postMessage from the MAIN world injector.
 * postMessage is the recommended way to communicate between MAIN and ISOLATED worlds.
 */
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== CHANNEL) return;
  const payload = event.data.payload;
  if (payload) {
    processRawError(payload);
  }
});

/**
 * Register callback for error notifications.
 * On first call, reads the DOM attribute buffer to pick up any errors
 * that fired before the content script loaded (MAIN world runs at document_start,
 * content script runs at document_idle).
 */
export function startListening(onError: (err: ConsoleError, isNew: boolean) => void): void {
  errorCallback = onError;

  // Read buffered errors from DOM attribute (set by MAIN world injector)
  try {
    const raw = document.documentElement.getAttribute(ATTR);
    if (raw) {
      const buffered = JSON.parse(raw) as Record<string, unknown>[];
      for (const err of buffered) {
        processRawError(err);
      }
    }
  } catch { /* malformed */ }
}

export function getCapturedErrors(): ConsoleError[] {
  return [...capturedErrors];
}

export function clearCapturedErrors(): void {
  capturedErrors.length = 0;
  errorIndex.clear();
}

/** Convert a ConsoleError to an agentation-compatible annotation */
export function errorToAnnotation(err: ConsoleError): Record<string, unknown> {
  const source = err.source ? ` (${err.source}:${err.lineno ?? '?'})` : '';
  return {
    id: err.id,
    x: 0,
    y: 0,
    comment: err.message,
    element: `console.error${source}`,
    elementPath: 'window > console',
    timestamp: err.timestamp,
    intent: 'fix',
    severity: 'blocking',
    status: 'pending',
  };
}

/** Format captured errors as markdown matching agentation's copy output */
export function formatErrorsMarkdown(errors: ConsoleError[]): string {
  if (errors.length === 0) return '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const viewport = typeof window !== 'undefined' ? `${window.innerWidth}\u00D7${window.innerHeight}` : 'unknown';
  let output = `## Console Errors: ${pathname}\n`;
  output += `**Viewport:** ${viewport}\n\n`;
  errors.forEach((err, i) => {
    const time = new Date(err.timestamp).toISOString().slice(11, 23);
    const source = err.source ? ` (${err.source}:${err.lineno ?? '?'})` : '';
    const countSuffix = err.count > 1 ? ` (×${err.count})` : '';
    output += `${i + 1}. **console.error${source}** [${time}]: ${err.message}${countSuffix}\n`;
    if (err.stack && err.stack !== err.message) {
      output += `   \`\`\`\n   ${err.stack.split('\n').join('\n   ')}\n   \`\`\`\n`;
    }
  });
  return output;
}
