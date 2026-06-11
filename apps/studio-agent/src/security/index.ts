/**
 * Security engine — orchestrates supply-chain scanning (npm audit +
 * OSV) and runtime posture analysis, packages the result into a single
 * `SecurityReport`, and offers a debounced re-run hook the agent can
 * call on each new exchange/log without breaking the host event loop.
 *
 * The engine is intentionally framework-free: it takes plain snapshot
 * functions from the agent and emits reports to a listener. That makes
 * it trivially testable and keeps the security policy (debounce,
 * change detection, gating on connected clients) firmly in the agent
 * itself — the engine just provides the data.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AppStructure,
  DependencyFinding,
  FixGroup,
  FixProgressMessage,
  FixResultMessage,
  PostureFinding,
  RecordedExchange,
  RouteInfo,
  SecurityReport,
} from '../types/index.js';
import type { LogEntry } from '../logging/log-capture.js';
import {
  runNpmAudit,
  type AuditFixAvailability,
} from './npm-audit.js';
import { OsvClient, type PackageQuery } from './osv-client.js';
import { OsvCache } from './osv-cache.js';
import { analyzePosture } from './posture-analyzer.js';
import {
  buildSecurityReport,
  emptyReport,
  hashFindingIds,
} from './score.js';
import { LockfileGraph } from './lockfile-graph.js';
import {
  buildFixGroups,
  enrichFindings,
} from './fix-resolver.js';
import {
  buildReachabilitySnapshot,
  enrichWithReachability,
  type ReachabilitySnapshot,
} from './reachability.js';
import {
  buildFixArgs,
  runFix,
  type FixCommandKind,
  type FixRunResult,
} from './fix-runner.js';

/** How often the engine will re-run posture analysis on event-driven triggers. */
const POSTURE_DEBOUNCE_MS = 2000;

/**
 * Snapshot accessors the engine reads on each pass. Functions, not
 * snapshot objects, so we always see the freshest state without the
 * agent having to thread updates through.
 */
export interface SecurityEngineDeps {
  /** Host project root; `npm audit` and lockfile reads run here. */
  cwd: string;
  /** Agent DB path; the OSV response cache lives in the same directory. */
  dbPath: string;
  /** Returns the current route inventory. */
  getRoutes: () => RouteInfo[];
  /** Returns the latest scanned application structure, if any. */
  getStructure: () => AppStructure | null;
  /** Returns the recorded exchanges used for posture and reachability checks. */
  getExchanges: () => RecordedExchange[];
  /** Returns the captured console log buffer. */
  getLogs: () => LogEntry[];
}

/** Callback invoked whenever the engine produces a changed `SecurityReport`. */
export type SecurityReportListener = (report: SecurityReport) => void;

/**
 * Hook the engine calls during an "Apply fix" run so the agent can
 * stream output back to the UI. Kept as a callback (not a listener
 * registered via `onReport`) because progress is per-call, not a
 * global subscription.
 */
export type FixProgressListener = (msg: FixProgressMessage) => void;

/**
 * Input to `applyFix` — references either a single finding (`findingId`)
 * or a fix group (`fixGroupId`). When the request can't be resolved
 * (stale id, no matching fix), the engine resolves with `success: false`
 * and an explanatory `summary` rather than throwing.
 */
export interface ApplyFixInput {
  targetKind: 'finding' | 'fix-group';
  /** ID of the target — either `FixGroup.id` or `DependencyFinding.id`. */
  targetId: string;
  /** Set to true to allow semver-major upgrades (`--force`). */
  allowMajor?: boolean;
}

/**
 * Orchestrates Studio's security scanning: supply-chain analysis
 * (`npm audit` reconciled with OSV.dev advisories) plus runtime posture
 * analysis over the agent's routes, exchanges, and logs. Assembles the
 * result into a single `SecurityReport` and notifies the registered
 * listener only when the report meaningfully changes.
 *
 * Also runs user-initiated remediations via `applyFix()`, streaming
 * command output back through a progress callback and rescanning
 * afterwards so the next report reflects the lockfile's real state.
 *
 * The engine is transport-agnostic: it reads fresh state through the
 * accessor functions in `SecurityEngineDeps` and leaves broadcast policy
 * (debouncing aside) to the agent.
 */
export class SecurityEngine {
  private readonly osvClient: OsvClient;
  private readonly osvCache: OsvCache;

  private lastDependencies: DependencyFinding[] = [];
  private lastFixGroups: FixGroup[] = [];
  private lastFixAvailability: Map<string, AuditFixAvailability> = new Map();
  private lastLockfile: LockfileGraph | null = null;
  private lastReachability: ReachabilitySnapshot | null = null;
  private lastReport: SecurityReport;
  private lastHash = '';
  private listener: SecurityReportListener | null = null;

  private postureTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Start in `running` so a freshly-connected UI doesn't briefly show
   * "no vulnerabilities" before the first scan completes. The engine
   * flips this to `idle` / `error` when `runFullScan` finishes.
   */
  private auditState: SecurityReport['scanState']['audit'] = 'running';
  private auditError: string | undefined;
  private missingLockfile = false;
  private auditInFlight: Promise<void> | null = null;
  /** State of an in-flight Apply-fix job (one at a time). */
  private fixState: SecurityReport['scanState']['fix'] = undefined;
  private fixInFlight: Promise<FixResultMessage> | null = null;

  constructor(private readonly deps: SecurityEngineDeps) {
    this.osvCache = new OsvCache(deps.dbPath);
    this.osvClient = new OsvClient(this.osvCache);
    this.lastReport = emptyReport(this.snapshotScanState(0));
  }

  /** Subscribe to security report transitions. Only one listener supported. */
  onReport(listener: SecurityReportListener): void {
    this.listener = listener;
  }

  /** Latest known report (always safe — initialised to an empty one). */
  getReport(): SecurityReport {
    return this.lastReport;
  }

  /**
   * Run a full scan: `npm audit` + OSV.dev + posture analysis. Safe to
   * call repeatedly — concurrent calls coalesce onto the in-flight
   * promise so we never spawn two `npm audit` children at once.
   */
  async runFullScan(): Promise<void> {
    if (this.auditInFlight) return this.auditInFlight;

    this.auditInFlight = (async () => {
      this.auditState = 'running';
      this.auditError = undefined;
      this.emitProgress();

      const audit = await runNpmAudit(this.deps.cwd);
      this.missingLockfile = audit.state === 'missing-lockfile';
      this.lastFixAvailability = audit.fixAvailability;

      if (audit.state === 'error') {
        this.auditState = 'error';
        this.auditError = audit.error;
      } else {
        this.auditState = 'idle';
      }

      let osvFindings: DependencyFinding[] = [];
      if (audit.state === 'ok') {
        try {
          const packages = readInstalledPackages(this.deps.cwd);
          osvFindings = await this.osvClient.lookup(packages);
        } catch {
          // OSV failures degrade gracefully — we still ship npm audit findings.
        }
      }

      // Reconcile npm + OSV first; then enrich with lockfile root-cause
      // analysis; then with reachability. The enrichment passes are pure
      // functions of (findings, snapshot) so order is deterministic.
      const reconciled = reconcileDependencyFindings(audit.findings, osvFindings);
      this.lastLockfile = LockfileGraph.load(this.deps.cwd);
      this.lastReachability = await buildReachabilitySnapshot(
        this.deps.cwd,
        this.deps.getStructure(),
      );
      this.lastDependencies = this.enrichDependencies(reconciled);
      this.lastFixGroups = buildFixGroups(this.lastDependencies);

      this.rebuildAndEmit();
    })();

    try {
      await this.auditInFlight;
    } finally {
      this.auditInFlight = null;
    }
  }

  /**
   * Apply an enrichment pipeline against the latest snapshots. Split
   * out so `scheduleRefresh` can re-run reachability against fresh
   * exchanges without re-fetching OSV / re-running npm audit.
   */
  private enrichDependencies(
    findings: DependencyFinding[],
  ): DependencyFinding[] {
    const withFix = enrichFindings(
      findings,
      this.lastFixAvailability,
      this.lastLockfile,
    );
    if (!this.lastReachability) return withFix;
    return enrichWithReachability(
      withFix,
      this.lastReachability,
      this.deps.getExchanges(),
    );
  }

  /**
   * Notify the engine that some upstream state likely changed (a new
   * exchange, log line, etc.). Debounced — multiple calls inside the
   * debounce window collapse to a single posture pass.
   */
  scheduleRefresh(): void {
    if (this.postureTimer) return;
    this.postureTimer = setTimeout(() => {
      this.postureTimer = null;
      this.rebuildAndEmit();
    }, POSTURE_DEBOUNCE_MS);
  }

  /** Cancel any pending refresh — called from `StudioAgent.stop()`. */
  stop(): void {
    if (this.postureTimer) {
      clearTimeout(this.postureTimer);
      this.postureTimer = null;
    }
    this.osvCache.flush();
  }

  /**
   * Rebuild the report from current state and emit if its finding-id
   * hash changed (or if the scan state changed). This is the single
   * point where we decide whether to disturb the WS stream.
   *
   * On a posture-only refresh we also re-run reachability against the
   * latest exchange buffer so the chips ("confirmed: 5 hits") update
   * without a full audit.
   */
  private rebuildAndEmit(): void {
    const posture: PostureFinding[] = analyzePosture({
      routes: this.deps.getRoutes(),
      structure: this.deps.getStructure(),
      exchanges: this.deps.getExchanges(),
      logs: this.deps.getLogs(),
    });

    // Light-touch refresh: reachability snapshot only depends on src/
    // (rarely changes during a session) so we reuse the cached one,
    // but we re-run `enrichWithReachability` to fold in the latest
    // exchange counts.
    if (this.lastReachability && this.lastDependencies.length > 0) {
      this.lastDependencies = enrichWithReachability(
        this.lastDependencies,
        this.lastReachability,
        this.deps.getExchanges(),
      );
      // Reachability changes can move findings between groups (severity
      // tie-break uses reachability), so we rebuild groups too.
      this.lastFixGroups = buildFixGroups(this.lastDependencies);
    }

    const report = buildSecurityReport({
      dependencies: this.lastDependencies,
      posture,
      fixGroups: this.lastFixGroups,
      scanState: this.snapshotScanState(Date.now()),
    });

    const nextHash =
      hashFindingIds(report) +
      '|' +
      scanStateHash(report.scanState) +
      '|' +
      hashReachability(report.dependencies);
    this.lastReport = report;

    if (nextHash !== this.lastHash) {
      this.lastHash = nextHash;
      this.listener?.(report);
    }
  }

  /** Emit a transient "scan running / error" frame even when findings haven't changed. */
  private emitProgress(): void {
    const report = buildSecurityReport({
      dependencies: this.lastDependencies,
      posture: this.lastReport.posture,
      fixGroups: this.lastFixGroups,
      scanState: this.snapshotScanState(this.lastReport.scanState.postureLastRunAt),
    });
    this.lastReport = report;
    // Force-emit: scan state transitions are user-visible.
    this.lastHash =
      hashFindingIds(report) +
      '|' +
      scanStateHash(report.scanState) +
      '|' +
      hashReachability(report.dependencies);
    this.listener?.(report);
  }

  /**
   * Apply a remediation. The caller (agent) wires the per-line progress
   * callback into a `fix_progress` WS broadcast. Returns the final
   * `FixResultMessage` once the spawned command exits.
   *
   * The method enforces two invariants:
   *   1. Only one fix runs at a time (`fixInFlight` is awaited).
   *   2. After every fix attempt — success or failure — we trigger a
   *      full rescan. The post-scan `security` frame is what tells the
   *      UI whether the change actually cleared the advisory.
   */
  async applyFix(
    input: ApplyFixInput,
    onProgress: FixProgressListener,
  ): Promise<FixResultMessage> {
    if (this.fixInFlight) {
      return {
        targetId: input.targetId,
        success: false,
        exitCode: null,
        durationMs: 0,
        command: '',
        summary: 'Another fix is already running. Please wait.',
      };
    }

    const target = this.resolveFixTarget(input);
    if (!target) {
      return {
        targetId: input.targetId,
        success: false,
        exitCode: null,
        durationMs: 0,
        command: '',
        summary: 'Fix target not found. Rescan and try again.',
      };
    }

    const job = (async (): Promise<FixResultMessage> => {
      this.fixState = {
        state: 'running',
        targetId: input.targetId,
        command: target.pretty,
      };
      this.emitProgress();

      const result: FixRunResult = await runFix(
        {
          cwd: this.deps.cwd,
          kind: target.kind,
          package: target.package,
          version: target.version,
          targetId: input.targetId,
        },
        (line, stream) =>
          onProgress({
            targetId: input.targetId,
            stream,
            line,
            timestamp: Date.now(),
          }),
      );

      const summary =
        result.state === 'success'
          ? `${target.pretty} completed in ${(result.durationMs / 1000).toFixed(1)}s`
          : `${target.pretty} failed (${result.exitCode ?? 'no exit code'})`;

      const finalMsg: FixResultMessage = {
        targetId: input.targetId,
        success: result.state === 'success',
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        command: result.command || target.pretty,
        summary,
        errorTail:
          result.state === 'success'
            ? undefined
            : result.stderrTail.slice(-4096) || result.stdoutTail.slice(-4096),
      };

      this.fixState = {
        state: result.state === 'success' ? 'success' : 'error',
        targetId: input.targetId,
        command: result.command || target.pretty,
        error: result.state === 'success' ? undefined : summary,
      };

      // Always rescan — even on failure — so the UI agrees with the
      // lockfile's actual current state, not what we *hoped* would change.
      await this.runFullScan();

      // Clear the fix banner once the rescan has updated everything else.
      this.fixState = undefined;
      this.emitProgress();
      return finalMsg;
    })();

    this.fixInFlight = job;
    try {
      return await job;
    } finally {
      this.fixInFlight = null;
    }
  }

  /**
   * Look up the FixSpec corresponding to the user's request and convert
   * it into the argv tuple `runFix` expects. Returns `null` for unknown
   * ids / nothing-to-do specs.
   */
  private resolveFixTarget(input: ApplyFixInput): {
    kind: FixCommandKind;
    pretty: string;
    package?: string;
    version?: string;
  } | null {
    const spec =
      input.targetKind === 'fix-group'
        ? this.lastFixGroups.find((g) => g.id === input.targetId)?.fix
        : this.lastDependencies.find((f) => f.id === input.targetId)?.fix;
    if (!spec) return null;

    let kind: FixCommandKind;
    switch (spec.kind) {
      case 'install':
        kind = 'install';
        break;
      case 'audit-fix':
        kind = 'audit-fix';
        break;
      case 'audit-fix-force':
        kind = input.allowMajor ? 'audit-fix-force' : 'audit-fix-force';
        break;
      case 'override':
      case 'none':
        return null;
    }

    // For `install` we need to break the version out of the command.
    let pkg: string | undefined;
    let ver: string | undefined;
    if (kind === 'install') {
      const m = spec.command.match(/^npm install\s+(.+?)@([^@]+)$/);
      if (!m) return null;
      pkg = m[1].trim();
      ver = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
    const argv = buildFixArgs({
      cwd: this.deps.cwd,
      kind,
      package: pkg,
      version: ver,
      targetId: input.targetId,
    });
    if (!argv) return null;
    return { kind, pretty: argv.pretty, package: pkg, version: ver };
  }

  private snapshotScanState(
    postureLastRunAt: number,
  ): SecurityReport['scanState'] {
    return {
      audit: this.auditState,
      postureLastRunAt,
      auditError: this.auditError,
      missingLockfile: this.missingLockfile || undefined,
      fix: this.fixState,
    };
  }
}

/**
 * Reachability counts are part of the report payload — when a recorded
 * exchange flips a finding from `likely` → `confirmed` we want the UI
 * to update even if the finding-id set hasn't changed.
 */
function hashReachability(deps: DependencyFinding[]): string {
  const parts: string[] = [];
  for (const f of deps) {
    const r = f.reachability;
    if (!r) continue;
    parts.push(`${f.id}:${r.level}:${r.runtimeHits}`);
  }
  parts.sort();
  return parts.join('|');
}

function scanStateHash(s: SecurityReport['scanState']): string {
  return [
    s.audit,
    s.missingLockfile ? '1' : '0',
    s.auditError ?? '',
    s.fix?.state ?? '',
    s.fix?.targetId ?? '',
  ].join('|');
}

/**
 * Combine findings from `npm audit` and OSV, deduping by id. We trust
 * npm audit's transitive `path` (it knows the lockfile) and OSV's
 * severity/refs (richer than what npm reports). When both sources
 * produce a finding for the same id, we merge.
 */
function reconcileDependencyFindings(
  fromNpm: DependencyFinding[],
  fromOsv: DependencyFinding[],
): DependencyFinding[] {
  const byId = new Map<string, DependencyFinding>();
  for (const f of fromNpm) byId.set(f.id, { ...f });

  for (const f of fromOsv) {
    const existing = byId.get(f.id);
    if (!existing) {
      byId.set(f.id, f);
      continue;
    }
    // Merge: keep npm's path (it knows the resolution graph), prefer
    // OSV's references/summary/cvss (they're richer), and pick the
    // higher severity to avoid silently downgrading anything.
    byId.set(f.id, {
      ...existing,
      summary: f.summary || existing.summary,
      references: dedupe([...existing.references, ...f.references]),
      severity: pickHigherSeverity(existing.severity, f.severity),
      cvss: f.cvss ?? existing.cvss,
      fixedVersion: f.fixedVersion ?? existing.fixedVersion,
    });
  }

  return [...byId.values()];
}

function pickHigherSeverity(
  a: DependencyFinding['severity'],
  b: DependencyFinding['severity'],
): DependencyFinding['severity'] {
  const order: DependencyFinding['severity'][] = [
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
  ];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Read the host's `package.json` and return a flat list of direct
 * dependencies to query OSV for. We don't traverse `node_modules` here
 * — npm audit already covers transitive vulns; querying OSV for every
 * transitive dep would blow up the batch size and add latency for
 * diminishing returns.
 */
function readInstalledPackages(cwd: string): PackageQuery[] {
  const file = path.join(cwd, 'package.json');
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const out: PackageQuery[] = [];
    for (const map of [parsed.dependencies, parsed.devDependencies]) {
      if (!map) continue;
      for (const [name, version] of Object.entries(map)) {
        out.push({ name, version: stripSemverPrefix(version) });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function stripSemverPrefix(version: string): string {
  return version.replace(/^[\^~>=<]+/, '').trim();
}

export { OsvCache } from './osv-cache.js';
export { OsvClient } from './osv-client.js';
export { runNpmAudit } from './npm-audit.js';
export { analyzePosture } from './posture-analyzer.js';
export { buildSecurityReport, hashFindingIds, emptyReport } from './score.js';
export { LockfileGraph } from './lockfile-graph.js';
export {
  enrichFindings as enrichFindingsWithFixes,
  buildFixGroups,
} from './fix-resolver.js';
export {
  buildReachabilitySnapshot,
  enrichWithReachability,
} from './reachability.js';
export { runFix, buildFixArgs } from './fix-runner.js';
