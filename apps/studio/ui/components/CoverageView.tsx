/**
 * Coverage View — local, git-aware code coverage intelligence.
 *
 * Renders the agent's `CoverageReport`:
 *   - Four summary cards (statements / branches / functions / lines)
 *     with run-over-run delta chips.
 *   - A collapsible, sortable coverage file-tree.
 *   - An annotated source viewer (covered / uncovered / partial gutters)
 *     fetched on demand, with one-click "open in editor".
 *   - A "Changed files" tab driven by git diff-coverage (Phase 2).
 *   - A "Tests" tab driven by parsed test results (Phase 4).
 *   - An optional "Run tests" action with a live transcript (Phase 3).
 *
 * Calm empty / error states keep "no coverage yet" visually distinct
 * from "0% covered", mirroring the Security view's tone.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileCode,
  Folder,
  FolderOpen,
  Gauge,
  GitCompare,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  TerminalSquare,
  TestTube,
  X,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type {
  CoverageMetric,
  CoverageMetrics,
  CoverageReport,
  CoverageTreeNode,
  FileCoverage,
} from '../types';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { openInEditor } from '../lib/open-in-editor';
import { cn } from '../lib/utils';
import { parseAnsiLine, stripAnsi } from '../lib/ansi';

type Tab = 'files' | 'changed' | 'tests';

const METRIC_LABELS: Array<{ key: keyof CoverageMetrics; label: string }> = [
  { key: 'lines', label: 'Lines' },
  { key: 'statements', label: 'Statements' },
  { key: 'functions', label: 'Functions' },
  { key: 'branches', label: 'Branches' },
];

/** Coverage percentage → semantic colour. >=80 good, >=50 warn, else bad. */
function pctTone(pct: number): { text: string; bar: string; bg: string } {
  if (pct >= 80) return { text: 'text-success-500', bar: 'bg-success-500', bg: 'bg-success-500/10' };
  if (pct >= 50) return { text: 'text-yellow-400', bar: 'bg-yellow-500', bg: 'bg-yellow-500/10' };
  return { text: 'text-error-500', bar: 'bg-error-500', bg: 'bg-error-500/10' };
}

function fmtPct(pct: number): string {
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
}

export function CoverageView() {
  const coverageReport = useAppStore((s) => s.coverageReport);
  const { requestCoverageReport, requestCoverageScan } = useSocket();
  const [tab, setTab] = useState<Tab>('files');

  // Pull the freshest report when the view mounts.
  useEffect(() => {
    requestCoverageReport();
  }, [requestCoverageReport]);

  const report = coverageReport;
  const missing = !report || report.scanState.missingArtifact;
  const errored = report?.scanState.state === 'error';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header report={report} onRefresh={requestCoverageScan} />

      {errored ? (
        <ErrorState message={report?.scanState.error} />
      ) : missing ? (
        <MissingState
          suggestedCommand={report?.scanState.suggestedCommand}
          detectedRunners={report?.scanState.detectedRunners}
        />
      ) : (
        <>
          <SummaryCards report={report!} />
          <TrendRow report={report!} />
          <Tabs tab={tab} setTab={setTab} report={report!} />
          <div className="flex-1 overflow-hidden">
            {tab === 'files' && <FilesTab report={report!} />}
            {tab === 'changed' && <ChangedTab report={report!} />}
            {tab === 'tests' && <TestsTab />}
          </div>
        </>
      )}

      <RunTranscript />
    </div>
  );
}

// ───────────────────────────────────────── Header ──────────────────────

function Header({
  report,
  onRefresh,
}: {
  report: CoverageReport | null;
  onRefresh: () => void;
}) {
  const parsing = report?.scanState.state === 'parsing';
  const runner = report?.scanState.runner;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/25 flex items-center justify-center">
          <Gauge className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Coverage</h1>
          <p className="text-xs text-gray-500">
            {report?.provider && report.provider !== 'unknown'
              ? `${report.provider} · `
              : ''}
            {runner ? `${runner} · ` : ''}
            {report?.scanState.lastRunAt
              ? `updated ${timeAgo(report.scanState.lastRunAt)}`
              : 'no run yet'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {report?.thresholds && typeof report.thresholds.passed === 'boolean' && (
          <span
            className={cn(
              'studio-pill',
              report.thresholds.passed
                ? 'bg-success-500/10 border-success-500/30 text-success-500'
                : 'bg-error-500/10 border-error-500/30 text-error-500',
            )}
            title="Coverage threshold gates"
          >
            {report.thresholds.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            {report.thresholds.passed ? 'Gates passing' : 'Gates failing'}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={parsing}
          className="studio-btn flex items-center gap-1.5 text-sm"
          title="Re-parse the latest coverage artifact"
        >
          <RefreshCw className={cn('w-4 h-4', parsing && 'animate-spin')} />
          Refresh
        </button>
        <RunButton report={report} />
      </div>
    </div>
  );
}

/**
 * "Run tests" action. With a single (or no) detected runner it's a plain
 * button. When several runners are installed it becomes a split button:
 * the main part runs the selected runner, the chevron opens a menu to
 * pick which one — so a multi-runner project isn't locked to the guess.
 */
function RunButton({ report }: { report: CoverageReport | null }) {
  const { runCoverage } = useSocket();
  const coverageRun = useAppStore((s) => s.coverageRun);
  const running = Boolean(coverageRun && !coverageRun.result);

  const detected = report?.scanState.detectedRunners ?? [];
  const primary = report?.scanState.runner;
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const effective = selected ?? primary;
  const multi = detected.length > 1;

  const run = useCallback(
    (r?: string) => {
      setOpen(false);
      if (r) setSelected(r);
      runCoverage(r ?? effective);
    },
    [effective, runCoverage],
  );

  const Icon = running ? Loader2 : Play;
  const mainLabel = running
    ? 'Running…'
    : multi && effective
      ? `Run ${effective}`
      : 'Run tests';

  if (!multi) {
    return (
      <button
        onClick={() => run(effective)}
        disabled={running}
        className="studio-btn-primary flex items-center gap-1.5 text-sm"
        title="Run the project's tests with coverage enabled"
      >
        <Icon className={cn('w-4 h-4', running && 'animate-spin')} />
        {mainLabel}
      </button>
    );
  }

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => run(effective)}
        disabled={running}
        className="studio-btn-primary flex items-center gap-1.5 text-sm rounded-r-none"
        title={`Run coverage with ${effective}`}
      >
        <Icon className={cn('w-4 h-4', running && 'animate-spin')} />
        {mainLabel}
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={running}
        className="studio-btn-primary rounded-l-none border-l border-primary-300/30 px-1.5"
        title="Choose a test runner"
        aria-label="Choose a test runner"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[170px] rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1">
            {detected.map((r) => (
              <button
                key={r}
                onClick={() => run(r)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-800 flex items-center gap-2',
                  r === effective ? 'text-primary-400' : 'text-gray-300',
                )}
              >
                <Play className="w-3.5 h-3.5 opacity-70" />
                Run with {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────── Summary ───────────────────────

function SummaryCards({ report }: { report: CoverageReport }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4">
      {METRIC_LABELS.map(({ key, label }) => (
        <MetricCard
          key={key}
          label={label}
          metric={report.totals[key]}
          delta={report.delta?.[key]}
        />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  metric,
  delta,
}: {
  label: string;
  metric: CoverageMetric;
  delta?: number;
}) {
  const tone = pctTone(metric.pct);
  return (
    <div className="rounded-xl border border-gray-800/70 bg-gray-900/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {typeof delta === 'number' && delta !== 0 && (
          <span
            className={cn(
              'text-[11px] font-semibold tabular-nums',
              delta > 0 ? 'text-success-500' : 'text-error-500',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
      <div className={cn('mt-2 text-2xl font-bold tabular-nums', tone.text)}>
        {fmtPct(metric.pct)}
      </div>
      <div className="mt-1 text-xs text-gray-500 tabular-nums">
        {metric.covered}/{metric.total}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full', tone.bar)}
          style={{ width: `${Math.min(100, metric.pct)}%` }}
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Trend ───────────────────────

function TrendRow({ report }: { report: CoverageReport }) {
  const history = report.history;
  if (!history || history.length < 2) return null;

  const data = history.map((p) => ({
    at: p.at,
    lines: p.lines,
    branches: p.branches,
  }));

  return (
    <div className="px-6 pb-4">
      <div className="rounded-xl border border-gray-800/70 bg-gray-900/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Coverage trend
          </span>
          <span className="text-[11px] text-gray-500 tabular-nums">
            {history.length} runs
          </span>
        </div>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  background: '#14171c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={() => ''}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Line
                type="monotone"
                dataKey="lines"
                stroke="#3de678"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="branches"
                stroke="#eab308"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Tabs ────────────────────────

function Tabs({
  tab,
  setTab,
  report,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  report: CoverageReport;
}) {
  const testResults = useAppStore((s) => s.testResults);
  const changedCount = report.diff?.files.length ?? 0;
  const failedCount = testResults?.failed ?? 0;

  const items: Array<{ id: Tab; label: string; icon: typeof FileCode; badge?: number }> = [
    { id: 'files', label: 'Files', icon: FileCode, badge: report.files.length },
    { id: 'changed', label: 'Changed', icon: GitCompare, badge: changedCount || undefined },
    { id: 'tests', label: 'Tests', icon: TestTube, badge: failedCount || undefined },
  ];

  return (
    <div className="flex items-center gap-1 px-6 border-b border-gray-800/60">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors',
              active
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-gray-200',
            )}
          >
            <Icon className="w-4 h-4" />
            {it.label}
            {typeof it.badge === 'number' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-300 text-[10px] tabular-nums">
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────── Files ────────────────────────

function FilesTab({ report }: { report: CoverageReport }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="h-full flex overflow-hidden">
      <div className={cn('overflow-auto', selected ? 'w-1/2 border-r border-gray-800/60' : 'w-full')}>
        <div className="px-4 py-2">
          {report.tree.children && report.tree.children.length > 0 ? (
            report.tree.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={0}
                selected={selected}
                onSelect={setSelected}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500 px-2 py-4">No files in coverage report.</p>
          )}
        </div>
      </div>
      {selected && (
        <SourceViewer
          relPath={selected}
          file={report.files.find((f) => f.relPath === selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: CoverageTreeNode;
  depth: number;
  selected: string | null;
  onSelect: (relPath: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const tone = pctTone(node.metrics.lines.pct);
  const isFile = node.type === 'file';
  const isSelected = isFile && selected === node.path;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm',
          isSelected ? 'bg-primary-500/10' : 'hover:bg-gray-800/50',
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => (isFile ? onSelect(node.path) : setOpen((v) => !v))}
      >
        <span className="flex-shrink-0 text-gray-500">
          {isFile ? (
            <FileCode className="w-4 h-4" />
          ) : open ? (
            <FolderOpen className="w-4 h-4 text-primary-400/70" />
          ) : (
            <Folder className="w-4 h-4 text-primary-400/70" />
          )}
        </span>
        {!isFile && (
          <span className="flex-shrink-0 text-gray-600">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
        <span className={cn('flex-1 truncate', isSelected ? 'text-white' : 'text-gray-300')}>
          {node.name}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-20 h-1.5 rounded-full bg-gray-800 overflow-hidden hidden sm:block">
            <div
              className={cn('h-full rounded-full', tone.bar)}
              style={{ width: `${Math.min(100, node.metrics.lines.pct)}%` }}
            />
          </div>
          <span className={cn('w-12 text-right tabular-nums text-xs', tone.text)}>
            {fmtPct(node.metrics.lines.pct)}
          </span>
        </div>
      </div>
      {!isFile && open && node.children?.map((child) => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────── Source viewer ─────────────────────

function SourceViewer({
  relPath,
  file,
  onClose,
}: {
  relPath: string;
  file?: FileCoverage;
  onClose: () => void;
}) {
  const coverageSource = useAppStore((s) => s.coverageSource);
  const setCoverageSource = useAppStore((s) => s.setCoverageSource);
  const { requestCoverageSource } = useSocket();

  useEffect(() => {
    setCoverageSource(null);
    requestCoverageSource(relPath);
  }, [relPath, requestCoverageSource, setCoverageSource]);

  const source = coverageSource?.relPath === relPath ? coverageSource : null;
  const uncovered = useMemo(
    () => new Set(source?.uncoveredLines ?? file?.uncoveredLines ?? []),
    [source, file],
  );
  const partial = useMemo(
    () => new Set(source?.partialBranchLines ?? file?.partialBranchLines ?? []),
    [source, file],
  );

  const openHere = useCallback(() => {
    if (!file) return;
    const firstUncovered = file.uncoveredLines[0];
    openInEditor({ filePath: file.path, lineNumber: firstUncovered });
  }, [file]);

  return (
    <div className="w-1/2 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60">
        <span className="text-xs font-mono text-gray-300 truncate" title={relPath}>
          {relPath}
        </span>
        <div className="flex items-center gap-1">
          {file && (
            <button onClick={openHere} className="studio-btn text-xs px-2 py-1">
              Open in editor
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {source === null ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading source…
          </div>
        ) : source.content === null ? (
          <div className="p-4 text-gray-500">{source.error ?? 'Source unavailable.'}</div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {source.content.split('\n').map((text, i) => {
                const ln = i + 1;
                const isUncovered = uncovered.has(ln);
                const isPartial = !isUncovered && partial.has(ln);
                return (
                  <tr
                    key={ln}
                    className={cn(
                      isUncovered && 'bg-error-500/10',
                      isPartial && 'bg-yellow-500/10',
                    )}
                  >
                    <td
                      className={cn(
                        'select-none text-right pr-3 pl-3 w-12 text-gray-600 border-l-2',
                        isUncovered
                          ? 'border-error-500'
                          : isPartial
                            ? 'border-yellow-500'
                            : 'border-transparent',
                      )}
                    >
                      {ln}
                    </td>
                    <td className="pr-4 whitespace-pre text-gray-300">{text || ' '}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────── Changed ───────────────────────

function ChangedTab({ report }: { report: CoverageReport }) {
  const diff = report.diff;

  if (!diff || diff.unavailable) {
    return (
      <EmptyHint
        icon={GitCompare}
        title="Diff coverage unavailable"
        body={diff?.reason ?? 'Not a git repository, or no changes detected against the base.'}
      />
    );
  }
  if (diff.files.length === 0) {
    return (
      <EmptyHint
        icon={GitCompare}
        title="No changed lines"
        body={`Nothing changed vs ${diff.base}. Edit a tracked file to see diff coverage.`}
      />
    );
  }

  const tone = pctTone(diff.pct);
  return (
    <div className="h-full overflow-auto px-6 py-4">
      <div className="rounded-xl border border-gray-800/70 bg-gray-900/40 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Diff coverage</p>
            <p className="text-xs text-gray-500 mt-0.5">vs {diff.base}</p>
          </div>
          <div className={cn('text-2xl font-bold tabular-nums', tone.text)}>
            {fmtPct(diff.pct)}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 tabular-nums">
          {diff.coveredLineCount}/{diff.changedLineCount} changed lines covered ·{' '}
          <span className="text-error-500">{diff.uncoveredLineCount} uncovered</span>
        </p>
      </div>

      <div className="space-y-2">
        {diff.files.map((f) => {
          const t = pctTone(f.pct);
          return (
            <div
              key={f.relPath}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800/60 bg-gray-900/30"
            >
              <FileCode className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <button
                className="flex-1 truncate text-left text-sm text-gray-300 hover:text-white font-mono"
                onClick={() => openInEditor({ filePath: f.path, lineNumber: f.uncoveredChanged[0] })}
                title={f.relPath}
              >
                {f.relPath}
              </button>
              <span className="text-xs text-gray-500 tabular-nums">
                {f.coveredChanged.length}/{f.changedLines.length}
              </span>
              <span className={cn('w-12 text-right tabular-nums text-xs', t.text)}>
                {fmtPct(f.pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────── Tests ────────────────────────

function TestsTab() {
  const testResults = useAppStore((s) => s.testResults);

  if (!testResults || testResults.scanState.missingArtifact) {
    return (
      <EmptyHint
        icon={TestTube}
        title="No test results yet"
        body="Run your tests (or emit a JUnit/JSON report) to see pass/fail and the slowest tests here."
      />
    );
  }

  const { passed, failed, skipped, total, durationMs, cases } = testResults;
  return (
    <div className="h-full overflow-auto px-6 py-4">
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="text-success-500 font-semibold tabular-nums">{passed} passed</span>
        {failed > 0 && <span className="text-error-500 font-semibold tabular-nums">{failed} failed</span>}
        {skipped > 0 && <span className="text-gray-400 tabular-nums">{skipped} skipped</span>}
        <span className="text-gray-500 tabular-nums">· {total} total · {(durationMs / 1000).toFixed(2)}s</span>
      </div>
      <div className="space-y-1.5">
        {cases.map((c, i) => (
          <div
            key={`${c.name}-${i}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800/60 bg-gray-900/30"
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                c.status === 'passed' && 'bg-success-500',
                c.status === 'failed' && 'bg-error-500',
                c.status === 'skipped' && 'bg-gray-500',
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{c.name}</p>
              {c.message && <p className="text-xs text-error-400 truncate mt-0.5">{c.message}</p>}
            </div>
            <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
              {c.durationMs.toFixed(0)}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────── Run transcript ────────────────────

// A test run boots the app, which prints the ExpressoTS banner: a big box-art
// logo (█ ╔ ╗ ╚ ╝ ║ ═) followed by a readable status grid (⚡ Server / 💚 Health
// / ⏱ Startup …). The logo carries no value in the coverage terminal, so we
// drop those lines entirely. Detection is by glyph composition (the block
// letters use ╔╝ glyphs, so box top/bottom matching is unreliable); the status
// grid is NOT art and stays visible and coloured next to the test output.
const ART_GLYPHS = /[█╔╗╚╝║═╠╣╦╩╬╟╢╤╧▀▄▌▐▔▁░▒▓]/g;

function isAsciiArtLine(plain: string): boolean {
  // Box-frame rows lead with a frame glyph. Check this first: blank padding
  // rows (║ … spaces … ║) collapse to just "║║" and would otherwise fall
  // through the density guard below.
  if (/^[║╔╚╠╣]/.test(plain.trim())) return true;
  const dense = plain.replace(/\s/g, '');
  if (dense.length < 3) return false;
  const art = dense.match(ART_GLYPHS)?.length ?? 0;
  return art / dense.length >= 0.6;
}

function RunTranscript() {
  const coverageRun = useAppStore((s) => s.coverageRun);
  const clearCoverageRun = useAppStore((s) => s.clearCoverageRun);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleLines = useMemo(
    () => (coverageRun?.lines ?? []).filter((l) => !isAsciiArtLine(stripAnsi(l.text))),
    [coverageRun?.lines],
  );
  const lineCount = visibleLines.length;

  // Auto-scroll to the newest output, like a real terminal.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lineCount, collapsed]);

  if (!coverageRun) return null;
  const done = Boolean(coverageRun.result);
  const success = coverageRun.result?.success;

  const statusDot = !done
    ? 'bg-amber-400 animate-pulse'
    : success
      ? 'bg-emerald-400'
      : 'bg-error-400';

  return (
    <div className="border-t border-gray-800/60 bg-gray-950/80 p-3">
      <div className="overflow-hidden rounded-lg border border-gray-800/70 bg-[#0b0d12] shadow-inner">
        {/* Faux terminal title bar */}
        <div className="flex items-center justify-between border-b border-gray-800/60 bg-gray-900/40 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-700/60 bg-gray-800/50"
              aria-hidden
            >
              <TerminalSquare className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span className="text-xs font-medium text-gray-300">
              {done ? (success ? 'Test run complete' : 'Test run failed') : 'Running tests'}
            </span>
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} />
            {coverageRun.result && (
              <span className="text-[11px] text-gray-500">{coverageRun.result.summary}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
            >
              {collapsed ? 'Show' : 'Hide'}
            </button>
            {done && (
              <button
                onClick={clearCoverageRun}
                className="rounded p-0.5 text-gray-500 hover:bg-gray-800/60 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div
            ref={scrollRef}
            className="max-h-64 overflow-auto px-3 py-2 font-mono text-xs leading-5 text-gray-300 [scrollbar-width:thin]"
          >
            {lineCount === 0 ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for output…
              </div>
            ) : (
              visibleLines.map((line, i) => <TranscriptLine key={i} line={line} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptLine({ line }: { line: { stream: 'stdout' | 'stderr'; text: string } }) {
  const segments = useMemo(() => parseAnsiLine(line.text), [line.text]);
  // stderr with no colour of its own gets a subtle red tint; coloured output
  // is trusted to carry its own meaning.
  const hasColor = segments.some((s) => s.style.color);
  return (
    <div
      className={cn('whitespace-pre-wrap break-words', line.stream === 'stderr' && !hasColor && 'text-error-400')}
    >
      {segments.map((seg, i) => (
        <span key={i} style={seg.style}>
          {seg.text}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────── Shared states ─────────────────────

function MissingState({
  suggestedCommand,
  detectedRunners,
}: {
  suggestedCommand?: string;
  detectedRunners?: string[];
}) {
  const command = suggestedCommand || 'vitest run --coverage';
  const detectedLine =
    detectedRunners && detectedRunners.length > 0
      ? `Detected: ${detectedRunners.join(', ')}.`
      : '';
  const body = [
    'Run your tests with coverage enabled, then this view updates automatically.',
    `Try: \`${command}\``,
    detectedLine,
  ]
    .filter(Boolean)
    .join('\n');

  return <EmptyHint icon={Gauge} title="No coverage data yet" body={body} />;
}

function ErrorState({ message }: { message?: string }) {
  return (
    <EmptyHint
      icon={AlertCircle}
      title="Could not read coverage"
      body={message ?? 'The coverage artifact could not be parsed.'}
      tone="error"
    />
  );
}

function EmptyHint({
  icon: Icon,
  title,
  body,
  tone = 'neutral',
}: {
  icon: typeof Gauge;
  title: string;
  body: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className={cn(
            'w-12 h-12 rounded-xl border flex items-center justify-center mx-auto mb-4',
            tone === 'error'
              ? 'bg-error-500/10 border-error-500/30'
              : 'bg-gray-800/50 border-gray-700/60',
          )}
        >
          <Icon className={cn('w-6 h-6', tone === 'error' ? 'text-error-500' : 'text-gray-400')} />
        </div>
        <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
        <p className="text-sm text-gray-500 whitespace-pre-line">{body}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────── Utils ─────────────────────────

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
