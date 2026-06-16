/**
 * Coverage engine — detects the freshest coverage artifact, normalises
 * it (Istanbul JSON or LCOV) into the unified model, builds the file
 * tree, and emits a single `CoverageReport` envelope. Mirrors the
 * `SecurityEngine` design: framework-free, debounced, change-detected,
 * and decoupled from any transport. The agent owns the policy (gating
 * emits on connected clients, watching the filesystem); the engine just
 * provides the data.
 *
 * Phase 1 is "watch-and-parse": no coupling to any test framework, just
 * to the artifacts they all emit. Active "run the tests for me" mode and
 * git diff-coverage are layered on top later without changing this
 * core.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CoverageConfig,
  CoverageMetrics,
  CoverageProvider,
  CoverageReport,
  CoverageSource,
  FileCoverage,
} from '../types/index.js';
import {
  detectCoverageArtifact,
  type DetectedArtifact,
} from './artifact-detector.js';
import {
  parseIstanbulCoverage,
  type IstanbulCoverageData,
} from './istanbul-parser.js';
import { parseLcov } from './lcov-parser.js';
import { buildCoverageTree } from './tree-builder.js';
import { combineMetrics, emptyMetrics, round2 } from './metrics.js';
import { computeDiffCoverage } from './git-diff.js';
import { CoverageHistory } from './history.js';
import { evaluateThresholds, resolveThresholds } from './thresholds.js';
import { loadCoverageConfig, mergeCoverageConfig } from './config.js';
import {
  getRunnerInvocation,
  isSupportedRunner,
  type RunnerName,
} from './framework-adapters.js';
import { runCoverageCommand, type CoverageRunInput } from './runner.js';
import { parseTestResults } from './test-results-parser.js';
import type {
  CoverageRunProgressMessage,
  CoverageRunResultMessage,
  TestRunSummary,
} from '../types/index.js';

/** Debounce window for filesystem-triggered re-parses. */
const REFRESH_DEBOUNCE_MS = 750;
/** Hard cap on a source file we'll ship to the UI for annotation. */
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

/** Dependencies injected into the {@link CoverageEngine} by the agent. */
export interface CoverageEngineDeps {
  /** Host project root; artifact detection and test runs happen here. */
  cwd: string;
  /** Path to the agent DB; history + config live in the same dir. */
  dbPath?: string;
  /**
   * Programmatic coverage overrides (from `AgentConfig.coverage`). Merged
   * over `.studio/coverage.json`, with these taking precedence.
   */
  coverage?: CoverageConfig;
}

/** Callback invoked whenever the engine produces a changed `CoverageReport`. */
export type CoverageReportListener = (report: CoverageReport) => void;
/** Callback invoked whenever a new `TestRunSummary` is parsed. */
export type TestResultsListener = (summary: TestRunSummary) => void;

/** Result of scanning the project for supported test runners. */
interface RunnerDetection {
  /** Every supported runner found, in priority order. */
  detected: RunnerName[];
  /** The runner to default to (config override, else first detected). */
  primary?: RunnerName;
  /** Suggested coverage command for the empty state. */
  suggestedCommand?: string;
}

/** Conventional test-report locations, searched freshest-first. */
const TEST_REPORT_CANDIDATES = [
  'junit.xml',
  'test-results.xml',
  'test-report.xml',
  'reports/junit.xml',
  'coverage/junit.xml',
  'test-results/junit.xml',
  'test-results.json',
  'reports/test-results.json',
];

/**
 * Orchestrates Studio's code-coverage view. Detects the freshest
 * coverage artifact in the project (Istanbul JSON or LCOV), normalises
 * it into a unified model, computes totals, file tree, git diff
 * coverage, deltas, threshold gates, and trend history, and emits the
 * result as a single `CoverageReport` to the registered listener.
 *
 * Supports two modes: passive "watch and parse" (the agent watches the
 * coverage directory and calls `scheduleRefresh()` / `refresh()`), and
 * active runs via `runCoverage()`, which executes the project's test
 * runner with coverage enabled and re-parses the resulting artifact.
 *
 * Like `SecurityEngine`, it is transport-agnostic and change-detected:
 * the agent owns broadcast policy.
 */
export class CoverageEngine {
  private lastReport: CoverageReport;
  private lastHash = '';
  private listener: CoverageReportListener | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private parsing = false;
  private runInFlight = false;
  private readonly history: CoverageHistory;
  private lastTestResults: TestRunSummary;
  private testResultsListener: TestResultsListener | null = null;

  constructor(private readonly deps: CoverageEngineDeps) {
    this.history = new CoverageHistory(deps.dbPath ?? '.studio/studio.db');
    // Detection is intentionally NOT cached — it's a sub-millisecond
    // package.json read recomputed on every refresh, so the label can't
    // go stale when the project's dependencies change.
    this.lastReport = emptyReport(this.detect(this.resolveConfig()), true);
    this.lastTestResults = emptyTestSummary();
  }

  /** Merge `.studio/coverage.json` with programmatic deps (deps win). */
  private resolveConfig(): CoverageConfig {
    const file = loadCoverageConfig(this.deps.dbPath ?? '.studio/studio.db');
    return mergeCoverageConfig(file, this.deps.coverage);
  }

  private detect(cfg: CoverageConfig): RunnerDetection {
    return detectRunners(this.deps.cwd, cfg);
  }

  /** Subscribe to report transitions. Only one listener is supported. */
  onReport(listener: CoverageReportListener): void {
    this.listener = listener;
  }

  /** Latest known report (always safe — seeded to an empty one). */
  getReport(): CoverageReport {
    return this.lastReport;
  }

  /** Subscribe to test-results transitions (a stream distinct from coverage). */
  onTestResults(listener: TestResultsListener): void {
    this.testResultsListener = listener;
  }

  /** Latest test-run summary (seeded to an empty/missing one). */
  getTestResults(): TestRunSummary {
    return this.lastTestResults;
  }

  /**
   * Detect + parse a test-results report (JUnit / JSON / TAP), if one
   * exists, and emit it on the distinct test-results stream. Best-effort
   * — most projects won't emit one unless they configure a reporter.
   */
  refreshTestResults(): void {
    const file = detectTestReport(this.deps.cwd);
    if (!file) {
      this.emitTestResults(emptyTestSummary());
      return;
    }
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const summary = parseTestResults(content);
      if (summary) {
        this.emitTestResults(summary);
      } else {
        this.emitTestResults(emptyTestSummary());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emitTestResults({
        ...emptyTestSummary(),
        scanState: { state: 'error', lastRunAt: 0, error: message },
      });
    }
  }

  private emitTestResults(summary: TestRunSummary): void {
    this.lastTestResults = summary;
    this.testResultsListener?.(summary);
  }

  /**
   * Debounced re-parse. Multiple filesystem events inside the window
   * collapse to a single parse — a test run rewrites many files in the
   * `coverage/` dir in quick succession.
   */
  scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }

  /** Re-detect, parse, and emit. Safe to call repeatedly. */
  async refresh(): Promise<void> {
    if (this.parsing) return;
    this.parsing = true;
    try {
      const cfg = this.resolveConfig();
      const detection = this.detect(cfg);

      const artifact = detectCoverageArtifact(this.deps.cwd, cfg.paths);
      if (!artifact) {
        // Force-emit: "no coverage yet" is a user-visible state.
        this.setReport(emptyReport(detection, true), true);
        return;
      }

      let files: FileCoverage[];
      let provider: CoverageProvider;
      try {
        const result = parseArtifact(artifact);
        files = result.files;
        provider = result.provider;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.setReport(errorReport(message, detection, artifact.path), true);
        return;
      }

      // Rewrite absolute paths to project-relative POSIX paths and sort.
      files = files
        .map((f) => ({ ...f, relPath: toRelPosix(this.deps.cwd, f.path) }))
        .sort((a, b) => a.relPath.localeCompare(b.relPath));

      const totals = files.length
        ? combineMetrics(files.map((f) => f.metrics))
        : emptyMetrics();
      const tree = buildCoverageTree(files);

      const prev = this.lastReport;
      const generatedAt = Date.now();

      // Trend history: append a point only when there's real data and it
      // differs from the last one, then attach the full series.
      const history =
        files.length > 0
          ? this.history.append(totals, generatedAt)
          : this.history.list();

      // Threshold gates (config + env shortcut — see thresholds.ts).
      const configured = resolveThresholds(cfg.thresholds);
      const thresholds = configured
        ? evaluateThresholds(totals, configured)
        : undefined;

      const report: CoverageReport = {
        generatedAt,
        totals,
        files,
        tree,
        provider,
        delta: hasData(prev) ? computeDelta(prev.totals, totals) : undefined,
        thresholds,
        history: history.length > 0 ? history : undefined,
        scanState: {
          source: 'watch',
          state: 'idle',
          lastRunAt: generatedAt,
          runner: detection.primary,
          detectedRunners: detection.detected,
          suggestedCommand: detection.suggestedCommand,
          artifactPath: artifact.path,
        },
      };
      this.setReport(report, false);

      // Diff coverage requires spawning git — never block the parse.
      // It re-emits an updated report once it resolves.
      void this.attachDiffCoverage(report, cfg.diffBase);

      // Test-results are a separate stream from a separate artifact.
      this.refreshTestResults();
    } finally {
      this.parsing = false;
    }
  }

  /**
   * Compute git diff-coverage for an already-emitted report and re-emit
   * with `diff` attached. Best-effort and superseded-safe: if a newer
   * report has replaced this one in the meantime, we drop the result.
   */
  private async attachDiffCoverage(
    report: CoverageReport,
    diffBase: string | undefined,
  ): Promise<void> {
    if (report.files.length === 0) return;
    try {
      const diff = await computeDiffCoverage(
        this.deps.cwd,
        report.files,
        diffBase,
      );
      if (this.lastReport !== report) return;
      // Force-emit: diff coverage is user-visible and not part of the
      // content hash.
      this.setReport({ ...report, diff }, true);
    } catch {
      // best-effort — the report without diff is still valid.
    }
  }

  /**
   * Active mode: run the project's tests with coverage enabled, stream
   * each output line through `onProgress`, then re-parse the resulting
   * artifact (which emits a fresh `coverage` report via `onReport`).
   * Returns the final result frame. Only one run at a time.
   */
  async runCoverage(
    runnerOverride: string | undefined,
    onProgress: (msg: CoverageRunProgressMessage) => void,
  ): Promise<CoverageRunResultMessage> {
    const cfg = this.resolveConfig();
    const detection = this.detect(cfg);

    // Build the command: a developer-configured custom command wins
    // (run via shell — it's their own config), otherwise a vetted
    // per-runner adapter. The active-run path never executes a string
    // sourced from the UI / WS message.
    let input: CoverageRunInput;
    let runnerLabel: string | undefined;

    if (cfg.command && cfg.command.trim()) {
      input = {
        cwd: this.deps.cwd,
        cmd: cfg.command,
        args: [],
        pretty: cfg.command,
        shell: true,
      };
      runnerLabel = cfg.runner ?? 'custom';
    } else {
      // Config-pinned runner wins; else the UI's choice; else detected.
      const name = cfg.runner || runnerOverride || detection.primary;
      const invocation = getRunnerInvocation(name);
      if (!invocation) {
        return {
          success: false,
          exitCode: null,
          durationMs: 0,
          command: '',
          runner: name,
          summary: name
            ? `Unsupported test runner "${name}".`
            : 'Could not detect a supported test runner (vitest, jest, mocha, node:test). Set "runner" or "command" in .studio/coverage.json.',
        };
      }
      input = { cwd: this.deps.cwd, ...invocation };
      runnerLabel = name;
    }

    if (this.runInFlight) {
      return {
        success: false,
        exitCode: null,
        durationMs: 0,
        command: input.pretty,
        runner: runnerLabel,
        summary: 'A test run is already in progress.',
      };
    }

    this.runInFlight = true;
    try {
      const result = await runCoverageCommand(input, (line, stream) =>
        onProgress({ stream, line, timestamp: Date.now() }),
      );

      // Always re-parse afterwards so the report reflects the run's
      // actual artifact — even when tests failed, partial coverage is
      // still useful.
      await this.refresh();

      const seconds = (result.durationMs / 1000).toFixed(1);
      const label = runnerLabel ?? 'tests';
      return {
        success: result.state === 'success',
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        command: result.command,
        runner: runnerLabel,
        summary:
          result.state === 'success'
            ? `${label} finished in ${seconds}s`
            : `${label} exited ${result.exitCode ?? 'with no code'} (${seconds}s)`,
        errorTail:
          result.state === 'success'
            ? undefined
            : result.stderrTail.slice(-4096) || result.stdoutTail.slice(-4096),
      };
    } finally {
      this.runInFlight = false;
    }
  }

  /**
   * Read a single source file for the annotated viewer. Bounded in size
   * and confined to the project root so the UI can never use this to
   * read arbitrary files off the agent's host.
   */
  readSource(relPath: string): CoverageSource {
    const file = this.lastReport.files.find((f) => f.relPath === relPath);
    const uncoveredLines = file?.uncoveredLines ?? [];
    const partialBranchLines = file?.partialBranchLines ?? [];

    const abs = path.resolve(this.deps.cwd, relPath);
    const root = path.resolve(this.deps.cwd);
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      return {
        relPath,
        content: null,
        uncoveredLines,
        partialBranchLines,
        error: 'Path is outside the project root.',
      };
    }

    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES) {
        return {
          relPath,
          content: null,
          uncoveredLines,
          partialBranchLines,
          error: stat.isFile() ? 'File too large to display.' : 'Not a file.',
        };
      }
      return {
        relPath,
        content: fs.readFileSync(abs, 'utf-8'),
        uncoveredLines,
        partialBranchLines,
      };
    } catch (err) {
      return {
        relPath,
        content: null,
        uncoveredLines,
        partialBranchLines,
        error: err instanceof Error ? err.message : 'Could not read file.',
      };
    }
  }

  /** Cancel any pending refresh — called from `StudioAgent.stop()`. */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /** Assign + emit on hash change (or when forced). */
  private setReport(report: CoverageReport, force: boolean): void {
    this.lastReport = report;
    const hash = hashReport(report);
    if (force || hash !== this.lastHash) {
      this.lastHash = hash;
      this.listener?.(report);
    }
  }
}

interface ParsedArtifact {
  files: FileCoverage[];
  provider: CoverageProvider;
}

function parseArtifact(artifact: DetectedArtifact): ParsedArtifact {
  const raw = fs.readFileSync(artifact.path, 'utf-8');
  if (artifact.kind === 'istanbul') {
    const data = JSON.parse(raw) as IstanbulCoverageData;
    return { files: parseIstanbulCoverage(data), provider: 'istanbul' };
  }
  return { files: parseLcov(raw), provider: 'lcov' };
}

/** Build the empty/missing-artifact report. */
function emptyReport(
  detection: RunnerDetection,
  missingArtifact: boolean,
): CoverageReport {
  const totals = emptyMetrics();
  return {
    generatedAt: Date.now(),
    totals,
    files: [],
    tree: { name: 'root', path: '', type: 'dir', metrics: totals, children: [] },
    provider: 'unknown',
    scanState: {
      source: 'watch',
      state: 'idle',
      lastRunAt: 0,
      runner: detection.primary,
      detectedRunners: detection.detected,
      suggestedCommand: detection.suggestedCommand,
      missingArtifact,
    },
  };
}

function errorReport(
  message: string,
  detection: RunnerDetection,
  artifactPath: string,
): CoverageReport {
  const totals = emptyMetrics();
  return {
    generatedAt: Date.now(),
    totals,
    files: [],
    tree: { name: 'root', path: '', type: 'dir', metrics: totals, children: [] },
    provider: 'unknown',
    scanState: {
      source: 'watch',
      state: 'error',
      lastRunAt: 0,
      runner: detection.primary,
      detectedRunners: detection.detected,
      suggestedCommand: detection.suggestedCommand,
      error: message,
      artifactPath,
    },
  };
}

function hasData(report: CoverageReport): boolean {
  return report.files.length > 0;
}

/** Empty/missing test-results summary (used as the seed + the no-data state). */
function emptyTestSummary(): TestRunSummary {
  return {
    generatedAt: Date.now(),
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    cases: [],
    source: 'unknown',
    scanState: { state: 'idle', lastRunAt: 0, missingArtifact: true },
  };
}

/** Freshest test-report file under `cwd`, or null when none exist. */
function detectTestReport(cwd: string): string | null {
  const candidates = TEST_REPORT_CANDIDATES;
  let best: { path: string; mtimeMs: number } | null = null;
  for (const rel of candidates) {
    const abs = path.resolve(cwd, rel);
    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile()) continue;
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = { path: abs, mtimeMs: stat.mtimeMs };
      }
    } catch {
      // not present
    }
  }
  return best?.path ?? null;
}

/** Signed pct change per dimension (current minus previous). */
function computeDelta(
  prev: CoverageMetrics,
  next: CoverageMetrics,
): CoverageReport['delta'] {
  return {
    statements: round2(next.statements.pct - prev.statements.pct),
    branches: round2(next.branches.pct - prev.branches.pct),
    functions: round2(next.functions.pct - prev.functions.pct),
    lines: round2(next.lines.pct - prev.lines.pct),
  };
}

/**
 * Cheap content hash so we only disturb the WS stream when coverage
 * actually changed. Built from the totals, per-file line pct, and scan
 * lifecycle — enough to catch any meaningful transition.
 */
function hashReport(report: CoverageReport): string {
  const t = report.totals;
  const head = [
    report.scanState.state,
    report.scanState.missingArtifact ? '1' : '0',
    report.provider,
    t.lines.pct,
    t.branches.pct,
    t.functions.pct,
    t.statements.pct,
    report.files.length,
  ].join('|');
  const body = report.files
    .map((f) => `${f.relPath}:${f.metrics.lines.pct}:${f.metrics.branches.pct}`)
    .join(',');
  return `${head}#${body}`;
}

/** Project-relative POSIX path for display + tree placement. */
function toRelPosix(cwd: string, abs: string): string {
  const rel = path.relative(cwd, abs);
  return rel.split(path.sep).join('/');
}

const RUNNER_PRIORITY: RunnerName[] = ['vitest', 'jest', 'mocha', 'node:test'];

/** Heuristics that mark an npm script as the project's coverage command. */
const COVERAGE_SCRIPT_RE =
  /(--coverage|coverage\.reporter|coverageReporters|--experimental-test-coverage|--test-coverage|\bnyc\b|\bc8\b)/;

/**
 * Scan the project for every supported test runner (not just the first),
 * pick a primary (config override → first detected), and derive a
 * suggested coverage command for the empty state.
 *
 * Detection is deliberately recomputed on demand — it's a cheap
 * `package.json` read — so the label never goes stale when dependencies
 * or scripts change while Studio is running.
 */
function detectRunners(cwd: string, cfg: CoverageConfig): RunnerDetection {
  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  } = {};
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
  } catch {
    // No package.json / unreadable — fall through with empty detection.
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts = pkg.scripts ?? {};
  const scriptText = Object.values(scripts).join('\n');

  const detected: RunnerName[] = [];
  if (deps.vitest || /\bvitest\b/.test(scriptText)) detected.push('vitest');
  if (deps.jest || /\bjest\b/.test(scriptText)) detected.push('jest');
  if (deps.mocha || /\bmocha\b/.test(scriptText)) detected.push('mocha');
  if (/node\s+--test|node:test/.test(scriptText)) detected.push('node:test');

  // Honour priority order regardless of detection insertion order.
  detected.sort((a, b) => RUNNER_PRIORITY.indexOf(a) - RUNNER_PRIORITY.indexOf(b));

  // Primary: an explicit, supported config runner wins even if its
  // package isn't detected (the developer knows their setup).
  const primary: RunnerName | undefined = isSupportedRunner(cfg.runner)
    ? cfg.runner
    : detected[0];

  // Find a coverage-ish npm script by inspecting its body, not its name.
  let coverageScript: string | undefined;
  for (const [scriptName, body] of Object.entries(scripts)) {
    if (typeof body === 'string' && COVERAGE_SCRIPT_RE.test(body)) {
      coverageScript = scriptName;
      break;
    }
  }

  const suggestedCommand = pickSuggestedCommand(cfg, coverageScript, primary);

  return { detected, primary, suggestedCommand };
}

/** Empty-state command hint: config → coverage npm script → adapter example. */
function pickSuggestedCommand(
  cfg: CoverageConfig,
  coverageScript: string | undefined,
  primary: RunnerName | undefined,
): string {
  if (cfg.command && cfg.command.trim()) return cfg.command.trim();
  if (coverageScript) return `npm run ${coverageScript}`;
  const invocation = getRunnerInvocation(primary);
  if (invocation) return invocation.pretty;
  return 'vitest run --coverage';
}
