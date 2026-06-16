/**
 * Compute concrete remediation steps for supply-chain findings.
 *
 * For each finding we want to answer two questions:
 *
 *   1. **What's the root cause?** For transitive vulns the user can't
 *      `npm install <vulnerable-pkg>@<fixedVersion>` — they have to
 *      bump whichever direct dep brought the package in. We resolve
 *      this from the lockfile graph.
 *
 *   2. **What's the fix command?** Either a one-liner the user can
 *      paste (`npm install pkg@^X`), `npm audit fix` for the
 *      automatic case, or `--force` for semver-major upgrades. When
 *      no fix exists we return a `'none'` spec so the UI can render a
 *      consistent disabled button.
 *
 * Pure functions — no I/O, no spawning. The engine wires the spec into
 * the fix-runner when the user clicks "Apply fix".
 */

import type {
  DependencyFinding,
  FixGroup,
  FixSpec,
  RootCause,
  Severity,
} from '../types/index.js';
import type { AuditFixAvailability } from './npm-audit.js';
import type { LockfileGraph } from './lockfile-graph.js';

/** Severity ordering used to pick the "worst" severity per fix group. */
const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

/**
 * Enrich every finding in-place with `fix` and `rootCause`. The
 * lockfile graph is optional — when absent (no `package-lock.json`)
 * we still produce a best-effort `FixSpec` based on the finding's
 * own `fixedVersion`.
 */
export function enrichFindings(
  findings: DependencyFinding[],
  fixAvailability: Map<string, AuditFixAvailability>,
  lockfile: LockfileGraph | null,
): DependencyFinding[] {
  return findings.map((finding) => {
    const rootCause = lockfile
      ? lockfile.findRootCause(finding.package) ?? undefined
      : undefined;
    const fix = resolveFix(finding, fixAvailability, rootCause, lockfile);
    return {
      ...finding,
      fix,
      rootCause,
    };
  });
}

/**
 * Pick the right command for `finding`. Order of preference:
 *
 *   1. If the package is a direct dep and we know a `fixedVersion`,
 *      generate a precise `npm install <pkg>@<ver>` command.
 *   2. If npm-audit says it can fix without going semver-major:
 *      `npm audit fix`.
 *   3. If npm-audit can only fix with `--force`: `npm audit fix --force`,
 *      flagged as breaking.
 *   4. Otherwise — no upstream fix yet. UI renders an advisory link
 *      and a disabled "Apply fix" button.
 */
function resolveFix(
  finding: DependencyFinding,
  availability: Map<string, AuditFixAvailability>,
  rootCause: RootCause | undefined,
  lockfile: LockfileGraph | null,
): FixSpec {
  const fa = availability.get(finding.package) ?? { kind: 'none' as const };
  const isDirect =
    rootCause?.isDirect ?? lockfile?.isDirect(finding.package) ?? false;

  // Direct dep with a known fix version → exact install command.
  if (isDirect && finding.fixedVersion) {
    const breaking = isSemVerMajor(finding.installedVersion, finding.fixedVersion);
    return {
      kind: 'install',
      command: `npm install ${finding.package}@${quoteVersionRange(finding.fixedVersion)}`,
      breaking,
      label: `Upgrade ${finding.package} ${finding.installedVersion} → ${finding.fixedVersion}`,
      note: breaking ? 'Semver-major upgrade — may include breaking changes.' : undefined,
    };
  }

  // npm-audit reports a specific upgrade target (typically points at
  // the root package the user owns, even for transitive vulns).
  if (fa.kind === 'specific') {
    if (!fa.isSemVerMajor) {
      return {
        kind: 'audit-fix',
        command: 'npm audit fix',
        breaking: false,
        label: rootCause && !rootCause.isDirect
          ? `Upgrade ${rootCause.rootPackage} via npm audit fix`
          : `Auto-fix ${fa.name ?? finding.package}`,
      };
    }
    return {
      kind: 'audit-fix-force',
      command: 'npm audit fix --force',
      breaking: true,
      label: rootCause && !rootCause.isDirect
        ? `Force-upgrade ${rootCause.rootPackage} (semver-major)`
        : `Force-fix ${fa.name ?? finding.package}`,
      note: '`--force` may install semver-major upgrades that break your build.',
    };
  }

  // npm-audit said it can auto-fix but didn't pin a version (the most
  // common "fixAvailable: true" case). We still recommend running
  // `npm audit fix` — npm will pick the right targets.
  if (fa.kind === 'auto') {
    return {
      kind: 'audit-fix',
      command: 'npm audit fix',
      breaking: false,
      label: rootCause && !rootCause.isDirect
        ? `Upgrade ${rootCause.rootPackage} via npm audit fix`
        : `Auto-fix ${finding.package} via npm audit fix`,
    };
  }

  // No fixAvailable target. If the vulnerable package isn't a direct
  // dep but we know a fixed version, the user can pin it via
  // `package.json` overrides — surface that as a manual step.
  if (!isDirect && rootCause && finding.fixedVersion) {
    return {
      kind: 'override',
      command: '',
      breaking: false,
      label: `Add a ${finding.package} override`,
      note:
        `Upstream (${rootCause.rootPackage}) hasn't shipped a fixed version. ` +
        `Add an "overrides" entry to package.json pinning ${finding.package}@${finding.fixedVersion}.`,
    };
  }

  return {
    kind: 'none',
    command: '',
    breaking: false,
    label: 'No upstream fix yet',
    note: isDirect ? 'Watch the advisory link for a patched release.' : undefined,
  };
}

/**
 * Bucket findings that share a fix command together so the UI can show
 * "Upgrade lodash — fixes 4 advisories" rather than four separate rows.
 *
 * Grouping key:
 *   - install commands → group by exact command string
 *   - audit-fix / audit-fix-force → one bucket each across the whole report
 *   - override / none → not grouped (each finding stays individual)
 */
export function buildFixGroups(findings: DependencyFinding[]): FixGroup[] {
  const buckets = new Map<string, DependencyFinding[]>();

  for (const f of findings) {
    if (!f.fix) continue;
    if (f.fix.kind === 'none' || f.fix.kind === 'override') continue;
    const key = `${f.fix.kind}::${f.fix.command}`;
    const list = buckets.get(key) ?? [];
    list.push(f);
    buckets.set(key, list);
  }

  const out: FixGroup[] = [];
  for (const [key, list] of buckets) {
    if (list.length === 0) continue;
    const first = list[0];
    const fix = first.fix!;
    const groupPkg = first.rootCause?.rootPackage ?? first.package;
    const fromVersion =
      first.rootCause?.rootInstalledVersion ?? first.installedVersion;
    const toVersion = inferTargetVersion(fix, first);
    const severity = list.reduce<Severity>(
      (acc, f) =>
        SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[acc] ? f.severity : acc,
      'INFO',
    );
    const reachability = pickStrongestReachability(list);

    out.push({
      id: `fg-${hashKey(key)}-${list.length}`,
      package: groupPkg,
      fromVersion,
      toVersion,
      breaking: fix.breaking,
      severity,
      findingIds: list.map((f) => f.id),
      fix,
      reachability,
    });
  }

  // Sort highest-impact groups first: more findings, then higher severity,
  // then reachability (confirmed > likely > unknown > unreachable).
  out.sort((a, b) => {
    if (b.findingIds.length !== a.findingIds.length) {
      return b.findingIds.length - a.findingIds.length;
    }
    if (SEVERITY_ORDER[b.severity] !== SEVERITY_ORDER[a.severity]) {
      return SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    }
    return reachabilityRank(b.reachability) - reachabilityRank(a.reachability);
  });

  return out;
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Return the target version string we want to show on a fix-group card.
 * For exact `install` commands we extract it from the command itself;
 * for `audit-fix` we don't actually know the target until npm runs, so
 * we fall back to the finding's `fixedVersion` (best signal we have).
 */
function inferTargetVersion(fix: FixSpec, finding: DependencyFinding): string {
  if (fix.kind === 'install') {
    const m = fix.command.match(/@([^@]+)$/);
    if (m) return m[1].replace(/^['"]/, '').replace(/['"]$/, '');
  }
  return finding.fixedVersion ?? 'latest';
}

function pickStrongestReachability(
  findings: DependencyFinding[],
): 'confirmed' | 'likely' | 'unreachable' | 'unknown' | undefined {
  let best: number = -1;
  let label: 'confirmed' | 'likely' | 'unreachable' | 'unknown' | undefined;
  for (const f of findings) {
    const lvl = f.reachability?.level;
    if (!lvl) continue;
    const rank = reachabilityRank(lvl);
    if (rank > best) {
      best = rank;
      label = lvl;
    }
  }
  return label;
}

function reachabilityRank(
  r: 'confirmed' | 'likely' | 'unreachable' | 'unknown' | undefined,
): number {
  switch (r) {
    case 'confirmed':
      return 3;
    case 'likely':
      return 2;
    case 'unknown':
      return 1;
    case 'unreachable':
      return 0;
    default:
      return -1;
  }
}

/**
 * Quote the version range for the shell when it contains characters
 * that have special meaning in PowerShell / zsh. Caret (`^`) and tilde
 * (`~`) are safe in bash but break in PowerShell — wrap in single
 * quotes whenever we see them.
 */
function quoteVersionRange(version: string): string {
  if (/[\s<>=^~|*"'\\]/.test(version)) {
    // Use single quotes; npm install on every platform accepts the
    // shell-quoted form. Escape any embedded single quotes too.
    return `'${version.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return version;
}

/**
 * Cheap, non-cryptographic hash for fix-group ids. Stable across
 * scans so the UI can keep its expanded/collapsed state across
 * incoming reports.
 */
function hashKey(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Best-effort semver-major detection used when npm-audit doesn't tell
 * us whether the upgrade is breaking. We strip non-digit prefixes and
 * compare the leading number — good enough for the standard "X.Y.Z"
 * shape; conservatively returns `false` on anything weirder so we
 * don't scare users about benign patch bumps.
 */
function isSemVerMajor(from: string, to: string): boolean {
  const fromMajor = leadingMajor(from);
  const toMajor = leadingMajor(to);
  if (fromMajor === null || toMajor === null) return false;
  return toMajor > fromMajor;
}

function leadingMajor(version: string): number | null {
  // npm-audit `range` strings can be like ">=1.2.3 <2.0.0" — take the
  // first numeric component.
  const m = version.match(/(?:^|[^\d])(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}
