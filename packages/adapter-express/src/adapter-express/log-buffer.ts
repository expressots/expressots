/**
 * Console/stdout log buffering for the banner-first startup display.
 *
 * This lives in its own module rather than as static state on `AppExpress`
 * because `micro()` needs exactly one function from it — `disableBuffering()`
 * — and importing `AppExpress` to get it dragged the entire full-framework
 * stack (inversify-express-server, the DI container, middleware-service) into
 * every micro build. On a Cloudflare Worker that measured at 716 KiB raw /
 * 141 KiB gzip, roughly a quarter of the bundle, for a single static call.
 *
 * `AppExpress` re-exposes these as static methods, so the public API is
 * unchanged.
 *
 * Importing this module does NOT touch stdio. Nothing here runs until
 * `startLogBuffering()` is called explicitly.
 */
import * as fs from "node:fs";

type ConsoleMethods = {
  log: (...args: Array<unknown>) => void;
  info: (...args: Array<unknown>) => void;
  warn: (...args: Array<unknown>) => void;
  error: (...args: Array<unknown>) => void;
  debug: (...args: Array<unknown>) => void;
};

let originalStdoutWrite: typeof process.stdout.write | null = null;
let originalStderrWrite: typeof process.stderr.write | null = null;
let logBuffer: Array<string> = [];
let buffering = false;
let originalGlobalConsole: ConsoleMethods | null = null;

/**
 * Whether output is currently being captured.
 */
export function isBuffering(): boolean {
  return buffering;
}

/**
 * Start buffering all console output for the banner-first display flow.
 * Captures both `console.*` and direct `process.stdout.write` /
 * `process.stderr.write` calls so they can be flushed in the correct order
 * after the banner displays.
 *
 * Idempotent: calling this multiple times is safe.
 */
export function startLogBuffering(): void {
  if (buffering) return;

  // Store original streams
  originalStdoutWrite = process.stdout.write.bind(process.stdout);
  originalStderrWrite = process.stderr.write.bind(process.stderr);

  // Create wrapper functions that use fs.writeSync directly (always works
  // in both CJS and ESM scope - hence the static `node:fs` import above).
  const createOriginalConsoleMethod =
    (useStderr: boolean = false) =>
    (...args: Array<unknown>): void => {
      const message =
        args
          .map((a) => {
            if (typeof a === "object" && a !== null) {
              try {
                return JSON.stringify(a, null, 2);
              } catch {
                return String(a);
              }
            }
            return String(a);
          })
          .join(" ") + "\n";
      // Use fs.writeSync directly - this always works
      fs.writeSync(useStderr ? 2 : 1, message);
    };

  originalGlobalConsole = {
    log: createOriginalConsoleMethod(false),
    info: createOriginalConsoleMethod(false),
    warn: createOriginalConsoleMethod(true),
    error: createOriginalConsoleMethod(true),
    debug: createOriginalConsoleMethod(false),
  };

  logBuffer = [];
  buffering = true;

  // Create buffering functions for console methods
  const bufferConsoleMethod =
    () =>
    (...args: Array<unknown>): void => {
      const message =
        args
          .map((a) => (typeof a === "object" && a !== null ? JSON.stringify(a) : String(a)))
          .join(" ") + "\n";
      logBuffer.push(message);
    };

  // Override console methods directly (not replacing the console object)
  // This ensures even cached references to console.log will use the buffered version
  console.log = bufferConsoleMethod();
  console.info = bufferConsoleMethod();
  console.warn = bufferConsoleMethod();
  console.error = bufferConsoleMethod();
  console.debug = bufferConsoleMethod();

  // Also override process.stdout.write for direct writes (like our Logger)
  const bufferWrite = (chunk: string | Uint8Array): boolean => {
    const str = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    logBuffer.push(str);
    return true;
  };

  // Use direct assignment for overriding
  (process.stdout as unknown as { write: typeof bufferWrite }).write = bufferWrite;
  (process.stderr as unknown as { write: typeof bufferWrite }).write = bufferWrite;
}

/**
 * Stop buffering but keep the buffered logs for later flushing.
 * This restores normal console/stdout output.
 */
export function stopBuffering(): void {
  if (!buffering) return;

  // Restore original console methods using our wrapper functions
  if (originalGlobalConsole) {
    console.log = originalGlobalConsole.log;
    console.info = originalGlobalConsole.info;
    console.warn = originalGlobalConsole.warn;
    console.error = originalGlobalConsole.error;
    console.debug = originalGlobalConsole.debug;
  }

  // Restore original stdout/stderr by direct assignment
  // (Object.defineProperty may not work correctly for stream.write)
  if (originalStdoutWrite) {
    (process.stdout as unknown as { write: typeof process.stdout.write }).write =
      originalStdoutWrite;
  }
  if (originalStderrWrite) {
    (process.stderr as unknown as { write: typeof process.stderr.write }).write =
      originalStderrWrite;
  }

  buffering = false;
}

/**
 * Flush all buffered logs to stdout.
 * Should be called after stopBuffering() and after displaying the banner.
 */
export function flushBufferedLogs(): void {
  const logs = logBuffer;
  logBuffer = [];

  for (const log of logs) {
    if (originalStdoutWrite) {
      originalStdoutWrite.call(process.stdout, log);
    } else {
      process.stdout.write(log);
    }
  }
}

/**
 * Disable log buffering and discard anything captured so far. Called by
 * `micro()`, which does not use the banner system.
 */
export function disableBuffering(): void {
  stopBuffering();
  // Clear any buffered logs since micro() doesn't need them
  logBuffer = [];
}
