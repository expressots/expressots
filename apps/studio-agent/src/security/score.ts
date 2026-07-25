/**
 * Aggregate scoring for the security report.
 *
 * Distils a heterogeneous list of findings into a single letter grade
 * (A..F) so the StatusDashboard card can show a tight summary, and the
 * UI can sort/route on it. Also bundles the per-severity counts that
 * the Security view consumes for its severity-grouped sections.
 *
 * The grading function is *not* CVSS-aware on purpose — a project with
 * one critical CVE that has no exploit in the wild shouldn't be
 * indistinguishable from one with ten. We follow these rules instead:
 *
 *   F  → any CRITICAL severity finding (supply-chain or posture)
 *   D  → ≥3 HIGH, or ≥1 HIGH supply-chain
 *   C  → any HIGH, or ≥5 MEDIUM
 *   B  → any MEDIUM
 *   A  → only LOW / INFO (or zero findings)
 */

import type {
  DependencyFinding,
  FixGroup,
  PostureFinding,
  SecurityReport,
  Severity,
} from '../types/index.js';

const SEVERITY_KEYS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

/**
 * Assemble a `SecurityReport` from dependency findings, posture
 * findings, and fix groups: tallies counts per severity and derives the
 * aggregate A-F letter grade.
 *
 * @param args - Findings, fix groups, and the current scan lifecycle state.
 * @returns The complete report ready for broadcast.
 */
export function buildSecurityReport(args: {
  dependencies: DependencyFinding[];
  posture: PostureFinding[];
  fixGroups: FixGroup[];
  scanState: SecurityReport['scanState'];
}): SecurityReport {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  for (const f of args.dependencies) counts[f.severity]++;
  for (const f of args.posture) counts[f.severity]++;

  return {
    generatedAt: Date.now(),
    score: gradeFromCounts(counts, args.dependencies),
    counts,
    dependencies: args.dependencies,
    posture: args.posture,
    fixGroups: args.fixGroups,
    scanState: args.scanState,
  };
}

function gradeFromCounts(
  counts: Record<Severity, number>,
  dependencies: DependencyFinding[],
): SecurityReport['score'] {
  if (counts.CRITICAL > 0) return 'F';
  const supplyChainHigh = dependencies.filter((d) => d.severity === 'HIGH').length;
  if (counts.HIGH >= 3 || supplyChainHigh >= 1) return 'D';
  if (counts.HIGH > 0 || counts.MEDIUM >= 5) return 'C';
  if (counts.MEDIUM > 0) return 'B';
  return 'A';
}

/**
 * Hash the set of finding ids. The engine uses this to decide whether
 * a freshly-built report actually differs from the last one — we only
 * broadcast on transitions to keep WS traffic flat for stable apps.
 */
export function hashFindingIds(report: SecurityReport): string {
  // The hash is intentionally simple — sort to get a stable order
  // (analysis passes may emit findings in non-deterministic order if
  // they iterate Maps), then join. Avoids the cost of a crypto digest
  // when we just need a comparable string.
  const ids: string[] = [];
  for (const f of report.dependencies) ids.push(`d:${f.id}`);
  for (const f of report.posture) ids.push(`p:${f.id}`);
  ids.sort();
  return ids.join('|');
}

/** Empty / "nothing recorded yet" baseline used before the first scan completes. */
export function emptyReport(scanState: SecurityReport['scanState']): SecurityReport {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  return {
    generatedAt: Date.now(),
    score: 'A',
    counts,
    dependencies: [],
    posture: [],
    fixGroups: [],
    scanState,
  };
}

// Re-exported so consumers don't have to mention the type module twice
// when iterating counts.
export { SEVERITY_KEYS };
