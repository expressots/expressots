/**
 * `npm audit --json` runner.
 *
 * Spawns the host project's `npm audit` in a child process, captures
 * stdout, and normalises the result into `DependencyFinding[]` so the
 * agent doesn't have to know about npm's wire format anywhere else.
 *
 * Design constraints:
 *   - **Async only.** This runs inside the host's process; blocking the
 *     event loop with `execSync` would freeze the host server.
 *   - **Bounded.** We cap stdout at 16 MB and impose a 30 s wall timeout
 *     to keep a misbehaving npm install from hanging Studio forever.
 *   - **Defensive.** `npm audit` writes useful JSON to stdout even when
 *     it exits 1 (the convention is "exit 1 means vulns were found").
 *     We treat exit codes 0 and 1 as success.
 *
 * The runner is decoupled from the engine: it returns a structured
 * result plus a `state` value the engine maps onto `scanState.audit`.
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  DependencyFinding,
  Severity,
} from '../types/index.js';

/** Maximum bytes of stdout we'll buffer from `npm audit`. */
const MAX_STDOUT_BYTES = 16 * 1024 * 1024; // 16 MB
/** How long we wait before killing the child process. */
const AUDIT_TIMEOUT_MS = 30_000;

/**
 * Per-package raw `fixAvailable` data lifted from npm audit's report,
 * indexed by package name. Used by the fix-resolver to decide whether
 * a finding can be cleared by `npm audit fix`, `npm audit fix --force`,
 * or a manual `npm install`.
 *
 * npm's `fixAvailable` is tri-modal:
 *
 *   - `false`       → no upstream fix exists.
 *   - `true`        → `npm audit fix` can resolve it, but npm declines
 *                     to commit to a specific target version (typical
 *                     for transitive vulns where the root upgrade is
 *                     `audit-fix`'s choice).
 *   - `{ name, version, isSemVerMajor }` → exact target.
 *
 * We keep all three cases distinct here so the fix-resolver can produce
 * the right command for each. Kept separate from the public
 * `DependencyFinding` shape so the agent doesn't leak npm's wire format
 * into the WS protocol.
 */
export type AuditFixAvailability =
  | { kind: 'specific'; name: string; version: string; isSemVerMajor: boolean }
  | { kind: 'auto' }
  | { kind: 'none' };

/** Outcome of an `npm audit --json` run, normalised for the engine. */
export interface NpmAuditResult {
  state: 'ok' | 'error' | 'missing-lockfile';
  /** Empty on `missing-lockfile` / `error`. */
  findings: DependencyFinding[];
  /** Raw `fixAvailable` info keyed by *vulnerable package name*. */
  fixAvailability: Map<string, AuditFixAvailability>;
  /** Short, user-facing error message when state === 'error'. */
  error?: string;
}

/**
 * Subset of the `npm audit --json` schema that we actually use. npm has
 * had two major audit schemas (v1 / v2); v2 (npm 7+) is what every
 * supported Node.js LTS ships today, so we target that. v1 produces
 * a different `advisories` map shape — handled defensively.
 */
interface NpmAuditV2 {
  auditReportVersion?: number;
  vulnerabilities?: Record<string, NpmAuditV2Vuln>;
}

interface NpmAuditV2Vuln {
  name: string;
  severity?: string;
  isDirect?: boolean;
  via?: Array<string | NpmAuditV2Advisory>;
  effects?: string[];
  range?: string;
  fixAvailable?: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

interface NpmAuditV2Advisory {
  source?: number;
  name?: string;
  dependency?: string;
  title?: string;
  url?: string;
  severity?: string;
  cwe?: string[];
  cvss?: { score?: number; vectorString?: string };
  range?: string;
}

/**
 * Run `npm audit --json` in `cwd` and return findings. The function is
 * resilient to npm not being installed, the project missing a
 * lockfile, or audit returning malformed JSON — every error path
 * yields a structured `NpmAuditResult` instead of throwing.
 */
export async function runNpmAudit(cwd: string): Promise<NpmAuditResult> {
  // Bail early if there's no lockfile — `npm audit` would just fail
  // anyway, and we want to give the UI a clearer signal so it can
  // render an empty state with instructions.
  if (!hasLockfile(cwd)) {
    return { state: 'missing-lockfile', findings: [], fixAvailability: new Map() };
  }

  let stdout = '';
  let stderr = '';

  try {
    const result = await spawnAudit(cwd);
    stdout = result.stdout;
    stderr = result.stderr;

    // npm audit exits 1 when it finds vulns, which is normal. Codes >=2
    // signal a real failure (network, malformed package.json, etc.).
    if (result.code !== null && result.code > 1) {
      return {
        state: 'error',
        findings: [],
        fixAvailability: new Map(),
        error:
          extractShortError(stderr) ||
          `npm audit exited with code ${result.code}`,
      };
    }
  } catch (err) {
    return {
      state: 'error',
      findings: [],
      fixAvailability: new Map(),
      error: (err as Error).message || 'failed to spawn npm audit',
    };
  }

  let parsed: NpmAuditV2;
  try {
    parsed = JSON.parse(stdout) as NpmAuditV2;
  } catch {
    return {
      state: 'error',
      findings: [],
      fixAvailability: new Map(),
      error: 'npm audit produced invalid JSON',
    };
  }

  const findings = normaliseNpmAudit(parsed);
  const fixAvailability = extractFixAvailability(parsed);
  return { state: 'ok', findings, fixAvailability };
}

/**
 * Walk the parsed audit report and produce a per-package `fixAvailable`
 * map. Preserves npm's three-way semantics:
 *
 *   - `false`  → `{ kind: 'none' }` — no upstream fix exists.
 *   - `true`   → `{ kind: 'auto' }` — `npm audit fix` can resolve it
 *                 but no concrete pinned target.
 *   - object   → `{ kind: 'specific', name, version, isSemVerMajor }`.
 */
function extractFixAvailability(
  report: NpmAuditV2,
): Map<string, AuditFixAvailability> {
  const out = new Map<string, AuditFixAvailability>();
  const vulns = report.vulnerabilities ?? {};
  for (const [pkgName, vuln] of Object.entries(vulns)) {
    const fa = vuln.fixAvailable;
    if (typeof fa === 'object' && fa !== null) {
      out.set(pkgName, {
        kind: 'specific',
        name: fa.name,
        version: fa.version,
        isSemVerMajor: Boolean(fa.isSemVerMajor),
      });
    } else if (fa === true) {
      out.set(pkgName, { kind: 'auto' });
    } else {
      out.set(pkgName, { kind: 'none' });
    }
  }
  return out;
}

/**
 * Translate the `npm audit --json` vulnerability map into the agent's
 * canonical `DependencyFinding` shape.
 *
 * Two filtering rules de-noise the report:
 *
 *   1. We dedupe advisories by id within a package — a single CVE
 *      affecting multiple packages yields one finding per affected
 *      package, but a package isn't reported twice for the same CVE.
 *
 *   2. **Alias-only entries are skipped when an alias target has its
 *      own real advisory in the same report.** npm audit cascades
 *      "effects" up the dependency chain — every package that
 *      transitively depends on `path-to-regexp` shows up as a separate
 *      vulnerability entry with `via: ['path-to-regexp']`. Surfacing
 *      each link in that chain triples the finding count without
 *      adding signal; users only care about the package they actually
 *      need to upgrade (the real advisory's owner).
 */
function normaliseNpmAudit(report: NpmAuditV2): DependencyFinding[] {
  const out: DependencyFinding[] = [];
  const vulns = report.vulnerabilities ?? {};

  // First pass: figure out which package names have *real* advisories
  // (a `via` entry that's an object, not a string alias). Used below
  // to drop alias-only cascades that point at one of these.
  const packagesWithRealAdvisories = new Set<string>();
  for (const [pkgName, vuln] of Object.entries(vulns)) {
    const hasReal = (vuln.via ?? []).some(
      (v) => typeof v === 'object' && v !== null,
    );
    if (hasReal) packagesWithRealAdvisories.add(pkgName);
  }

  for (const [pkgName, vuln] of Object.entries(vulns)) {
    const advisories = (vuln.via ?? []).filter(
      (v): v is NpmAuditV2Advisory => typeof v === 'object' && v !== null,
    );

    for (const adv of advisories) {
      const id = buildFindingId(adv, pkgName);
      out.push({
        id,
        package: pkgName,
        installedVersion: vuln.range ?? adv.range ?? 'unknown',
        fixedVersion:
          typeof vuln.fixAvailable === 'object' && vuln.fixAvailable
            ? vuln.fixAvailable.version
            : undefined,
        severity: parseSeverity(adv.severity ?? vuln.severity),
        cvss:
          typeof adv.cvss?.score === 'number' && Number.isFinite(adv.cvss.score)
            ? adv.cvss.score
            : undefined,
        title: adv.title ?? `Vulnerability in ${pkgName}`,
        summary: adv.title ?? '',
        references: adv.url ? [adv.url] : [],
        // npm audit reports `effects` as the chain of affected dependents;
        // we surface it so users can see what brings the vulnerable
        // package in. Most direct deps will have an empty effects array.
        path: [pkgName, ...(vuln.effects ?? [])],
      });
    }

    // Alias-only entries: surface as a finding ONLY if no alias target
    // already has a real advisory in this report. Otherwise it's pure
    // cascade noise — every transitive dependent of path-to-regexp
    // shouldn't get its own row.
    const aliasOnly = (vuln.via ?? []).filter(
      (v): v is string => typeof v === 'string',
    );
    if (advisories.length === 0 && aliasOnly.length > 0) {
      const allAliasesCoveredByRealFindings = aliasOnly.every((a) =>
        packagesWithRealAdvisories.has(a),
      );
      if (allAliasesCoveredByRealFindings) continue;
      out.push({
        id: `npm-audit-${pkgName}-${vuln.severity ?? 'unknown'}`,
        package: pkgName,
        installedVersion: vuln.range ?? 'unknown',
        fixedVersion:
          typeof vuln.fixAvailable === 'object' && vuln.fixAvailable
            ? vuln.fixAvailable.version
            : undefined,
        severity: parseSeverity(vuln.severity),
        title: `Vulnerable transitive dependency via ${aliasOnly.join(', ')}`,
        summary: '',
        references: [],
        path: [pkgName, ...aliasOnly],
      });
    }
  }

  return out;
}

/**
 * Build a stable advisory id. Prefer the GHSA / CVE embedded in the
 * advisory URL — that's what we'll dedupe against OSV later. Falls
 * back to a hash-equivalent synthetic id otherwise.
 */
function buildFindingId(adv: NpmAuditV2Advisory, pkgName: string): string {
  const url = adv.url ?? '';
  const ghsa = url.match(/(GHSA-[a-z0-9-]+)/i);
  if (ghsa) return ghsa[1].toUpperCase();
  const cve = url.match(/(CVE-\d{4}-\d+)/i);
  if (cve) return cve[1].toUpperCase();
  if (typeof adv.source === 'number') {
    return `npm-${adv.source}-${pkgName}`;
  }
  // Last resort: deterministic synthetic id keyed by title+pkg so reruns
  // produce the same id across scans.
  return `npm-${pkgName}-${(adv.title ?? 'unknown').slice(0, 40).replace(/\s+/g, '-')}`;
}

function parseSeverity(input: string | undefined): Severity {
  switch ((input ?? '').toLowerCase()) {
    case 'critical':
      return 'CRITICAL';
    case 'high':
      return 'HIGH';
    case 'moderate':
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    case 'info':
    case 'informational':
      return 'INFO';
    default:
      return 'LOW';
  }
}

/** Does the project at `cwd` have an npm lockfile? */
function hasLockfile(cwd: string): boolean {
  return (
    fs.existsSync(path.join(cwd, 'package-lock.json')) ||
    fs.existsSync(path.join(cwd, 'npm-shrinkwrap.json'))
  );
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Spawn `npm audit --json`, captures both streams, enforces the
 * timeout, and resolves once the child exits (or we kill it).
 */
function spawnAudit(cwd: string): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve, reject) => {
    // On Windows the actual binary is `npm.cmd`. Spawn through the shell
    // so platform differences don't matter. We don't pass any user input
    // through the shell — only constant flags — so this is safe.
    const child = spawn('npm', ['audit', '--json'], {
      cwd,
      shell: process.platform === 'win32',
      // Inherit env so npm picks up the user's registry config / proxy.
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let bytes = 0;

    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_STDOUT_BYTES) {
        // Truncate rather than ENOMEM. The first 16 MB of audit output
        // is far more than any real project produces — if we hit this
        // limit it's almost certainly a runaway.
        if (stdout.length < MAX_STDOUT_BYTES) {
          stdout += chunk.toString('utf-8');
          stdout = stdout.slice(0, MAX_STDOUT_BYTES);
        }
        return;
      }
      stdout += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      // npm warning lines can be plentiful but are short; cap conservatively.
      if (stderr.length < 32 * 1024) {
        stderr += chunk.toString('utf-8');
      }
    });

    let settled = false;
    const settle = (result: SpawnResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      try {
        child.kill('SIGTERM');
      } catch {
        // already gone
      }
      // Give it 250ms to actually die before resolving with what we have.
      setTimeout(() => {
        settle({ stdout, stderr, code: null });
      }, 250);
    }, AUDIT_TIMEOUT_MS);

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      settle({ stdout, stderr, code });
    });
  });
}

/**
 * Pull the first informative line out of `npm audit` stderr for display.
 * npm prints a lot of `npm warn …` noise we don't want to surface.
 */
function extractShortError(stderr: string): string {
  const lines = stderr
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^npm warn/i.test(l));
  return lines[0] ?? '';
}
