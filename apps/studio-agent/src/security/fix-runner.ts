/**
 * Spawn a fix command (`npm install pkg@ver`, `npm audit fix`, or
 * `npm audit fix --force`) in the host project's cwd and stream its
 * output back to the engine line-by-line.
 *
 * The runner is intentionally policy-free: it neither decides what
 * command to run (that's the fix-resolver's job) nor what to do with
 * the result (the engine triggers a rescan). It just owns spawning,
 * timeouts, buffer caps, and line splitting.
 *
 * **Safety constraints**
 *   - Only commands matching a small allow-list of fix kinds run. The
 *     command string from the WS message is never forwarded to the
 *     shell verbatim; the runner re-builds the argv from a vetted
 *     `kind` enum + optional `pkg@version` tuple.
 *   - 10 min hard timeout. `npm install` over a slow network can easily
 *     take a few minutes; anything beyond that is a hung process.
 *   - 4 MB stdout / 256 KB stderr caps so a runaway can't OOM the agent.
 */

import { spawn, type ChildProcess } from 'node:child_process';

/** Lifecycle states surfaced to the UI for the "fix in progress" banner. */
export type FixState = 'running' | 'success' | 'error';

/** Caller-supplied identifier echoed in progress/result frames. */
export type FixTargetId = string;

/** The discrete kinds of fix invocations the runner will accept. */
export type FixCommandKind =
  | 'install'           // npm install <pkg>@<version>
  | 'audit-fix'         // npm audit fix
  | 'audit-fix-force';  // npm audit fix --force

/** Parameters describing the fix command to spawn. */
export interface FixRunInput {
  /** Host project root the command runs in. */
  cwd: string;
  kind: FixCommandKind;
  /** Required for `kind: 'install'`. */
  package?: string;
  /** Required for `kind: 'install'`. */
  version?: string;
  /** Identifier echoed back via progress/result frames. */
  targetId: FixTargetId;
}

/** Final state of a completed (or failed) fix command. */
export interface FixRunResult {
  state: FixState;
  exitCode: number | null;
  command: string;
  durationMs: number;
  stdoutTail: string;
  stderrTail: string;
}

/** Callback invoked for each output line of an in-flight fix command. */
export type FixProgressHandler = (line: string, stream: 'stdout' | 'stderr') => void;

/** Hard cap for an in-flight fix command (10 min). */
const FIX_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
const MAX_STDERR_BYTES = 256 * 1024;

/**
 * Build the argv for `kind`. Returns `null` for an invalid input so
 * callers can fail fast without spawning anything.
 */
export function buildFixArgs(
  input: FixRunInput,
): { cmd: string; args: string[]; pretty: string } | null {
  switch (input.kind) {
    case 'install': {
      if (!input.package || !input.version) return null;
      // Keep the *exact* spec the resolver emitted — quoting is not
      // needed for spawn() because we bypass the shell.
      const spec = `${input.package}@${input.version}`;
      return {
        cmd: 'npm',
        args: ['install', spec],
        pretty: `npm install ${spec}`,
      };
    }
    case 'audit-fix':
      return { cmd: 'npm', args: ['audit', 'fix'], pretty: 'npm audit fix' };
    case 'audit-fix-force':
      return {
        cmd: 'npm',
        args: ['audit', 'fix', '--force'],
        pretty: 'npm audit fix --force',
      };
    default:
      return null;
  }
}

/**
 * Spawn the fix command, stream line-by-line progress through
 * `onProgress`, and resolve with the captured tails once the child
 * exits or the timeout fires.
 */
export function runFix(
  input: FixRunInput,
  onProgress: FixProgressHandler,
): Promise<FixRunResult> {
  return new Promise<FixRunResult>((resolve) => {
    const argv = buildFixArgs(input);
    if (!argv) {
      resolve({
        state: 'error',
        exitCode: null,
        command: '',
        durationMs: 0,
        stdoutTail: '',
        stderrTail: 'Invalid fix command (missing package/version for install).',
      });
      return;
    }

    const started = Date.now();
    let child: ChildProcess;
    try {
      child = spawn(argv.cmd, argv.args, {
        cwd: input.cwd,
        // npm on Windows is `npm.cmd`; the shell flag lets the OS resolve it.
        shell: process.platform === 'win32',
        env: process.env,
      });
    } catch (err) {
      resolve({
        state: 'error',
        exitCode: null,
        command: argv.pretty,
        durationMs: 0,
        stdoutTail: '',
        stderrTail: (err as Error).message || 'failed to spawn npm',
      });
      return;
    }

    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTail = '';
    let stderrTail = '';

    // Line buffer: hold partial lines across chunk boundaries so the UI
    // never sees a half-formed log entry. Flush on newline.
    let pendingOut = '';
    let pendingErr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      const text = chunk.toString('utf-8');
      if (stdoutBytes <= MAX_STDOUT_BYTES) {
        stdoutTail += text;
        if (stdoutTail.length > MAX_STDOUT_BYTES) {
          stdoutTail = stdoutTail.slice(-MAX_STDOUT_BYTES);
        }
      }
      pendingOut += text;
      pendingOut = flushLines(pendingOut, (line) => onProgress(line, 'stdout'));
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      const text = chunk.toString('utf-8');
      if (stderrBytes <= MAX_STDERR_BYTES) {
        stderrTail += text;
        if (stderrTail.length > MAX_STDERR_BYTES) {
          stderrTail = stderrTail.slice(-MAX_STDERR_BYTES);
        }
      }
      pendingErr += text;
      pendingErr = flushLines(pendingErr, (line) => onProgress(line, 'stderr'));
    });

    let settled = false;
    const settle = (state: FixState, code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Flush any trailing partial line.
      if (pendingOut.trim().length > 0) onProgress(pendingOut.trim(), 'stdout');
      if (pendingErr.trim().length > 0) onProgress(pendingErr.trim(), 'stderr');
      resolve({
        state,
        exitCode: code,
        command: argv.pretty,
        durationMs: Date.now() - started,
        stdoutTail,
        stderrTail,
      });
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // Process already exited — ignore.
      }
      // Give it a beat to clean up before we resolve as an error.
      setTimeout(() => settle('error', null), 250);
    }, FIX_TIMEOUT_MS);

    child.on('error', () => settle('error', null));
    child.on('close', (code) => {
      // npm install exits 0 on success. npm audit fix exits 0 on full
      // remediation; non-zero when issues remain (which from the
      // user's POV may still be progress). We treat any non-zero exit
      // as `error` so the UI surfaces it, but the rescan that follows
      // will accurately show the new state.
      settle(code === 0 ? 'success' : 'error', code ?? null);
    });
  });
}

/**
 * Split `buffer` on newlines, hand each complete line to `onLine`, and
 * return whatever partial line remains for next time.
 */
function flushLines(buffer: string, onLine: (line: string) => void): string {
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer.charCodeAt(i);
    if (ch !== 10 && ch !== 13) continue; // \n or \r
    const line = buffer.slice(start, i);
    if (line.length > 0) onLine(line);
    // Skip CRLF as a unit.
    if (ch === 13 && buffer.charCodeAt(i + 1) === 10) i++;
    start = i + 1;
  }
  return buffer.slice(start);
}
