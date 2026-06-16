/**
 * Git diff-coverage — Studio's headline local feature.
 *
 * "Of the lines you actually changed, which are still uncovered?"
 * computed against the working tree (uncommitted) or a base ref, before
 * anything is pushed. We get changed line ranges from `git diff
 * --unified=0`, intersect them with each file's coverable line set, and
 * report covered / uncovered changed lines per file and overall.
 *
 * Everything here is best-effort: not a git repo, git missing, detached
 * HEAD with no commits — each path resolves to an `unavailable`
 * `DiffCoverage` with a human reason, never a throw.
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import type { DiffCoverage, DiffFileCoverage, FileCoverage } from '../types/index.js';
import { pctOf } from './metrics.js';

const GIT_TIMEOUT_MS = 10_000;

interface GitResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Compute diff coverage for `files`. `baseOverride` (a git ref) forces
 * the comparison base; otherwise we prefer the merge-base with
 * `origin/HEAD` (what a PR would diff against) and fall back to the
 * working tree vs `HEAD`.
 */
export async function computeDiffCoverage(
  cwd: string,
  files: FileCoverage[],
  baseOverride?: string,
): Promise<DiffCoverage> {
  const root = await gitTopLevel(cwd);
  if (!root) {
    return unavailable('Not a git repository (or git is not installed).');
  }

  const base = await resolveBase(cwd, baseOverride);
  const diff = await runGit(cwd, ['diff', '--unified=0', '--no-color', base.diffArg, '--']);
  if (diff.code === null) {
    return unavailable('git diff timed out.');
  }
  if (diff.code !== 0 && diff.stdout.length === 0) {
    return unavailable(extractGitError(diff.stderr) || `git diff exited ${diff.code}.`);
  }

  const changedByAbs = parseDiff(diff.stdout, root);

  // Index coverage by absolute path so we match regardless of whether the
  // artifact reported absolute or cwd-relative paths.
  const covByAbs = new Map<string, FileCoverage>();
  for (const f of files) {
    covByAbs.set(path.resolve(cwd, f.path), f);
  }

  const diffFiles: DiffFileCoverage[] = [];
  let changedTotal = 0;
  let coveredTotal = 0;

  for (const [abs, addedLines] of changedByAbs) {
    const cov = covByAbs.get(abs);
    if (!cov) continue;

    const coveredSet = new Set(cov.coveredLines);
    const uncoveredSet = new Set(cov.uncoveredLines);

    const coveredChanged: number[] = [];
    const uncoveredChanged: number[] = [];
    for (const ln of addedLines) {
      if (coveredSet.has(ln)) coveredChanged.push(ln);
      else if (uncoveredSet.has(ln)) uncoveredChanged.push(ln);
      // Lines that are neither covered nor uncovered are non-executable
      // (blank lines, comments, braces) and don't count toward diff cov.
    }

    const coverableChanged = coveredChanged.length + uncoveredChanged.length;
    if (coverableChanged === 0) continue;

    changedTotal += coverableChanged;
    coveredTotal += coveredChanged.length;

    diffFiles.push({
      path: cov.path,
      relPath: cov.relPath,
      changedLines: [...coveredChanged, ...uncoveredChanged].sort((a, b) => a - b),
      coveredChanged: coveredChanged.sort((a, b) => a - b),
      uncoveredChanged: uncoveredChanged.sort((a, b) => a - b),
      pct: pctOf(coveredChanged.length, coverableChanged),
    });
  }

  diffFiles.sort((a, b) => a.pct - b.pct || a.relPath.localeCompare(b.relPath));

  return {
    base: base.label,
    changedLineCount: changedTotal,
    coveredLineCount: coveredTotal,
    uncoveredLineCount: changedTotal - coveredTotal,
    pct: pctOf(coveredTotal, changedTotal),
    files: diffFiles,
  };
}

/**
 * Parse `git diff --unified=0` output into a map of absolute file path →
 * added/modified line numbers. Only the new-side (`+c,d`) ranges matter
 * for coverage; deleted lines aren't executable in the new tree.
 */
function parseDiff(stdout: string, root: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  let currentAbs: string | null = null;

  for (const line of stdout.split('\n')) {
    if (line.startsWith('+++ ')) {
      // "+++ b/src/foo.ts" or "+++ /dev/null" for deletions.
      const p = line.slice(4).trim();
      if (p === '/dev/null') {
        currentAbs = null;
        continue;
      }
      const rel = p.replace(/^b\//, '');
      currentAbs = path.resolve(root, rel);
      if (!out.has(currentAbs)) out.set(currentAbs, []);
      continue;
    }
    if (line.startsWith('@@') && currentAbs) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(line);
      if (!m) continue;
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      if (count === 0) continue; // pure deletion hunk
      const arr = out.get(currentAbs)!;
      for (let i = 0; i < count; i++) arr.push(start + i);
    }
  }

  // Drop files that ended up with no added lines.
  for (const [k, v] of out) if (v.length === 0) out.delete(k);
  return out;
}

/** Resolve the comparison base: explicit override → origin merge-base → HEAD. */
async function resolveBase(
  cwd: string,
  override?: string,
): Promise<{ diffArg: string; label: string }> {
  if (override && override.trim()) {
    const ref = override.trim();
    if (await isValidRef(cwd, ref)) return { diffArg: ref, label: ref };
  }

  // Prefer what a PR would compare against: the merge-base with the
  // upstream default branch. `origin/HEAD` resolves to e.g. origin/main.
  const mb = await runGit(cwd, ['merge-base', 'HEAD', 'origin/HEAD']);
  if (mb.code === 0) {
    const sha = mb.stdout.trim();
    if (sha) return { diffArg: sha, label: 'origin/HEAD' };
  }

  // Fall back to uncommitted + committed-since changes vs HEAD (working
  // tree). When there are no commits at all this still works against the
  // empty tree via git's implicit handling.
  return { diffArg: 'HEAD', label: 'HEAD (working tree)' };
}

async function isValidRef(cwd: string, ref: string): Promise<boolean> {
  const r = await runGit(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return r.code === 0 && r.stdout.trim().length > 0;
}

async function gitTopLevel(cwd: string): Promise<string | null> {
  const r = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (r.code !== 0) return null;
  const top = r.stdout.trim();
  return top.length > 0 ? top : null;
}

function unavailable(reason: string): DiffCoverage {
  return {
    base: '',
    changedLineCount: 0,
    coveredLineCount: 0,
    uncoveredLineCount: 0,
    pct: 100,
    files: [],
    unavailable: true,
    reason,
  };
}

function extractGitError(stderr: string): string {
  const first = stderr
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return first ?? '';
}

/** Spawn git with a hard timeout; never throws. */
function runGit(cwd: string, args: string[]): Promise<GitResult> {
  return new Promise<GitResult>((resolve) => {
    let child;
    try {
      child = spawn('git', args, {
        cwd,
        shell: process.platform === 'win32',
        env: process.env,
      });
    } catch (err) {
      resolve({ code: null, stdout: '', stderr: (err as Error).message });
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (c: Buffer) => {
      if (stdout.length < 8 * 1024 * 1024) stdout += c.toString('utf-8');
    });
    child.stderr?.on('data', (c: Buffer) => {
      if (stderr.length < 64 * 1024) stderr += c.toString('utf-8');
    });

    let settled = false;
    const settle = (r: GitResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // already gone
      }
      settle({ code: null, stdout, stderr });
    }, GIT_TIMEOUT_MS);

    child.on('error', (err) => settle({ code: null, stdout, stderr: err.message }));
    child.on('close', (code) => settle({ code, stdout, stderr }));
  });
}
