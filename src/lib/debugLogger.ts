// Global debug logger — intercepts console methods at module load time
// so every log from anywhere in the app is captured automatically.

export type LogLevel = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  time: string;
}

const MAX_LOGS = 300;
const entries: LogEntry[] = [];
let uid = 0;

// Subscribers that get notified when a new log arrives
const subscribers = new Set<(logs: LogEntry[]) => void>();

function notify() {
  subscribers.forEach(fn => fn([...entries]));
}

function push(level: LogLevel, args: unknown[]) {
  const message = args
    .map(a => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    })
    .join(' ');

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;

  entries.push({ id: uid++, level, message, time });
  if (entries.length > MAX_LOGS) entries.shift();
  notify();
}

// ─── Intercept console ───────────────────────────────────────────────────────
const _log   = console.log.bind(console);
const _warn  = console.warn.bind(console);
const _error = console.error.bind(console);
const _info  = console.info.bind(console);

console.log   = (...a) => { _log(...a);   push('log',   a); };
console.warn  = (...a) => { _warn(...a);  push('warn',  a); };
console.error = (...a) => { _error(...a); push('error', a); };
console.info  = (...a) => { _info(...a);  push('info',  a); };

// ─── Public API ──────────────────────────────────────────────────────────────
export function subscribe(fn: (logs: LogEntry[]) => void): () => void {
  subscribers.add(fn);
  fn([...entries]); // send current snapshot immediately
  return () => subscribers.delete(fn);
}

export function clearLogs() {
  entries.length = 0;
  uid = 0;
  notify();
}

export function getLogs(): LogEntry[] {
  return [...entries];
}
