import type { Annotation } from 'agentation';

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

const CHANNEL = 'agentation-console-error';

/**
 * Inject a tiny script into the page's main world to intercept console.error.
 * Page-world errors are forwarded to the content script via postMessage.
 */
export function injectConsoleInterceptor(): void {
  const script = document.createElement('script');
  script.textContent = `(function(){
    if(window.__agentationConsoleHooked) return;
    window.__agentationConsoleHooked = true;
    var orig = console.error;
    console.error = function(){
      try {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.map(function(a){
          if(a instanceof Error) return a.stack || a.message;
          if(typeof a === 'object') try{ return JSON.stringify(a) }catch(e){ return String(a) }
          return String(a);
        }).join(' ');
        window.postMessage({type:'${CHANNEL}',payload:{
          id: crypto.randomUUID(),
          message: msg,
          timestamp: Date.now()
        }},'*');
      }catch(e){}
      return orig.apply(console, arguments);
    };
    window.addEventListener('error', function(e){
      window.postMessage({type:'${CHANNEL}',payload:{
        id: crypto.randomUUID(),
        message: e.message,
        source: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error && e.error.stack || '',
        timestamp: Date.now()
      }},'*');
    });
    window.addEventListener('unhandledrejection', function(e){
      var msg = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
      window.postMessage({type:'${CHANNEL}',payload:{
        id: crypto.randomUUID(),
        message: 'Unhandled Promise Rejection: ' + msg,
        timestamp: Date.now()
      }},'*');
    });
  })();`;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
}

/** Maximum unique errors to keep in memory */
const MAX_ERRORS = 100;

/** In-memory deduplicated error buffer */
const capturedErrors: ConsoleError[] = [];

/** message -> index in capturedErrors for O(1) dedup lookup */
const errorIndex = new Map<string, number>();

/**
 * Deduplicate key: message + source + line.
 * Two identical messages from different sources are treated as separate errors.
 */
function dedupeKey(msg: string, source?: string, lineno?: number): string {
  return `${msg}\0${source ?? ''}\0${lineno ?? ''}`;
}

/**
 * Returns true if the error is new (first occurrence), false if duplicate.
 */
function addOrMerge(incoming: ConsoleError): boolean {
  const key = dedupeKey(incoming.message, incoming.source, incoming.lineno);
  const existingIdx = errorIndex.get(key);

  if (existingIdx !== undefined) {
    const existing = capturedErrors[existingIdx];
    existing.count += 1;
    existing.lastSeen = incoming.timestamp;
    return false;
  }

  // New unique error
  if (capturedErrors.length >= MAX_ERRORS) {
    // Remove oldest and its index entry
    const removed = capturedErrors.shift()!;
    errorIndex.delete(dedupeKey(removed.message, removed.source, removed.lineno));
    // Rebuild indices after shift
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

/** Start listening for forwarded errors from the page world */
export function startListening(onError: (err: ConsoleError, isNew: boolean) => void): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== CHANNEL) return;
    const err = event.data.payload as ConsoleError;
    const isNew = addOrMerge(err);
    onError(err, isNew);
  });
}

export function getCapturedErrors(): ConsoleError[] {
  return [...capturedErrors];
}

export function clearCapturedErrors(): void {
  capturedErrors.length = 0;
  errorIndex.clear();
}

/** Convert a ConsoleError to an Annotation with synthetic element fields */
export function errorToAnnotation(err: ConsoleError): Annotation {
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
