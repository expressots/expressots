/**
 * LogCapture — intercepts `console.*` calls so Studio can stream the app's
 * stdout/stderr alongside requests, correlated by traceId when available.
 *
 * Design notes:
 * - We patch the global `console` once at agent startup and forward to the
 *   originals untouched, so the user still sees their logs in their own
 *   terminal exactly as before.
 * - A per-process AsyncLocalStorage carries the active traceId, populated
 *   by the Studio middleware. Logs emitted inside that scope are tagged.
 * - A re-entry guard prevents infinite recursion if a listener — or its
 *   transitive dependencies — happens to log.
 * - The buffer is bounded (default 1000 lines) and drops oldest first.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { inspect } from 'node:util';

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  traceId?: string;
}

interface LogContext {
  traceId: string;
}

/** Carries the active trace context for the current async chain. */
const requestContext = new AsyncLocalStorage<LogContext>();

/** Re-entry guard so `cb(entry) → console.log → handleLog → cb(entry)` can't loop. */
const REENTRY = Symbol.for('expressots.studio.log.reentry');

const LEVELS: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

export class LogCapture {
  private buffer: LogEntry[] = [];
  private readonly maxBuffer: number;
  /**
   * The "currently-installed" implementation for each level. Reading
   * `console[level]` always returns a stable wrapper that delegates to
   * the value stored here, so callers that assign to `console[level]`
   * (e.g. ExpressoTS's startup buffering, then its restore) end up
   * updating the cell instead of replacing our wrapper.
   */
  private readonly current = new Map<LogLevel, (...args: unknown[]) => void>();
  private listeners = new Set<(entry: LogEntry) => void>();
  private installed = false;

  constructor(maxBuffer = 1000) {
    this.maxBuffer = maxBuffer;
  }

  /**
   * Install a permanent hook on each console method. Uses an accessor
   * property so subsequent `console.log = …` assignments (which the
   * framework performs during its startup buffering lifecycle) are
   * absorbed by our setter rather than wiping out the wrapper.
   */
  install(): void {
    if (this.installed) return;
    this.installed = true;

    for (const level of LEVELS) {
      const cons = console as unknown as Record<LogLevel, (...args: unknown[]) => void>;
      // Seed with whatever is on `console` right now so the very first
      // call after install still forwards to the existing impl.
      const initial = cons[level];
      if (typeof initial === 'function') {
        this.current.set(level, initial.bind(console));
      }

      const wrapper = (...args: unknown[]): void => {
        const impl = this.current.get(level);
        if (impl) {
          try {
            impl.apply(console, args);
          } catch {
            // never let logging crash the app
          }
        }

        // Re-entry guard against feedback loops if a listener (or its
        // dependencies) happens to log.
        const sentinel = console as unknown as Record<symbol, boolean>;
        if (sentinel[REENTRY]) return;
        sentinel[REENTRY] = true;
        try {
          this.handleLog(level, args);
        } catch {
          // swallow
        } finally {
          sentinel[REENTRY] = false;
        }
      };

      Object.defineProperty(console, level, {
        configurable: true,
        enumerable: true,
        get: () => wrapper,
        // Anything that assigns to `console[level]` after we install
        // (e.g. framework `stopBuffering` restoring originals) becomes
        // the new delegate target — but the wrapper itself stays put.
        set: (next: (...args: unknown[]) => void) => {
          if (typeof next === 'function') {
            this.current.set(level, next.bind(console));
          }
        },
      });
    }
  }

  /** Restore the original console methods (used in tests / hot-reload). */
  uninstall(): void {
    if (!this.installed) return;
    for (const level of LEVELS) {
      const impl = this.current.get(level);
      // Replace our accessor with a plain data property of the latest impl
      // so reassignment semantics match Node's default console going forward.
      Object.defineProperty(console, level, {
        configurable: true,
        writable: true,
        enumerable: true,
        value: impl ?? (() => undefined),
      });
    }
    this.current.clear();
    this.installed = false;
  }

  /**
   * Run `fn` inside a request scope so any `console.*` calls during the
   * request body are tagged with the given traceId.
   */
  runWith<T>(traceId: string, fn: () => T): T {
    return requestContext.run({ traceId }, fn);
  }

  /** Subscribe to live log events. Returns an unsubscribe function. */
  onLog(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Snapshot of the in-memory ring buffer (oldest first). */
  getBuffer(): LogEntry[] {
    return this.buffer.slice();
  }

  /** Clear the in-memory buffer. */
  clear(): void {
    this.buffer = [];
  }

  private handleLog(level: LogLevel, args: unknown[]): void {
    const ctx = requestContext.getStore();
    const entry: LogEntry = {
      level,
      message: formatArgs(args),
      timestamp: Date.now(),
      traceId: ctx?.traceId,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      // Drop oldest. Splice once when over the cap (avoids a per-call shift).
      this.buffer.splice(0, this.buffer.length - this.maxBuffer);
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // never let a listener bubble
      }
    }
  }
}

/**
 * Format console arguments to a single readable string, using node's util.inspect
 * so objects/errors render the way developers expect (with stack traces, etc.).
 */
function formatArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  const parts: string[] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      parts.push(arg);
    } else if (arg instanceof Error) {
      parts.push(arg.stack || `${arg.name}: ${arg.message}`);
    } else {
      parts.push(
        inspect(arg, {
          depth: 4,
          colors: false,
          breakLength: 120,
          maxStringLength: 1000,
        }),
      );
    }
  }
  return parts.join(' ');
}
