/**
 * Spawn a test runner with coverage enabled and stream its output back
 * line-by-line. Generic and policy-free: the caller supplies a vetted
 * argv (from `framework-adapters`), this owns spawning, the timeout,
 * buffer caps, and line splitting. Modelled on the security fix-runner.
 */

import { spawn, type ChildProcess } from 'node:child_process';

/** Hard cap for a test run (10 min — slow suites + cold caches). */
const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
const MAX_STDERR_BYTES = 512 * 1024;

/** Command specification for an active coverage run. */
export interface CoverageRunInput {
  cwd: string;
  cmd: string;
  args: string[];
  pretty: string;
  /**
   * Run through the OS shell. Used only for a developer-configured
   * custom command string (`coverage.command`); vetted adapters leave
   * this unset and only opt into a shell on Windows.
   */
  shell?: boolean;
}

/** Final state of a completed (or failed) coverage run. */
export interface CoverageRunResult {
  state: 'success' | 'error';
  exitCode: number | null;
  command: string;
  durationMs: number;
  stdoutTail: string;
  stderrTail: string;
}

/** Callback invoked for each output line of an in-flight coverage run. */
export type RunProgressHandler = (line: string, stream: 'stdout' | 'stderr') => void;

/**
 * Spawn the command, stream progress through `onProgress`, and resolve
 * once the child exits or the timeout fires. Never throws — spawn
 * failures resolve as `state: 'error'`.
 */
export function runCoverageCommand(
  input: CoverageRunInput,
  onProgress: RunProgressHandler,
): Promise<CoverageRunResult> {
  return new Promise<CoverageRunResult>((resolve) => {
    const started = Date.now();
    let child: ChildProcess;
    try {
      child = spawn(input.cmd, input.args, {
        cwd: input.cwd,
        // npx / node resolve differently on Windows; the shell flag lets
        // the OS find the right binary. Vetted adapters pass only
        // constant args; `input.shell` is set solely for a developer's
        // own configured command string.
        shell: input.shell ?? process.platform === 'win32',
        env: process.env,
      });
    } catch (err) {
      resolve({
        state: 'error',
        exitCode: null,
        command: input.pretty,
        durationMs: 0,
        stdoutTail: '',
        stderrTail: (err as Error).message || 'failed to spawn test runner',
      });
      return;
    }

    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTail = '';
    let stderrTail = '';
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
    const settle = (state: CoverageRunResult['state'], code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (pendingOut.trim().length > 0) onProgress(pendingOut.trim(), 'stdout');
      if (pendingErr.trim().length > 0) onProgress(pendingErr.trim(), 'stderr');
      resolve({
        state,
        exitCode: code,
        command: input.pretty,
        durationMs: Date.now() - started,
        stdoutTail,
        stderrTail,
      });
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // already exited
      }
      setTimeout(() => settle('error', null), 250);
    }, RUN_TIMEOUT_MS);

    child.on('error', () => settle('error', null));
    child.on('close', (code) => settle(code === 0 ? 'success' : 'error', code ?? null));
  });
}

/** Split on newlines, emit complete lines, return the partial remainder. */
function flushLines(buffer: string, onLine: (line: string) => void): string {
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer.charCodeAt(i);
    if (ch !== 10 && ch !== 13) continue;
    const line = buffer.slice(start, i);
    if (line.length > 0) onLine(line);
    if (ch === 13 && buffer.charCodeAt(i + 1) === 10) i++;
    start = i + 1;
  }
  return buffer.slice(start);
}
