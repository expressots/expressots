/**
 * Security View
 *
 * Combines two stories Studio uniquely can tell:
 *
 *   1. Dependencies (supply-chain)
 *      Severity-grouped CVE / GHSA findings from `npm audit` + OSV.dev.
 *      Each card shows installed/fixed versions, CVSS, transitive
 *      resolution chain and links out to the upstream advisory.
 *
 *   2. Runtime Posture (OWASP-mapped)
 *      Heuristic checks the agent performs over recorded traffic,
 *      routes, structure and logs — missing security headers, wildcard
 *      CORS, unauthenticated routes, stack-trace leakage, etc. Each
 *      finding deep-links to its evidence (a recorded exchange, route
 *      list, log line, or source file).
 *
 * The view is intentionally calm in the empty / scanning / error
 * states so users never confuse "we haven't scanned yet" with "you're
 * secure". The header banner reports `scanState` explicitly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileCode,
  FileText,
  Info,
  Loader2,
  Package,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Target,
  Terminal,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import type {
  DependencyFinding,
  FixGroup,
  FixSpec,
  PostureFinding,
  Reachability,
  SecurityReport,
  Severity,
} from '../types';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { openInEditor } from '../lib/open-in-editor';
import { cn } from '../lib/utils';

type Tab = 'dependencies' | 'posture';

const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

/**
 * Tailwind class bundles per severity. Kept identical between the
 * Dependencies and Posture tabs so the visual vocabulary is consistent
 * across the whole view.
 */
const SEVERITY_STYLES: Record<
  Severity,
  { dot: string; chip: string; ring: string; text: string }
> = {
  CRITICAL: {
    dot: 'bg-red-500',
    chip: 'bg-red-500/10 text-red-400 border-red-500/30',
    ring: 'border-red-500/30',
    text: 'text-red-400',
  },
  HIGH: {
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    ring: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  MEDIUM: {
    dot: 'bg-yellow-500',
    chip: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    ring: 'border-yellow-500/30',
    text: 'text-yellow-400',
  },
  LOW: {
    dot: 'bg-blue-500',
    chip: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    ring: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  INFO: {
    dot: 'bg-gray-500',
    chip: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    ring: 'border-gray-500/30',
    text: 'text-gray-400',
  },
};

const SCORE_STYLES: Record<
  SecurityReport['score'],
  { badge: string; tone: string; text: string }
> = {
  A: {
    badge: 'bg-success-500/10 border-success-500/40 text-success-500',
    tone: 'success',
    text: 'text-success-500',
  },
  B: {
    badge: 'bg-primary-500/10 border-primary-500/40 text-primary-400',
    tone: 'primary',
    text: 'text-primary-400',
  },
  C: {
    badge: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
    tone: 'yellow',
    text: 'text-yellow-400',
  },
  D: {
    badge: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
    tone: 'orange',
    text: 'text-orange-400',
  },
  F: {
    badge: 'bg-red-500/10 border-red-500/40 text-red-400',
    tone: 'red',
    text: 'text-red-400',
  },
};

/**
 * Plain-English grade rubric. Mirrors `gradeFromCounts()` in
 * `studio-agent/src/security/score.ts` 1:1 — keep them in sync if the
 * thresholds ever change. Each entry tells the user three things they
 * always want to know:
 *
 *   - status: a single word for the current state ("Excellent" / "Critical")
 *   - meaning: what the grade is saying about the app
 *   - rule: the precise threshold that triggers this grade (so users
 *     can reverse-engineer "why am I a B?" without reading source).
 */
const SCORE_RUBRIC: Record<
  SecurityReport['score'],
  { status: string; meaning: string; rule: string }
> = {
  A: {
    status: 'Excellent',
    meaning: 'No medium-or-higher security issues.',
    rule: 'Zero CRITICAL/HIGH/MEDIUM findings (LOW + INFO are advisory only).',
  },
  B: {
    status: 'Good',
    meaning: 'A few medium-severity issues to triage.',
    rule: 'At least one MEDIUM finding, but no HIGH or CRITICAL.',
  },
  C: {
    status: 'Manageable',
    meaning: 'Some high-severity posture issues, or many medium ones.',
    rule: 'At least one HIGH posture finding, or 5+ MEDIUM findings.',
  },
  D: {
    status: 'Needs work',
    meaning: 'Multiple high-severity issues — exposure is meaningful.',
    rule: '3+ HIGH findings overall, or any HIGH supply-chain CVE.',
  },
  F: {
    status: 'Critical',
    meaning: 'At least one critical-severity issue exists.',
    rule: 'One or more CRITICAL findings (supply-chain or runtime posture).',
  },
};

export function SecurityView() {
  const { securityReport, connected, setCurrentView, setSelectedExchangeId } =
    useAppStore();
  const { requestSecurityScan } = useSocket();
  const [tab, setTab] = useState<Tab>('dependencies');

  const report = securityReport;
  const scanning = report?.scanState.audit === 'running';

  // Diff finding ids against the previous scan so the UI can flag
  // entries that just appeared. Persisted in localStorage so refreshes
  // don't reset the baseline.
  const newFindingIds = useNewFindingIds(report);

  // Local triage of accepted findings. Lifted to the top of the view
  // so the Top fixes panel and both tabs share the same baseline.
  const suppressions = useSuppressions();

  return (
    <div className="space-y-6">
      {/* Header banner — score + plain-English explainer + rescan */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <ScoreBadge report={report} />
            <ScoreExplainer report={report} />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ConnectionPill connected={connected} />
            <AutoRescanToggle
              connected={connected}
              onTrigger={() => requestSecurityScan()}
            />
            <ExportMenu report={report} suppressions={suppressions} />
            <button
              onClick={() => requestSecurityScan()}
              disabled={scanning}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
                scanning
                  ? 'bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700',
              )}
              title="Re-run npm audit + OSV.dev lookup"
            >
              {scanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {scanning ? 'Scanning…' : 'Rescan'}
            </button>
          </div>
        </div>

        <ScanStateBanner report={report} />
        <CountStrip report={report} />
        <RubricDisclosure report={report} />
      </div>

      {/* Top fixes — curated 3-item action list answering
          "what should I do FIRST?" instead of forcing the user
          to scroll through every advisory. */}
      <TopFixesPanel
        report={report}
        suppressions={suppressions}
        onSwitchTab={(t) => setTab(t)}
        onOpenExchange={(id) => {
          setCurrentView('requests');
          setSelectedExchangeId(id);
        }}
        onOpenRoute={() => setCurrentView('requests')}
        onOpenLogs={() => setCurrentView('logs')}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-800">
        <TabButton
          active={tab === 'dependencies'}
          onClick={() => setTab('dependencies')}
          label="Dependencies"
          count={report?.dependencies.length ?? 0}
        />
        <TabButton
          active={tab === 'posture'}
          onClick={() => setTab('posture')}
          label="Runtime Posture"
          count={report?.posture.length ?? 0}
        />
      </div>

      {/* Body */}
      {tab === 'dependencies' && (
        <DependenciesTab
          report={report}
          newFindingIds={newFindingIds}
          suppressions={suppressions}
        />
      )}
      {tab === 'posture' && (
        <PostureTab
          report={report}
          newFindingIds={newFindingIds}
          suppressions={suppressions}
          onOpenExchange={(id) => {
            setCurrentView('requests');
            setSelectedExchangeId(id);
          }}
          onOpenRoute={() => setCurrentView('requests')}
          onOpenLogs={() => setCurrentView('logs')}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Score / scan-state UI
// ────────────────────────────────────────────────────────────────────────

function ScoreBadge({ report }: { report: SecurityReport | null }) {
  const score = report?.score ?? 'A';
  const styles = SCORE_STYLES[score];
  const rubric = SCORE_RUBRIC[score];
  return (
    <div
      className={cn(
        'w-16 h-16 rounded-lg border flex flex-col items-center justify-center shrink-0',
        styles.badge,
      )}
      title={`Grade ${score} — ${rubric.status}. ${rubric.meaning}`}
    >
      <span className="text-2xl font-bold leading-none">{score}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
        Grade
      </span>
    </div>
  );
}

/**
 * Translates the raw letter grade into something a developer can act on:
 *
 *   - what the grade means in plain English
 *   - the precise rule that triggered it (matches `gradeFromCounts()`)
 *   - the *next* grade you can reach and what it would take to get there
 *
 * Without this users see "B" and have no idea whether that's good or
 * what's holding them back from "A". With it the answer is on screen.
 */
function ScoreExplainer({ report }: { report: SecurityReport | null }) {
  const score = report?.score ?? 'A';
  const rubric = SCORE_RUBRIC[score];
  const styles = SCORE_STYLES[score];
  const counts = report?.counts ?? { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  const supplyChainHigh =
    report?.dependencies.filter((d) => d.severity === 'HIGH').length ?? 0;

  const drivers = describeDrivers(score, counts, supplyChainHigh);
  const next = describePathToNextGrade(score, counts, supplyChainHigh);
  const trend = useSecurityTrend(report);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Security
        </h2>
        <span className={cn('text-sm font-semibold', styles.text)}>
          {rubric.status}
        </span>
        <span className="text-xs text-gray-500">·</span>
        <span className="text-xs text-gray-400">{rubric.meaning}</span>
      </div>

      {drivers.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          <span className="text-gray-500">Why grade {score}:&nbsp;</span>
          {drivers.join(' · ')}
        </p>
      )}

      {next && (
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          <span className="text-gray-500">To reach {next.target}:&nbsp;</span>
          {next.action}
        </p>
      )}

      <TrendStrip points={trend} currentScore={score} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Export — Markdown / JSON downloads for sharing reports
// ────────────────────────────────────────────────────────────────────────

/**
 * Build a self-contained Markdown report a user can paste into a PR
 * description, GitHub issue, or Slack message. Each section maps 1:1
 * to what they see in the UI so screenshots and the export agree.
 *
 * We intentionally include suppression metadata as a separate section
 * (rather than silently dropping suppressed findings) so a downstream
 * reviewer can see what was acked and why.
 */
function buildMarkdownReport(
  report: SecurityReport,
  suppressions: SuppressionsApi,
): string {
  const ts = new Date(report.generatedAt).toISOString();
  const rubric = SCORE_RUBRIC[report.score];
  const lines: string[] = [];

  lines.push(`# Security report — Grade ${report.score} (${rubric.status})`);
  lines.push('');
  lines.push(`*Generated by ExpressoTS Studio at ${ts}*`);
  lines.push('');
  lines.push(`> ${rubric.meaning}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('| -------- | ----: |');
  for (const sev of SEVERITY_ORDER) {
    lines.push(`| ${sev} | ${report.counts[sev]} |`);
  }
  lines.push('');

  lines.push(`- **Dependencies:** ${report.dependencies.length}`);
  lines.push(`- **Posture:** ${report.posture.length}`);
  lines.push(`- **Recommended fix groups:** ${report.fixGroups.length}`);
  lines.push(`- **Locally suppressed:** ${suppressions.count}`);
  lines.push('');

  // Recommended fixes — the "what to actually change" section. Mirrors
  // the headline panel in the UI so the export starts where the eye
  // already lands.
  if (report.fixGroups.length > 0) {
    lines.push('## Recommended fixes');
    lines.push('');
    for (const g of report.fixGroups) {
      lines.push(
        `- **${g.severity}** — \`${g.package}\` ${g.fromVersion} → ${g.toVersion}` +
          ` (fixes ${g.findingIds.length})${g.breaking ? ' · breaking' : ''}`,
      );
      if (g.fix.command) {
        lines.push(`  - \`${g.fix.command}\``);
      }
      if (g.reachability) {
        lines.push(`  - reachability: ${g.reachability}`);
      }
    }
    lines.push('');
  }

  // Dependencies — group by severity so reviewers can scan top-down.
  if (report.dependencies.length > 0) {
    lines.push('## Dependency findings');
    lines.push('');
    const byRule = groupBySeverity(report.dependencies);
    for (const sev of SEVERITY_ORDER) {
      const items = byRule[sev] ?? [];
      if (items.length === 0) continue;
      lines.push(`### ${sev} (${items.length})`);
      lines.push('');
      for (const f of items) {
        const acked = suppressions.isSuppressed(`d:${f.id}`) ? ' _(suppressed)_' : '';
        const reach = f.reachability ? ` · ${f.reachability.level}` : '';
        const cvss = f.cvss !== undefined ? ` · CVSS ${f.cvss.toFixed(1)}` : '';
        lines.push(
          `- **${f.id}** — \`${f.package}@${f.installedVersion}\`` +
            `${f.fixedVersion ? ` → fix in ${f.fixedVersion}` : ''}` +
            `${cvss}${reach}${acked}`,
        );
        lines.push(`  - ${f.title}`);
      }
      lines.push('');
    }
  }

  // Posture — also grouped by severity, with OWASP tag for quick
  // context. We omit the long description because the title + rule is
  // enough to recognise each finding back in the UI.
  if (report.posture.length > 0) {
    lines.push('## Runtime posture findings');
    lines.push('');
    const byRule = groupBySeverity(report.posture);
    for (const sev of SEVERITY_ORDER) {
      const items = byRule[sev] ?? [];
      if (items.length === 0) continue;
      lines.push(`### ${sev} (${items.length})`);
      lines.push('');
      for (const f of items) {
        const acked = suppressions.isSuppressed(`p:${f.id}`) ? ' _(suppressed)_' : '';
        const owasp = f.owasp ? ` · ${f.owasp}` : '';
        lines.push(`- **${f.rule}**${owasp} — ${f.title}${acked}`);
        if (f.fixHint) lines.push(`  - Fix: ${f.fixHint}`);
      }
      lines.push('');
    }
  }

  if (suppressions.count > 0) {
    lines.push('## Locally suppressed findings');
    lines.push('');
    lines.push(
      'Suppressed via the Studio UI; tracked in browser localStorage and **not** reflected in the grade.',
    );
    lines.push('');
    for (const [prefixedId, s] of Object.entries(suppressions.map)) {
      const when = new Date(s.ackedAt).toISOString();
      lines.push(`- \`${prefixedId}\` — ${s.reason} _(acked ${when})_`);
    }
    lines.push('');
  }

  lines.push('## Scan state');
  lines.push('');
  lines.push(`- npm audit: \`${report.scanState.audit}\``);
  if (report.scanState.auditError) {
    lines.push(`- audit error: ${report.scanState.auditError}`);
  }
  if (report.scanState.missingLockfile) {
    lines.push('- ⚠️ No package-lock.json — supply-chain scanning was skipped.');
  }
  lines.push(
    `- posture last analyzed: ${
      report.scanState.postureLastRunAt > 0
        ? new Date(report.scanState.postureLastRunAt).toISOString()
        : 'never'
    }`,
  );
  lines.push('');

  return lines.join('\n');
}

/**
 * The JSON variant is the raw `SecurityReport` plus a small `meta`
 * envelope so consumers can detect the format and version. We don't
 * include suppressions in JSON exports — they're personal triage
 * decisions that don't belong in a shared file.
 */
function buildJsonReport(report: SecurityReport): string {
  const envelope = {
    meta: {
      kind: 'expressots-studio-security-report',
      version: 1,
      generatedAt: new Date(report.generatedAt).toISOString(),
    },
    report,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Trigger a browser download of arbitrary text content. We deliberately
 * use a Blob + object URL (rather than `data:` URIs) so the filename
 * sticks and large reports don't blow the URL length limit.
 */
function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser actually finishes the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportMenu({
  report,
  suppressions,
}: {
  report: SecurityReport | null;
  suppressions: SuppressionsApi;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close the menu on outside-click or escape — small UX nicety so it
  // doesn't trap clicks anywhere else in the view.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const disabled = !report;
  const ts =
    report?.generatedAt != null
      ? new Date(report.generatedAt).toISOString().replace(/[:.]/g, '-').slice(0, 19)
      : 'unscanned';

  const handleCopyMd = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownReport(report, suppressions));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; fall back to a download instead.
      downloadFile(`security-report-${ts}.md`, buildMarkdownReport(report, suppressions), 'text/markdown');
    }
    setOpen(false);
  };

  const handleDownloadMd = () => {
    if (!report) return;
    downloadFile(
      `security-report-${ts}.md`,
      buildMarkdownReport(report, suppressions),
      'text/markdown',
    );
    setOpen(false);
  };

  const handleDownloadJson = () => {
    if (!report) return;
    downloadFile(
      `security-report-${ts}.json`,
      buildJsonReport(report),
      'application/json',
    );
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
          disabled
            ? 'bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700',
        )}
        title="Export the current report"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown
          className={cn('w-3 h-3 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-20 w-56 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
          <ExportMenuItem
            icon={copied ? CheckCircle2 : Copy}
            label={copied ? 'Copied!' : 'Copy as Markdown'}
            sublabel="For Slack / PR descriptions"
            onClick={handleCopyMd}
          />
          <ExportMenuItem
            icon={FileText}
            label="Download Markdown"
            sublabel=".md file"
            onClick={handleDownloadMd}
          />
          <ExportMenuItem
            icon={FileCode}
            label="Download JSON"
            sublabel="Raw report (.json)"
            onClick={handleDownloadJson}
          />
        </div>
      )}
    </div>
  );
}

function ExportMenuItem({
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-gray-800 flex items-start gap-2.5 transition-colors"
    >
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-200">{label}</div>
        <div className="text-[10px] text-gray-500">{sublabel}</div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Auto-rescan — UI-side toggle that watches structure changes
// ────────────────────────────────────────────────────────────────────────

const AUTO_RESCAN_KEY = 'expressots.studio.security.autoRescan';
const AUTO_RESCAN_DEBOUNCE_MS = 5000;

/**
 * Tiny header toggle. When enabled, listens to `appStructure` changes
 * (which the agent broadcasts whenever the file watcher fires) and
 * triggers a full security rescan after a debounce window.
 *
 * `npm audit` + OSV is expensive (10–30s for big projects) so we
 * deliberately keep this opt-in. The 5-second debounce coalesces a
 * burst of saves into a single scan.
 */
function AutoRescanToggle({
  connected,
  onTrigger,
}: {
  connected: boolean;
  onTrigger: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_RESCAN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const structure = useAppStore((s) => s.structure);
  const lastTriggeredAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstStructureSeenRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_RESCAN_KEY, enabled ? '1' : '0');
    } catch {
      // localStorage unavailable; toggle still works for the session.
    }
  }, [enabled]);

  // Reset the trigger window when the user toggles off. Avoids a stale
  // timer firing later and surprising the user with an unexpected scan.
  useEffect(() => {
    if (enabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !connected) return;
    // Skip the first structure broadcast — it always fires once on
    // (re)connect and we don't want a phantom scan every time the user
    // opens Studio.
    if (!firstStructureSeenRef.current) {
      firstStructureSeenRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastTriggeredAtRef.current = Date.now();
      onTrigger();
      timerRef.current = null;
    }, AUTO_RESCAN_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We only want to react to structure changes — `onTrigger` is a
    // stable callback from `useSocket`, but adding it would re-run on
    // every render and reset the timer unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, enabled, connected]);

  return (
    <button
      onClick={() => setEnabled((v) => !v)}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors border',
        enabled
          ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
      )}
      title={
        enabled
          ? `Auto-rescans ${AUTO_RESCAN_DEBOUNCE_MS / 1000}s after the agent reports a code change. Click to disable.`
          : 'Click to auto-rescan whenever the agent detects a source file change.'
      }
    >
      <RefreshCw className={cn('w-3 h-3', enabled && 'text-primary-300')} />
      Auto-rescan {enabled ? 'on' : 'off'}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Trend sparkline — visual "I'm improving / regressing" feedback
// ────────────────────────────────────────────────────────────────────────

interface TrendPoint {
  /** Scan timestamp (ms epoch) — same as `report.generatedAt`. */
  at: number;
  /** Letter grade at this scan. */
  score: SecurityReport['score'];
  /** CRITICAL + HIGH count — the "actionable" subset we plot. */
  blocking: number;
  /** Total findings across both dependencies and posture. */
  total: number;
}

const TREND_STORAGE_KEY = 'expressots.studio.security.trend';
const TREND_MAX_POINTS = 30;

/**
 * Persists a per-scan trend series in localStorage so the user gets
 * visual feedback of "I went from 11 → 3 blocking findings over the
 * last hour of work" without any agent-side bookkeeping.
 *
 * We dedupe by `generatedAt`, so manual rescans that produce identical
 * reports don't pad the series. The series is capped at `TREND_MAX_POINTS`.
 */
function useSecurityTrend(report: SecurityReport | null): TrendPoint[] {
  const [points, setPoints] = useState<TrendPoint[]>(() => readTrend());
  const lastSeenAtRef = useRef<number>(0);

  useEffect(() => {
    if (!report) return;
    if (report.generatedAt === lastSeenAtRef.current) return;
    lastSeenAtRef.current = report.generatedAt;

    const next: TrendPoint = {
      at: report.generatedAt,
      score: report.score,
      blocking: report.counts.CRITICAL + report.counts.HIGH,
      total:
        report.counts.CRITICAL +
        report.counts.HIGH +
        report.counts.MEDIUM +
        report.counts.LOW +
        report.counts.INFO,
    };

    setPoints((prev) => {
      const dedup = prev.filter((p) => p.at !== next.at);
      const updated = [...dedup, next].slice(-TREND_MAX_POINTS);
      try {
        localStorage.setItem(TREND_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage may be disabled (private mode); the in-memory
        // state still works for the lifetime of the tab.
      }
      return updated;
    });
  }, [report]);

  return points;
}

function readTrend(): TrendPoint[] {
  try {
    const raw = localStorage.getItem(TREND_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrendPoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-TREND_MAX_POINTS);
  } catch {
    return [];
  }
}

/**
 * Compact strip rendered at the bottom of the score explainer. Hides
 * itself for the first scan (a single dot would be misleading) and
 * shows a tight summary plus a sparkline of blocking findings over
 * the most recent scans.
 */
function TrendStrip({
  points,
  currentScore,
}: {
  points: TrendPoint[];
  currentScore: SecurityReport['score'];
}) {
  if (points.length < 2) {
    return (
      <p className="text-[11px] text-gray-600 mt-2">
        Trend will appear after a few scans.
      </p>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.blocking - first.blocking;
  const direction = delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat';
  const directionTone =
    direction === 'down'
      ? 'text-success-500'
      : direction === 'up'
        ? 'text-orange-300'
        : 'text-gray-500';
  const directionWord =
    direction === 'down' ? 'improving' : direction === 'up' ? 'regressing' : 'stable';

  // The grade may have changed during the window — surface that as a
  // small phrase, e.g. "C → B over 7 scans".
  const gradeChange =
    first.score !== last.score
      ? `${first.score} → ${last.score}`
      : `held at ${currentScore}`;

  return (
    <div className="flex items-center gap-3 mt-3">
      <Sparkline points={points} />
      <div className="text-[11px] text-gray-400 leading-tight min-w-0">
        <div>
          <span className={cn('font-medium', directionTone)}>
            {directionWord}
          </span>
          <span className="text-gray-600"> · {points.length} scans</span>
        </div>
        <div className="text-gray-500 mt-0.5">
          {gradeChange}
          {delta !== 0 && (
            <>
              {' · '}
              blocking {first.blocking} → {last.blocking}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight inline-SVG sparkline of blocking-finding counts. We
 * deliberately avoid pulling in a charting library — the data is tiny
 * and the visual is just one polyline + a current-value dot.
 */
function Sparkline({ points }: { points: TrendPoint[] }) {
  const W = 140;
  const H = 32;
  const PAD = 2;

  const max = Math.max(1, ...points.map((p) => p.blocking));
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const yFor = (v: number) =>
    H - PAD - (v / max) * (H - PAD * 2);

  const coords = points.map((p, i) => ({
    x: PAD + i * stepX,
    y: yFor(p.blocking),
  }));
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');

  const last = coords[coords.length - 1];
  const lastVal = points[points.length - 1].blocking;
  const lastTone =
    lastVal === 0
      ? 'fill-success-500 stroke-success-500'
      : lastVal >= 5
        ? 'fill-red-400 stroke-red-400'
        : 'fill-yellow-300 stroke-yellow-300';

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0"
      role="img"
      aria-label={`Blocking findings over the last ${points.length} scans`}
    >
      <path
        d={path}
        fill="none"
        strokeWidth={1.25}
        className="stroke-gray-500"
      />
      <circle cx={last.x} cy={last.y} r={2.25} className={lastTone} />
    </svg>
  );
}

/**
 * Returns a short, human-readable list of the things actually pulling
 * the grade down right now. Mirrors `gradeFromCounts()` so that the
 * "why" displayed in the UI lines up exactly with the threshold that
 * the agent crossed when it computed the letter.
 */
function describeDrivers(
  score: SecurityReport['score'],
  counts: Record<Severity, number>,
  supplyChainHigh: number,
): string[] {
  const out: string[] = [];
  if (score === 'A') {
    if (counts.LOW > 0 || counts.INFO > 0) {
      out.push(
        `${counts.LOW + counts.INFO} low/info finding${
          counts.LOW + counts.INFO === 1 ? '' : 's'
        } (advisory only)`,
      );
    } else {
      out.push('No medium-or-higher findings detected');
    }
    return out;
  }

  if (counts.CRITICAL > 0) {
    out.push(
      `${counts.CRITICAL} critical finding${counts.CRITICAL === 1 ? '' : 's'}`,
    );
  }
  if (counts.HIGH > 0) {
    const supplyTxt = supplyChainHigh > 0 ? ` (${supplyChainHigh} supply-chain)` : '';
    out.push(`${counts.HIGH} high finding${counts.HIGH === 1 ? '' : 's'}${supplyTxt}`);
  }
  if (counts.MEDIUM > 0 && (score === 'B' || score === 'C')) {
    out.push(
      `${counts.MEDIUM} medium finding${counts.MEDIUM === 1 ? '' : 's'}`,
    );
  }
  return out;
}

/**
 * Returns the next reachable grade and the smallest concrete action
 * that would get us there — e.g. "Fix 1 HIGH finding to reach C."
 *
 * The math is intentionally derived from the same thresholds the agent
 * uses, so as the user fixes things and the report regrades, the hint
 * stays in sync without any extra agent payload.
 */
function describePathToNextGrade(
  score: SecurityReport['score'],
  counts: Record<Severity, number>,
  supplyChainHigh: number,
): { target: SecurityReport['score']; action: string } | null {
  if (score === 'A') return null;

  if (score === 'F') {
    return {
      target: 'D',
      action: `Resolve all ${counts.CRITICAL} critical finding${
        counts.CRITICAL === 1 ? '' : 's'
      }.`,
    };
  }

  if (score === 'D') {
    if (supplyChainHigh > 0) {
      return {
        target: 'C',
        action: `Patch the ${supplyChainHigh} supply-chain HIGH${
          supplyChainHigh === 1 ? '' : 's'
        } and bring total HIGHs below 3.`,
      };
    }
    const need = Math.max(0, counts.HIGH - 2);
    return {
      target: 'C',
      action: `Fix ${need} HIGH finding${need === 1 ? '' : 's'} to drop below the 3-HIGH threshold.`,
    };
  }

  if (score === 'C') {
    if (counts.HIGH > 0) {
      return {
        target: 'B',
        action: `Resolve all ${counts.HIGH} HIGH finding${
          counts.HIGH === 1 ? '' : 's'
        } (mediums alone are fine for B).`,
      };
    }
    const need = Math.max(0, counts.MEDIUM - 4);
    return {
      target: 'B',
      action: `Fix ${need} MEDIUM finding${need === 1 ? '' : 's'} to drop below the 5-MEDIUM threshold.`,
    };
  }

  // score === 'B'
  return {
    target: 'A',
    action: `Resolve all ${counts.MEDIUM} MEDIUM finding${
      counts.MEDIUM === 1 ? '' : 's'
    } (LOW/INFO don't affect the grade).`,
  };
}

/**
 * Collapsible "How this grade is calculated" section. Hidden by default
 * — most users only want the headline + drivers, but the rubric needs
 * to be a click away so the score is fully auditable.
 */
function RubricDisclosure({ report }: { report: SecurityReport | null }) {
  const [open, setOpen] = useState(false);
  const score = report?.score ?? 'A';

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-2.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          How this grade is calculated
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          A → F · severity-driven
        </span>
      </button>

      {open && (
        <div className="px-6 pb-4 pt-1 space-y-1.5">
          {(['A', 'B', 'C', 'D', 'F'] as const).map((g) => {
            const r = SCORE_RUBRIC[g];
            const styles = SCORE_STYLES[g];
            const isCurrent = g === score;
            return (
              <div
                key={g}
                className={cn(
                  'flex items-start gap-3 px-3 py-2 rounded-md border text-xs',
                  isCurrent
                    ? cn(styles.badge, 'border-opacity-60')
                    : 'border-gray-800 bg-gray-950/40',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded font-bold border shrink-0',
                    styles.badge,
                  )}
                >
                  {g}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn('font-medium', isCurrent ? styles.text : 'text-gray-300')}>
                    {r.status}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-500">
                        current
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 mt-0.5">{r.rule}</div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-gray-500 pt-1">
            Supply-chain CVEs come from <code className="text-gray-400">npm audit</code> + OSV.dev.
            Runtime posture findings come from Studio's recorded traffic, route map and logs.
          </p>
        </div>
      )}
    </div>
  );
}

function ScanStateBanner({ report }: { report: SecurityReport | null }) {
  if (!report) return null;
  const { scanState } = report;

  if (scanState.missingLockfile) {
    return (
      <Banner
        tone="info"
        icon={<Info className="w-4 h-4" />}
        title="No package-lock.json found"
        body={
          <>
            Studio skipped <code className="text-gray-400">npm audit</code> because this project
            has no lockfile. Run <code className="text-gray-300">npm install</code> in the host
            project and rescan to see supply-chain findings. Runtime posture checks still apply.
          </>
        }
      />
    );
  }
  if (scanState.audit === 'error') {
    return (
      <Banner
        tone="error"
        icon={<AlertCircle className="w-4 h-4" />}
        title="npm audit failed"
        body={scanState.auditError ?? 'See the Studio Agent logs for details.'}
      />
    );
  }
  return null;
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'info' | 'error';
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-6 py-3 border-t',
        tone === 'error'
          ? 'border-red-900/40 bg-red-950/20 text-red-300'
          : 'border-gray-800 bg-gray-900/40 text-gray-400',
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="text-sm">
        <div className="font-medium mb-0.5">{title}</div>
        <div className="text-xs leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function CountStrip({ report }: { report: SecurityReport | null }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-gray-800">
      {SEVERITY_ORDER.map((sev) => {
        const style = SEVERITY_STYLES[sev];
        const n = report?.counts[sev] ?? 0;
        return (
          <div
            key={sev}
            className="flex items-center justify-between px-5 py-2.5 border-r border-gray-800 last:border-r-0"
          >
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', style.dot)} />
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                {sev.toLowerCase()}
              </span>
            </div>
            <span className={cn('text-sm font-mono', n > 0 ? style.text : 'text-gray-600')}>
              {n}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  const Icon = connected ? Wifi : WifiOff;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
        connected
          ? 'bg-success-500/10 border-success-500/40 text-success-500'
          : 'bg-error-500/10 border-error-500/40 text-error-500',
      )}
    >
      <Icon className="w-3 h-3" />
      {connected ? 'connected' : 'offline'}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 -mb-px border-b-2 text-sm transition-colors',
        active
          ? 'border-primary-500 text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-300',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[20px] px-1.5 rounded text-[10px] font-mono',
          active ? 'bg-primary-500/10 text-primary-400' : 'bg-gray-800 text-gray-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Cross-cutting helpers used by Top fixes / Dependencies / Posture
// ────────────────────────────────────────────────────────────────────────

const NEW_BASELINE_KEY = 'expressots.studio.security.lastFindingIds';

/**
 * Returns the set of finding ids that are present in the current report
 * but were *not* in the previously-seen one. Used to badge fresh
 * regressions ("you just added a route and a HIGH appeared").
 *
 * The baseline is persisted in localStorage so a page refresh doesn't
 * silently mark every finding as new. We only update the baseline when
 * a *new* report arrives (different `generatedAt`); manual rescans that
 * yield identical results don't reset the diff.
 */
function useNewFindingIds(report: SecurityReport | null): Set<string> {
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const lastSeenAtRef = useRef<number>(0);

  useEffect(() => {
    if (!report) return;
    if (report.generatedAt === lastSeenAtRef.current) return;
    lastSeenAtRef.current = report.generatedAt;

    const currentIds = new Set<string>();
    for (const f of report.dependencies) currentIds.add(`d:${f.id}`);
    for (const f of report.posture) currentIds.add(`p:${f.id}`);

    let baseline: Set<string>;
    try {
      const raw = localStorage.getItem(NEW_BASELINE_KEY);
      baseline = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      baseline = new Set();
    }

    const fresh = new Set<string>();
    if (baseline.size > 0) {
      // Only badge "NEW" once we have a baseline to compare against —
      // otherwise the first render after page-load would mark
      // everything as new, which is misleading.
      for (const id of currentIds) {
        if (!baseline.has(id)) fresh.add(id);
      }
    }
    setNewIds(fresh);

    try {
      localStorage.setItem(
        NEW_BASELINE_KEY,
        JSON.stringify(Array.from(currentIds)),
      );
    } catch {
      // localStorage may be disabled (private mode); we degrade
      // gracefully — diff just stays empty next time.
    }
  }, [report]);

  return newIds;
}

function NewBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary-500/15 text-primary-300 border border-primary-500/30"
      title="Appeared since the previous scan"
    >
      New
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Suppress / acknowledge — local-only triage of accepted findings
// ────────────────────────────────────────────────────────────────────────

interface Suppression {
  /** Free-text reason supplied by the user (e.g. "accepted risk"). */
  reason: string;
  /** When the user acked the finding. ms epoch. */
  ackedAt: number;
}

const SUPPRESS_STORAGE_KEY = 'expressots.studio.security.suppressions';

interface SuppressionsApi {
  /** Map keyed by prefixed finding id (`d:<id>` or `p:<id>`). */
  map: Record<string, Suppression>;
  suppress: (prefixedId: string, reason: string) => void;
  unsuppress: (prefixedId: string) => void;
  isSuppressed: (prefixedId: string) => boolean;
  count: number;
}

/**
 * Local-only triage of accepted findings. The agent's score is never
 * recomputed — that's the truth about reality. This is a *view filter*
 * the user can toggle; suppressed entries hide from the main lists,
 * the Top fixes panel, and the counts shown next to filter chips.
 *
 * Persistence is localStorage so the user's triage decisions survive
 * refreshes. We deliberately don't sync to the agent: suppression
 * decisions are personal, not project-wide.
 */
function useSuppressions(): SuppressionsApi {
  const [map, setMap] = useState<Record<string, Suppression>>(() => {
    try {
      const raw = localStorage.getItem(SUPPRESS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Suppression>;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });

  const persist = useCallback((next: Record<string, Suppression>) => {
    try {
      localStorage.setItem(SUPPRESS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable; in-memory state still works.
    }
  }, []);

  const suppress = useCallback(
    (prefixedId: string, reason: string) => {
      setMap((prev) => {
        const next = {
          ...prev,
          [prefixedId]: { reason: reason.trim() || 'No reason given', ackedAt: Date.now() },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const unsuppress = useCallback(
    (prefixedId: string) => {
      setMap((prev) => {
        if (!prev[prefixedId]) return prev;
        const next = { ...prev };
        delete next[prefixedId];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isSuppressed = useCallback(
    (prefixedId: string) => Boolean(map[prefixedId]),
    [map],
  );

  return { map, suppress, unsuppress, isSuppressed, count: Object.keys(map).length };
}

/**
 * Inline expand-on-click suppression form. We avoid `window.prompt()`
 * because it's modal/jarring; this stays inside the card and lets the
 * user type a short reason without losing the surrounding context.
 */
function SuppressControl({
  prefixedId,
  suppression,
  onSuppress,
  onUnsuppress,
}: {
  prefixedId: string;
  suppression?: Suppression;
  onSuppress: (id: string, reason: string) => void;
  onUnsuppress: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (suppression) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800/60 border border-gray-700/60 text-[11px]">
        <EyeOff className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-gray-300">
            Acknowledged
            <span className="text-gray-500 ml-1.5">
              · {new Date(suppression.ackedAt).toLocaleString()}
            </span>
          </div>
          <div className="text-gray-500 truncate" title={suppression.reason}>
            {suppression.reason}
          </div>
        </div>
        <button
          onClick={() => onUnsuppress(prefixedId)}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-700"
          title="Re-enable this finding"
        >
          <Eye className="w-3 h-3" /> Restore
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
        title="Hide this finding from the main view (local-only, you can restore it later)"
      >
        <EyeOff className="w-3 h-3" />
        Suppress
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSuppress(prefixedId, reason);
        setReason('');
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (e.g. accepted risk)"
        className="px-2 py-1 rounded-md text-[11px] bg-gray-950 border border-gray-700 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400 w-52"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border bg-primary-500/15 border-primary-500/40 text-primary-300 hover:bg-primary-500/25"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setReason('');
        }}
        className="text-[11px] text-gray-400 hover:text-gray-200"
      >
        Cancel
      </button>
    </form>
  );
}

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

const REACHABILITY_RANK: Record<Reachability, number> = {
  confirmed: 4,
  likely: 3,
  unknown: 2,
  unreachable: 1,
};

/**
 * OWASP API Security Top 10 (2023) — used by the Posture tab tile.
 * Codes mirror what the agent's posture analyzer tags findings with
 * (`PostureFinding.owasp = "API3:2023"` etc.).
 */
const OWASP_CATEGORIES: Array<{ code: string; label: string }> = [
  { code: 'API1:2023', label: 'Broken Object Level Authz' },
  { code: 'API2:2023', label: 'Broken Authentication' },
  { code: 'API3:2023', label: 'Broken Object Property Authz' },
  { code: 'API4:2023', label: 'Unrestricted Resource Consumption' },
  { code: 'API5:2023', label: 'Broken Function Level Authz' },
  { code: 'API6:2023', label: 'Sensitive Business Flows' },
  { code: 'API7:2023', label: 'Server-Side Request Forgery' },
  { code: 'API8:2023', label: 'Security Misconfiguration' },
  { code: 'API9:2023', label: 'Improper Inventory Mgmt' },
  { code: 'API10:2023', label: 'Unsafe API Consumption' },
];

// ────────────────────────────────────────────────────────────────────────
// Top fixes — the curated "what should I do FIRST?" panel
// ────────────────────────────────────────────────────────────────────────

type TopFixAction =
  | {
      kind: 'fix-group';
      id: string;
      title: string;
      subtitle: string;
      severity: Severity;
      reachability?: Reachability;
      group: FixGroup;
    }
  | {
      kind: 'posture';
      id: string;
      title: string;
      subtitle: string;
      severity: Severity;
      finding: PostureFinding;
    };

/**
 * Rank actions so the most-impactful, easiest-to-apply ones float to
 * the top. The components are deliberately additive (not multiplied)
 * so a HIGH that's `unknown`-reachable still beats a MEDIUM that's
 * `confirmed`-reachable — severity dominates, but reachability and
 * fix-ease break ties between equal-severity actions.
 */
function scoreAction(action: TopFixAction): number {
  const sev = SEVERITY_RANK[action.severity] * 10;
  if (action.kind === 'fix-group') {
    const reach = action.reachability
      ? REACHABILITY_RANK[action.reachability]
      : REACHABILITY_RANK.unknown;
    // Plain `audit-fix` is the safest one-click path; reward it.
    // Forced or install fixes still count, just slightly less.
    const easeMap: Record<FixSpec['kind'], number> = {
      'audit-fix': 3,
      install: 2,
      'audit-fix-force': 1,
      override: 0,
      none: -2,
    };
    const ease = easeMap[action.group.fix.kind] ?? 0;
    const breakingPenalty = action.group.breaking ? -1 : 0;
    return sev + reach + ease + breakingPenalty;
  }
  // Posture findings don't have reachability, but a concrete fixHint
  // means we can act on them in one step — bump their score.
  const hintBonus = action.finding.fixHint ? 2 : 0;
  return sev + hintBonus;
}

function buildTopActions(
  report: SecurityReport,
  max = 3,
  suppressions?: SuppressionsApi,
): TopFixAction[] {
  const actions: TopFixAction[] = [];

  for (const group of report.fixGroups) {
    // A fix group is "fully suppressed" only when *every* underlying
    // finding has been acked — otherwise the group still has work
    // worth surfacing.
    if (suppressions && group.findingIds.length > 0) {
      const allAcked = group.findingIds.every((fid) =>
        suppressions.isSuppressed(`d:${fid}`),
      );
      if (allAcked) continue;
    }
    actions.push({
      kind: 'fix-group',
      id: group.id,
      title: `Upgrade ${group.package} ${group.fromVersion} → ${group.toVersion}`,
      subtitle: `Fixes ${group.findingIds.length} advisor${
        group.findingIds.length === 1 ? 'y' : 'ies'
      }${group.breaking ? ' · breaking change' : ''}`,
      severity: group.severity,
      reachability: group.reachability,
      group,
    });
  }

  for (const f of report.posture) {
    if (f.severity === 'INFO' || f.severity === 'LOW') continue;
    if (suppressions?.isSuppressed(`p:${f.id}`)) continue;
    actions.push({
      kind: 'posture',
      id: f.id,
      title: f.title,
      subtitle: f.fixHint ?? f.description,
      severity: f.severity,
      finding: f,
    });
  }

  return actions
    .sort((a, b) => scoreAction(b) - scoreAction(a))
    .slice(0, max);
}

interface TopFixesPanelProps {
  report: SecurityReport | null;
  suppressions: SuppressionsApi;
  onSwitchTab: (tab: Tab) => void;
  onOpenExchange: (id: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}

function TopFixesPanel({
  report,
  suppressions,
  onSwitchTab,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: TopFixesPanelProps) {
  const { applyFix } = useSocket();
  // Top fixes always hides suppressed items — the panel exists to
  // answer "what now?", and acknowledged findings are deliberately not
  // part of that question.
  const actions = useMemo(
    () => (report ? buildTopActions(report, 3, suppressions) : []),
    [report, suppressions],
  );

  if (!report) return null;
  if (actions.length === 0) return null;

  const fixInFlight = report.scanState.fix?.state === 'running';

  const handleApplyGroup = (group: FixGroup) => {
    if (!group.fix.command || group.fix.kind === 'none' || group.fix.kind === 'override') {
      return;
    }
    applyFix({
      targetKind: 'fix-group',
      targetId: group.id,
      command: group.fix.command,
      allowMajor: group.fix.kind === 'audit-fix-force' || group.breaking,
    });
  };

  return (
    <div className="bg-gradient-to-r from-primary-500/5 to-primary-500/0 border border-primary-500/20 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          Top {actions.length} fix{actions.length === 1 ? '' : 'es'} today
        </h3>
        <span className="text-[11px] text-gray-500">
          ranked by severity · reachability · fix-ease
        </span>
      </div>
      <ul className="space-y-2">
        {actions.map((action) => (
          <TopFixRow
            key={`${action.kind}:${action.id}`}
            action={action}
            fixInFlight={fixInFlight}
            onApplyGroup={handleApplyGroup}
            onSwitchTab={onSwitchTab}
            onOpenExchange={onOpenExchange}
            onOpenRoute={onOpenRoute}
            onOpenLogs={onOpenLogs}
          />
        ))}
      </ul>
    </div>
  );
}

function TopFixRow({
  action,
  fixInFlight,
  onApplyGroup,
  onSwitchTab,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: {
  action: TopFixAction;
  fixInFlight: boolean;
  onApplyGroup: (group: FixGroup) => void;
  onSwitchTab: (tab: Tab) => void;
  onOpenExchange: (id: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}) {
  const style = SEVERITY_STYLES[action.severity];

  const handlePostureCta = () => {
    if (action.kind !== 'posture') return;
    const ev = action.finding.evidence;
    switch (ev.kind) {
      case 'exchange':
        onOpenExchange(ev.exchangeId);
        return;
      case 'route':
        onOpenRoute();
        return;
      case 'log':
        onOpenLogs();
        return;
      case 'file':
        openInEditor({ filePath: ev.filePath, lineNumber: ev.lineNumber });
        return;
    }
  };

  const noAutoFix =
    action.kind === 'fix-group' &&
    (action.group.fix.kind === 'none' || action.group.fix.kind === 'override');

  return (
    <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/60 border border-gray-800">
      <span
        className={cn(
          'mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border shrink-0',
          style.chip,
        )}
      >
        {action.severity}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white truncate">
          {action.title}
        </div>
        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
          {action.subtitle}
        </div>
        {action.kind === 'fix-group' && action.reachability && (
          <div className="mt-1">
            <ReachabilityChip level={action.reachability} />
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {action.kind === 'fix-group' ? (
          <>
            <button
              onClick={() => onSwitchTab('dependencies')}
              className="text-[11px] text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
            >
              View
            </button>
            <button
              onClick={() => onApplyGroup(action.group)}
              disabled={fixInFlight || noAutoFix}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
                fixInFlight || noAutoFix
                  ? 'bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed'
                  : 'bg-primary-500/15 border-primary-500/40 text-primary-300 hover:bg-primary-500/25',
              )}
              title={
                noAutoFix
                  ? 'No one-click fix available — open Dependencies for guidance.'
                  : action.group.fix.command
              }
            >
              <PlayCircle className="w-3 h-3" />
              Apply
            </button>
          </>
        ) : (
          <button
            onClick={handlePostureCta}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
          >
            <ExternalLink className="w-3 h-3" />
            Investigate
          </button>
        )}
      </div>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Dependencies tab
// ────────────────────────────────────────────────────────────────────────

function DependenciesTab({
  report,
  newFindingIds,
  suppressions,
}: {
  report: SecurityReport | null;
  newFindingIds: Set<string>;
  suppressions: SuppressionsApi;
}) {
  // Filter / sort state lives in the tab itself — Dependencies is the
  // only place where it makes sense, so we don't lift it into the
  // SecurityView shell.
  const [hideUnreachable, setHideUnreachable] = useState(false);
  const [reachableFirst, setReachableFirst] = useState(true);
  const [showSuppressed, setShowSuppressed] = useState(false);

  if (!report) {
    return <EmptyState icon={Loader2} message="Connecting to agent…" />;
  }
  if (report.scanState.missingLockfile) {
    return (
      <EmptyState
        icon={Package}
        message="Supply-chain scanning is disabled until a package-lock.json is present."
      />
    );
  }
  if (report.dependencies.length === 0) {
    if (report.scanState.audit === 'running') {
      return <EmptyState icon={Loader2} spin message="Running npm audit…" />;
    }
    return (
      <EmptyState
        icon={ShieldCheck}
        message="No known supply-chain vulnerabilities. (Last scan completed; rescan to re-check.)"
        tone="success"
      />
    );
  }

  const reachableCount = report.dependencies.filter(
    (f) => f.reachability && f.reachability.level !== 'unreachable',
  ).length;
  const unreachableCount = report.dependencies.filter(
    (f) => f.reachability?.level === 'unreachable',
  ).length;
  const suppressedCount = report.dependencies.filter((f) =>
    suppressions.isSuppressed(`d:${f.id}`),
  ).length;

  let visibleDeps = report.dependencies;
  if (hideUnreachable) {
    visibleDeps = visibleDeps.filter(
      (f) => f.reachability?.level !== 'unreachable',
    );
  }
  if (!showSuppressed) {
    visibleDeps = visibleDeps.filter(
      (f) => !suppressions.isSuppressed(`d:${f.id}`),
    );
  }

  const groups = groupBySeverity(visibleDeps);
  const findingsById = new Map(report.dependencies.map((f) => [f.id, f]));

  return (
    <div className="space-y-8">
      <FixRunBanner />

      {/* Fix groups — the "what to actually change" headline. */}
      {report.fixGroups.length > 0 && (
        <FixGroupsSection
          groups={report.fixGroups}
          findingsById={findingsById}
          fixInFlight={report.scanState.fix?.state === 'running'}
          newFindingIds={newFindingIds}
          suppressions={suppressions}
          showSuppressed={showSuppressed}
        />
      )}

      {/* Reachability filter / sort — Studio's killer differentiator
          over Snyk-style scanners is knowing which CVEs your code
          actually executes. Surfacing it here makes that explicit. */}
      <ReachabilityToolbar
        total={report.dependencies.length}
        reachable={reachableCount}
        unreachable={unreachableCount}
        suppressed={suppressedCount}
        hideUnreachable={hideUnreachable}
        onToggleHide={() => setHideUnreachable((v) => !v)}
        reachableFirst={reachableFirst}
        onToggleSort={() => setReachableFirst((v) => !v)}
        showSuppressed={showSuppressed}
        onToggleShowSuppressed={() => setShowSuppressed((v) => !v)}
      />

      {/* Per-severity breakdown — the audit detail view. */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300 tracking-tight">
            All advisories
          </h3>
          <span className="text-xs text-gray-600 font-mono">
            ({visibleDeps.length}
            {visibleDeps.length !== report.dependencies.length
              ? ` of ${report.dependencies.length}`
              : ''}
            )
          </span>
        </div>
        {SEVERITY_ORDER.map((sev) => {
          const items = groups[sev] ?? [];
          if (items.length === 0) return null;
          const sorted = reachableFirst
            ? [...items].sort(
                (a, b) =>
                  REACHABILITY_RANK[b.reachability?.level ?? 'unknown'] -
                  REACHABILITY_RANK[a.reachability?.level ?? 'unknown'],
              )
            : items;
          return (
            <SeverityGroup key={sev} severity={sev} count={items.length}>
              {sorted.map((f) => (
                <DependencyFindingCard
                  key={f.id}
                  finding={f}
                  fixInFlight={report.scanState.fix?.state === 'running'}
                  isNew={newFindingIds.has(`d:${f.id}`)}
                  suppression={suppressions.map[`d:${f.id}`]}
                  onSuppress={suppressions.suppress}
                  onUnsuppress={suppressions.unsuppress}
                />
              ))}
            </SeverityGroup>
          );
        })}
      </div>
    </div>
  );
}

function ReachabilityToolbar({
  total,
  reachable,
  unreachable,
  suppressed,
  hideUnreachable,
  onToggleHide,
  reachableFirst,
  onToggleSort,
  showSuppressed,
  onToggleShowSuppressed,
}: {
  total: number;
  reachable: number;
  unreachable: number;
  suppressed: number;
  hideUnreachable: boolean;
  onToggleHide: () => void;
  reachableFirst: boolean;
  onToggleSort: () => void;
  showSuppressed: boolean;
  onToggleShowSuppressed: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500 mr-1">Filter:</span>
      <CountChip label={`${total} total`} tone="muted" />
      {reachable > 0 && (
        <CountChip
          label={`${reachable} reachable`}
          tone="warn"
          title="Code paths your app executes — these are the CVEs that actually matter."
        />
      )}
      {unreachable > 0 && (
        <CountChip
          label={`${unreachable} unreachable`}
          tone="muted"
          title="In dependencies your app never invokes (often dev-only or unused exports)."
        />
      )}
      {suppressed > 0 && (
        <CountChip
          label={`${suppressed} suppressed`}
          tone="muted"
          title="Findings you acknowledged. They still exist but are hidden from the main list."
        />
      )}
      <button
        onClick={onToggleHide}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors',
          hideUnreachable
            ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
        )}
      >
        {hideUnreachable ? <CheckCircle2 className="w-3 h-3" /> : null}
        Hide unreachable
      </button>
      <button
        onClick={onToggleSort}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors',
          reachableFirst
            ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
        )}
        title="When on, reachable findings appear above unknown / unreachable inside each severity group."
      >
        {reachableFirst ? <CheckCircle2 className="w-3 h-3" /> : null}
        Reachable-first
      </button>
      {suppressed > 0 && (
        <button
          onClick={onToggleShowSuppressed}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors',
            showSuppressed
              ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
          )}
          title="Reveal acknowledged findings inline with the rest."
        >
          {showSuppressed ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          {showSuppressed ? 'Hide suppressed' : `Show suppressed (${suppressed})`}
        </button>
      )}
    </div>
  );
}

function CountChip({
  label,
  tone,
  title,
}: {
  label: string;
  tone: 'muted' | 'warn';
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
        tone === 'warn'
          ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
          : 'bg-gray-800 border-gray-700 text-gray-400',
      )}
    >
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Fix groups — the "act on the change, not on every CVE" headline
// ────────────────────────────────────────────────────────────────────────

function FixGroupsSection({
  groups,
  findingsById,
  fixInFlight,
  newFindingIds,
  suppressions,
  showSuppressed,
}: {
  groups: FixGroup[];
  findingsById: Map<string, DependencyFinding>;
  fixInFlight: boolean;
  newFindingIds: Set<string>;
  suppressions: SuppressionsApi;
  showSuppressed: boolean;
}) {
  // A group is "fully suppressed" only when every underlying finding
  // has been acked. Partially-suppressed groups stay visible so the
  // user can still see real outstanding work in them.
  const visibleGroups = groups.filter((g) => {
    if (showSuppressed) return true;
    if (g.findingIds.length === 0) return true;
    return !g.findingIds.every((fid) =>
      suppressions.isSuppressed(`d:${fid}`),
    );
  });

  if (visibleGroups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          Recommended fixes
        </h3>
        <span className="text-xs text-gray-500 font-mono">
          ({visibleGroups.length}
          {visibleGroups.length !== groups.length
            ? ` of ${groups.length}`
            : ''}
          )
        </span>
      </div>
      <p className="text-xs text-gray-500 -mt-1 mb-2">
        Each row collapses every advisory that shares a single upgrade.
        Apply one change, clear many findings.
      </p>
      <div className="space-y-3">
        {visibleGroups.map((group) => {
          // A fix group counts as "new" if any of its underlying findings
          // is new since the previous scan — this keeps the badge useful
          // for grouped advisories instead of silently disappearing.
          const isNew = group.findingIds.some((id) =>
            newFindingIds.has(`d:${id}`),
          );
          const allAcked =
            group.findingIds.length > 0 &&
            group.findingIds.every((fid) =>
              suppressions.isSuppressed(`d:${fid}`),
            );
          return (
            <FixGroupCard
              key={group.id}
              group={group}
              findings={group.findingIds
                .map((id) => findingsById.get(id))
                .filter((f): f is DependencyFinding => Boolean(f))}
              fixInFlight={fixInFlight}
              isNew={isNew}
              allSuppressed={allAcked}
            />
          );
        })}
      </div>
    </div>
  );
}

function FixGroupCard({
  group,
  findings,
  fixInFlight,
  isNew,
  allSuppressed,
}: {
  group: FixGroup;
  findings: DependencyFinding[];
  fixInFlight: boolean;
  isNew: boolean;
  allSuppressed: boolean;
}) {
  const style = SEVERITY_STYLES[group.severity];
  const { applyFix } = useSocket();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!group.fix.command) return;
    void navigator.clipboard.writeText(group.fix.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleApply = () => {
    if (!group.fix.command || group.fix.kind === 'none' || group.fix.kind === 'override') {
      return;
    }
    applyFix({
      targetKind: 'fix-group',
      targetId: group.id,
      command: group.fix.command,
      allowMajor: group.fix.kind === 'audit-fix-force' || group.breaking,
    });
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/40 overflow-hidden transition-opacity',
        style.ring,
        allSuppressed && 'opacity-60',
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
                  style.chip,
                )}
              >
                {group.severity}
              </span>
              {group.breaking && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border bg-orange-500/10 text-orange-300 border-orange-500/30">
                  <AlertTriangle className="w-3 h-3" /> breaking
                </span>
              )}
              {isNew && <NewBadge />}
              {allSuppressed && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border bg-gray-800 text-gray-400 border-gray-700">
                  <EyeOff className="w-3 h-3" /> all acked
                </span>
              )}
              <ReachabilityChip level={group.reachability} />
              <span className="text-[11px] text-gray-500">
                Fixes {group.findingIds.length}{' '}
                {group.findingIds.length === 1 ? 'advisory' : 'advisories'}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">
              Upgrade <span className="font-mono text-primary-300">{group.package}</span>{' '}
              <span className="font-mono text-gray-500">{group.fromVersion}</span>
              <span className="mx-2 text-gray-600">→</span>
              <span className="font-mono text-success-500">{group.toVersion}</span>
            </h4>
            {group.fix.note && (
              <p className="text-xs text-gray-500 leading-relaxed">{group.fix.note}</p>
            )}
          </div>
        </div>

        <FixCommandBox spec={group.fix} copied={copied} onCopy={handleCopy} />

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            onClick={handleApply}
            disabled={
              fixInFlight ||
              group.fix.kind === 'none' ||
              group.fix.kind === 'override'
            }
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
              fixInFlight ||
                group.fix.kind === 'none' ||
                group.fix.kind === 'override'
                ? 'bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed'
                : group.breaking
                ? 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border-orange-500/40'
                : 'bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border-primary-500/40',
            )}
            title={
              group.fix.kind === 'none'
                ? 'No upstream fix available yet.'
                : group.fix.kind === 'override'
                ? 'Requires a manual package.json overrides entry.'
                : 'Run this command in the host project'
            }
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Apply fix
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            {expanded
              ? 'Hide advisories'
              : `Show ${group.findingIds.length} ${
                  group.findingIds.length === 1 ? 'advisory' : 'advisories'
                }`}
          </button>
        </div>
      </div>

      {expanded && findings.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-950/50 p-3 space-y-2">
          {findings.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-gray-900/60 border border-gray-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
                      SEVERITY_STYLES[f.severity].chip,
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{f.id}</span>
                </div>
                <p className="text-xs text-gray-300 truncate">{f.title}</p>
              </div>
              {advisoryLink(f) && (
                <a
                  href={advisoryLink(f)!}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300"
                >
                  Advisory <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Per-finding card (with fix command + reachability + root cause)
// ────────────────────────────────────────────────────────────────────────

function DependencyFindingCard({
  finding,
  fixInFlight,
  isNew,
  suppression,
  onSuppress,
  onUnsuppress,
}: {
  finding: DependencyFinding;
  fixInFlight: boolean;
  isNew: boolean;
  suppression?: Suppression;
  onSuppress: (id: string, reason: string) => void;
  onUnsuppress: (id: string) => void;
}) {
  const style = SEVERITY_STYLES[finding.severity];
  const advisoryUrl = advisoryLink(finding);
  const { applyFix } = useSocket();
  const [copied, setCopied] = useState(false);

  const canApply =
    finding.fix &&
    finding.fix.command &&
    finding.fix.kind !== 'none' &&
    finding.fix.kind !== 'override';

  const handleCopy = () => {
    if (!finding.fix?.command) return;
    void navigator.clipboard.writeText(finding.fix.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleApply = () => {
    if (!canApply || !finding.fix) return;
    applyFix({
      targetKind: 'finding',
      targetId: finding.id,
      command: finding.fix.command,
      allowMajor: finding.fix.breaking,
    });
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/40 p-4 space-y-3 transition-opacity',
        style.ring,
        suppression && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
                style.chip,
              )}
            >
              {finding.severity}
            </span>
            {finding.cvss !== undefined && (
              <span className="text-[10px] font-mono text-gray-500">
                CVSS {finding.cvss.toFixed(1)}
              </span>
            )}
            {finding.reachability && (
              <ReachabilityChip level={finding.reachability.level} />
            )}
            {isNew && <NewBadge />}
            <span className="text-[10px] font-mono text-gray-500">{finding.id}</span>
          </div>
          <h4 className="text-sm font-semibold text-white truncate" title={finding.title}>
            {finding.title}
          </h4>
          <div className="mt-1 text-xs text-gray-400 font-mono">
            <span className="text-gray-300">{finding.package}</span>
            <span className="text-gray-600 mx-1">·</span>
            installed <span className="text-gray-300">{finding.installedVersion}</span>
            {finding.fixedVersion && (
              <>
                <span className="text-gray-600 mx-1">→</span>
                fix in <span className="text-success-500">{finding.fixedVersion}</span>
              </>
            )}
          </div>
        </div>
        {advisoryUrl && (
          <a
            href={advisoryUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
          >
            Advisory <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {finding.summary && (
        <p className="text-xs text-gray-400 leading-relaxed">{finding.summary}</p>
      )}

      {finding.rootCause && !finding.rootCause.isDirect && (
        <RootCauseRow finding={finding} />
      )}

      {finding.reachability && (
        <ReachabilityRow info={finding.reachability} />
      )}

      {finding.fix && (
        <>
          {finding.fix.command && (
            <FixCommandBox
              spec={finding.fix}
              copied={copied}
              onCopy={handleCopy}
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleApply}
              disabled={!canApply || fixInFlight}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
                !canApply || fixInFlight
                  ? 'bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed'
                  : finding.fix.breaking
                  ? 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border-orange-500/40'
                  : 'bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border-primary-500/40',
              )}
              title={
                finding.fix.kind === 'none'
                  ? 'No upstream fix available yet.'
                  : finding.fix.kind === 'override'
                  ? 'Requires a manual package.json overrides entry.'
                  : 'Run this command in the host project'
              }
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {finding.fix.label}
            </button>
            {finding.fix.note && (
              <span className="text-[11px] text-gray-500">{finding.fix.note}</span>
            )}
            <div className="ml-auto">
              <SuppressControl
                prefixedId={`d:${finding.id}`}
                suppression={suppression}
                onSuppress={onSuppress}
                onUnsuppress={onUnsuppress}
              />
            </div>
          </div>
        </>
      )}
      {!finding.fix && (
        <div className="flex items-center justify-end">
          <SuppressControl
            prefixedId={`d:${finding.id}`}
            suppression={suppression}
            onSuppress={onSuppress}
            onUnsuppress={onUnsuppress}
          />
        </div>
      )}
    </div>
  );
}

function FixCommandBox({
  spec,
  copied,
  onCopy,
}: {
  spec: FixSpec;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!spec.command) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-950/60 px-3 py-2">
      <Terminal className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
      <code className="flex-1 text-xs font-mono text-gray-300 truncate">{spec.command}</code>
      <button
        onClick={onCopy}
        className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-1 text-[11px] text-gray-400 hover:text-gray-200 rounded transition-colors"
        title="Copy command to clipboard"
      >
        {copied ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function RootCauseRow({ finding }: { finding: DependencyFinding }) {
  const rc = finding.rootCause;
  if (!rc) return null;
  return (
    <div className="rounded-md border border-gray-800 bg-gray-950/40 px-3 py-2 text-[11px] text-gray-400">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-3 h-3 text-yellow-400" />
        <span className="uppercase tracking-wide text-yellow-400/80 font-medium">
          Root cause
        </span>
        <span className="text-gray-500">
          via{' '}
          <span className="font-mono text-gray-300">{rc.rootPackage}</span>{' '}
          <span className="text-gray-600">{rc.rootInstalledVersion}</span>
        </span>
      </div>
      <div className="font-mono text-gray-500 leading-relaxed truncate" title={rc.chain.join(' → ')}>
        {rc.chain.join(' → ')}
      </div>
    </div>
  );
}

function ReachabilityRow({ info }: { info: NonNullable<DependencyFinding['reachability']> }) {
  if (info.level === 'unknown') return null;
  const tone = REACHABILITY_TONE[info.level];
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-[11px] leading-relaxed',
        tone.row,
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap className={cn('w-3 h-3', tone.icon)} />
        <span className={cn('uppercase tracking-wide font-medium', tone.icon)}>
          {info.level === 'confirmed' ? 'Confirmed reachable' : info.level}
        </span>
        {info.runtimeHits > 0 && (
          <span className="text-gray-400">
            · {info.runtimeHits} request{info.runtimeHits === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <p className="text-gray-400">{info.reason}</p>
      {info.routes.length > 0 && (
        <div className="mt-1 font-mono text-gray-500 truncate">
          {info.routes
            .slice(0, 3)
            .map((r) => `${r.method} ${r.path}`)
            .join(' · ')}
          {info.routes.length > 3 ? ` +${info.routes.length - 3} more` : ''}
        </div>
      )}
    </div>
  );
}

const REACHABILITY_TONE: Record<
  Reachability,
  { row: string; icon: string; chip: string }
> = {
  confirmed: {
    row: 'border-red-900/40 bg-red-950/20',
    icon: 'text-red-400',
    chip: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  likely: {
    row: 'border-yellow-900/40 bg-yellow-950/10',
    icon: 'text-yellow-400',
    chip: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  },
  unreachable: {
    row: 'border-gray-800 bg-gray-950/40',
    icon: 'text-gray-500',
    chip: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
  unknown: {
    row: 'border-gray-800 bg-gray-950/40',
    icon: 'text-gray-500',
    chip: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
};

function ReachabilityChip({ level }: { level?: Reachability }) {
  if (!level || level === 'unknown') return null;
  const tone = REACHABILITY_TONE[level];
  const label =
    level === 'confirmed'
      ? 'reachable'
      : level === 'unreachable'
      ? 'unreachable'
      : 'likely';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
        tone.chip,
      )}
      title={
        level === 'confirmed'
          ? 'A route reaching this package has been exercised in the current session.'
          : level === 'unreachable'
          ? 'No file under src/ imports this package.'
          : 'Imported by src/, but no requests have hit a route that uses it yet.'
      }
    >
      <Zap className="w-3 h-3" /> {label}
    </span>
  );
}

function advisoryLink(finding: DependencyFinding): string | undefined {
  return (
    finding.references.find((r) =>
      /github\.com\/advisories|osv\.dev|nvd\.nist\.gov/i.test(r),
    ) ?? finding.references[0]
  );
}

// ────────────────────────────────────────────────────────────────────────
// Live "fix in progress" transcript banner
// ────────────────────────────────────────────────────────────────────────

function FixRunBanner() {
  const fixRun = useAppStore((s) => s.fixRun);
  const clearFixRun = useAppStore((s) => s.clearFixRun);
  if (!fixRun) return null;

  const finished = Boolean(fixRun.result);
  const success = fixRun.result?.success === true;
  const tone = finished
    ? success
      ? 'border-success-500/40 bg-success-500/5'
      : 'border-red-500/40 bg-red-500/5'
    : 'border-primary-500/40 bg-primary-500/5';

  return (
    <div className={cn('rounded-lg border overflow-hidden', tone)}>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          {finished ? (
            success ? (
              <CheckCircle2 className="w-4 h-4 text-success-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
          )}
          <span className="text-xs font-medium text-white">
            {finished
              ? fixRun.result?.summary ?? (success ? 'Fix completed' : 'Fix failed')
              : 'Applying fix…'}
          </span>
          <code className="text-[11px] font-mono text-gray-400 truncate max-w-[60vw]">
            {fixRun.command}
          </code>
        </div>
        <button
          onClick={clearFixRun}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Dismiss"
          disabled={!finished}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <pre className="max-h-48 overflow-auto px-4 py-2 text-[11px] font-mono leading-relaxed text-gray-300 bg-gray-950/60">
        {fixRun.lines.length === 0 && !finished
          ? 'Waiting for npm output…'
          : fixRun.lines
              .map((l) => `${l.stream === 'stderr' ? '⚠ ' : '  '}${l.text}`)
              .join('\n')}
        {finished && fixRun.result?.errorTail && (
          <>
            {'\n'}
            {fixRun.result.errorTail.trim()}
          </>
        )}
      </pre>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Posture tab
// ────────────────────────────────────────────────────────────────────────

interface PostureTabProps {
  report: SecurityReport | null;
  newFindingIds: Set<string>;
  suppressions: SuppressionsApi;
  onOpenExchange: (exchangeId: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}

function PostureTab({
  report,
  newFindingIds,
  suppressions,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: PostureTabProps) {
  // Pull the route list out of the global app store so the Auth
  // coverage tile can reason about how many routes exist in total.
  const routes = useAppStore((s) => s.routes);

  // Click an OWASP cell to filter the list down to that category.
  // `null` means "show all" (the default).
  const [owaspFilter, setOwaspFilter] = useState<string | null>(null);
  const [showSuppressed, setShowSuppressed] = useState(false);

  if (!report) {
    return <EmptyState icon={Loader2} message="Connecting to agent…" />;
  }
  // Always show the coverage tiles, even when there are no findings —
  // the *zeros* are the credibility statement ("we checked these and
  // you're clean").
  const owaspCounts = useMemoOwaspCounts(report.posture);
  const authCoverage = useMemoAuthCoverage(routes, report.posture);
  const suppressedCount = report.posture.filter((f) =>
    suppressions.isSuppressed(`p:${f.id}`),
  ).length;

  const tiles = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <OwaspCoverageTile
          counts={owaspCounts}
          filter={owaspFilter}
          onSelect={setOwaspFilter}
        />
      </div>
      <AuthCoverageTile coverage={authCoverage} />
    </div>
  );

  if (report.posture.length === 0) {
    return (
      <div className="space-y-6">
        {tiles}
        <RuleCoveragePanel findings={report.posture} />
        <EmptyState
          icon={ShieldCheck}
          tone="success"
          message="No runtime posture findings yet. Send some requests through your app — the analyzer evaluates recorded traffic."
        />
      </div>
    );
  }

  let visible = report.posture;
  if (owaspFilter) {
    visible = visible.filter((f) => f.owasp === owaspFilter);
  }
  if (!showSuppressed) {
    visible = visible.filter((f) => !suppressions.isSuppressed(`p:${f.id}`));
  }
  const groups = groupBySeverity(visible);

  return (
    <div className="space-y-6">
      {tiles}
      <RuleCoveragePanel findings={report.posture} />

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {owaspFilter && (
          <div className="text-gray-400">
            Filtered to{' '}
            <span className="font-mono text-purple-300">{owaspFilter}</span>{' '}
            ({visible.length} finding{visible.length === 1 ? '' : 's'}) ·{' '}
            <button
              onClick={() => setOwaspFilter(null)}
              className="text-primary-400 hover:underline"
            >
              clear
            </button>
          </div>
        )}
        {suppressedCount > 0 && (
          <button
            onClick={() => setShowSuppressed((v) => !v)}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors',
              showSuppressed
                ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
            )}
          >
            {showSuppressed ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            {showSuppressed
              ? 'Hide suppressed'
              : `Show suppressed (${suppressedCount})`}
          </button>
        )}
      </div>
      {SEVERITY_ORDER.map((sev) => {
        const items = groups[sev] ?? [];
        if (items.length === 0) return null;
        return (
          <SeverityGroup key={sev} severity={sev} count={items.length}>
            {items.map((f) => (
              <PostureFindingCard
                key={f.id}
                finding={f}
                isNew={newFindingIds.has(`p:${f.id}`)}
                suppression={suppressions.map[`p:${f.id}`]}
                onSuppress={suppressions.suppress}
                onUnsuppress={suppressions.unsuppress}
                onOpenExchange={onOpenExchange}
                onOpenRoute={onOpenRoute}
                onOpenLogs={onOpenLogs}
              />
            ))}
          </SeverityGroup>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Auth coverage tile — "X of Y routes look authenticated"
// ────────────────────────────────────────────────────────────────────────

interface AuthCoverage {
  total: number;
  unauthenticated: number;
  authenticated: number;
  unauthRoutes: Array<{ method: string; path: string }>;
}

/**
 * Best-effort breakdown of route auth coverage. The agent already
 * surfaces unauthenticated routes as posture findings; we just project
 * them onto the full route list so the UI can show "X / N" instead of
 * "here is a list of N findings."
 */
function useMemoAuthCoverage(
  routes: Array<{ method: string; path: string }>,
  posture: PostureFinding[],
): AuthCoverage {
  return useMemo(() => {
    const unauthRoutes: Array<{ method: string; path: string }> = [];
    const seen = new Set<string>();
    for (const f of posture) {
      if (f.rule !== 'unauthenticated-route') continue;
      if (f.evidence.kind !== 'route') continue;
      const k = `${f.evidence.method}:${f.evidence.path}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unauthRoutes.push({
        method: f.evidence.method,
        path: f.evidence.path,
      });
    }
    const total = routes.length;
    const unauthenticated = Math.min(unauthRoutes.length, total || unauthRoutes.length);
    const authenticated = Math.max(0, total - unauthenticated);
    return { total, unauthenticated, authenticated, unauthRoutes };
  }, [routes, posture]);
}

function AuthCoverageTile({ coverage }: { coverage: AuthCoverage }) {
  const { total, unauthenticated, authenticated, unauthRoutes } = coverage;
  const pct = total > 0 ? Math.round((authenticated / total) * 100) : 100;

  // Empty-state messaging: zero routes means we haven't observed any
  // traffic yet — say so explicitly rather than implying 100% coverage.
  if (total === 0) {
    return (
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldQuestion className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Auth coverage
          </h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          No routes discovered yet. Once your app starts handling requests,
          Studio will show how many endpoints look authenticated.
        </p>
      </div>
    );
  }

  const tone =
    unauthenticated === 0
      ? 'text-success-500'
      : unauthenticated <= 1
        ? 'text-yellow-300'
        : 'text-orange-300';

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          Auth coverage
        </h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold tabular-nums', tone)}>
          {authenticated}
        </span>
        <span className="text-sm text-gray-500">/ {total} routes</span>
        <span className="ml-auto text-[11px] font-mono text-gray-500">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-gray-800">
        <div
          className={cn(
            'h-full transition-all',
            unauthenticated === 0 ? 'bg-success-500' : 'bg-yellow-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {unauthenticated > 0 ? (
        <div className="mt-3 text-[11px] text-gray-400 leading-relaxed">
          <div className="text-gray-500 mb-1">
            {unauthenticated} route{unauthenticated === 1 ? '' : 's'} appear
            unauthenticated:
          </div>
          <ul className="space-y-0.5 max-h-20 overflow-y-auto">
            {unauthRoutes.slice(0, 5).map((r) => (
              <li
                key={`${r.method}:${r.path}`}
                className="font-mono text-gray-300 truncate"
                title={`${r.method} ${r.path}`}
              >
                <span className="text-gray-500 mr-1.5">{r.method}</span>
                {r.path}
              </li>
            ))}
            {unauthRoutes.length > 5 && (
              <li className="text-gray-600">
                + {unauthRoutes.length - 5} more
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
          Every observed route either required credentials or matched a
          conventional public path (`/health`, `/metrics`, …).
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Coverage panel — "What Studio actually checks for"
// ────────────────────────────────────────────────────────────────────────

/**
 * Static catalogue of every posture rule the analyzer runs. Mirrors
 * `posture-analyzer.ts` 1:1 — keep them in sync if a rule is added or
 * removed there.
 *
 * The point of this panel is *transparency*. A green check next to a
 * rule means "we ran this check and it passed", which is a much
 * stronger statement than the absence of a finding. Without this
 * panel the user has to take it on faith that Studio looked.
 */
const POSTURE_RULE_CATALOG: Array<{
  group: string;
  rules: Array<{
    rule: string;
    title: string;
    description: string;
    severity: Severity;
    owasp: string;
    /**
     * Optional matcher when a rule fans out into many `rule` slugs
     * (e.g. `missing-content-security-policy`, `missing-x-frame-options`).
     * Default match is exact `rule` equality.
     */
    matchPrefix?: string;
  }>;
}> = [
  {
    group: 'Response headers',
    rules: [
      {
        rule: 'missing-content-security-policy',
        title: 'Content-Security-Policy',
        description: 'Mitigates XSS and resource-injection attacks.',
        severity: 'MEDIUM',
        owasp: 'API8:2023',
      },
      {
        rule: 'missing-strict-transport-security',
        title: 'Strict-Transport-Security',
        description: 'Forces HTTPS for the configured max-age window.',
        severity: 'MEDIUM',
        owasp: 'API8:2023',
      },
      {
        rule: 'missing-x-content-type-options',
        title: 'X-Content-Type-Options',
        description: 'Stops MIME sniffing on responses.',
        severity: 'LOW',
        owasp: 'API8:2023',
      },
      {
        rule: 'missing-x-frame-options',
        title: 'X-Frame-Options',
        description: 'Prevents clickjacking via embedded iframes.',
        severity: 'LOW',
        owasp: 'API8:2023',
      },
      {
        rule: 'missing-referrer-policy',
        title: 'Referrer-Policy',
        description: 'Controls how much URL information leaves the origin.',
        severity: 'LOW',
        owasp: 'API8:2023',
      },
    ],
  },
  {
    group: 'Cross-origin',
    rules: [
      {
        rule: 'permissive-cors',
        title: 'Permissive CORS',
        description:
          'Wildcard `Access-Control-Allow-Origin: *`, especially on authenticated routes.',
        severity: 'HIGH',
        owasp: 'API8:2023',
      },
    ],
  },
  {
    group: 'Authentication',
    rules: [
      {
        rule: 'unauthenticated-route',
        title: 'Unauthenticated routes',
        description:
          'Routes returning 2xx with no observed `Authorization` / cookie and no global auth middleware.',
        severity: 'LOW',
        owasp: 'API2:2023',
      },
    ],
  },
  {
    group: 'Error handling',
    rules: [
      {
        rule: 'verbose-error',
        title: 'Stack traces in 5xx responses',
        description:
          'Server errors that leak implementation details to the client.',
        severity: 'MEDIUM',
        owasp: 'API8:2023',
      },
    ],
  },
  {
    group: 'Secret leakage',
    rules: [
      {
        rule: 'response-secret',
        title: 'Secrets in response bodies',
        description:
          'High-precision patterns: AWS keys, GitHub PATs, Slack tokens, Stripe live keys, JWTs.',
        severity: 'HIGH',
        owasp: 'API3:2023',
      },
      {
        rule: 'log-secret',
        title: 'Secrets in log lines',
        description:
          'Same patterns as above, scanned across every captured log entry.',
        severity: 'MEDIUM',
        owasp: 'API3:2023',
      },
    ],
  },
  {
    group: 'Input validation',
    rules: [
      {
        rule: 'unvalidated-body',
        title: 'Body without obvious validation',
        description:
          'Controllers accepting non-empty request bodies but not importing zod / class-validator / a DTO.',
        severity: 'INFO',
        owasp: 'API4:2023',
      },
    ],
  },
];

function RuleCoveragePanel({ findings }: { findings: PostureFinding[] }) {
  const [open, setOpen] = useState(false);

  const findingsByRule = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of findings) {
      out[f.rule] = (out[f.rule] ?? 0) + 1;
    }
    return out;
  }, [findings]);

  // Tally clean / triggered across the whole catalog so the disclosure
  // header can show "9 / 11 checks clean" without expanding.
  const totals = useMemo(() => {
    let total = 0;
    let clean = 0;
    for (const grp of POSTURE_RULE_CATALOG) {
      for (const r of grp.rules) {
        total++;
        const matched = r.matchPrefix
          ? Object.keys(findingsByRule).some((k) => k.startsWith(r.matchPrefix as string))
          : (findingsByRule[r.rule] ?? 0) > 0;
        if (!matched) clean++;
      }
    }
    return { total, clean };
  }, [findingsByRule]);

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <ShieldCheck className="w-4 h-4 text-success-500" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            What Studio checks for
          </h3>
        </div>
        <span className="text-[11px] text-gray-500">
          <span className="text-success-500 font-medium">{totals.clean}</span>
          {' / '}
          {totals.total} checks clean
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Each check runs over recorded traffic, the route map, the captured
            logs, or the application source. A green tick means the check ran
            and produced no findings — not that the check was skipped.
          </p>
          {POSTURE_RULE_CATALOG.map((grp) => (
            <div key={grp.group}>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
                {grp.group}
              </div>
              <ul className="space-y-1.5">
                {grp.rules.map((r) => {
                  const count = r.matchPrefix
                    ? Object.entries(findingsByRule)
                        .filter(([k]) => k.startsWith(r.matchPrefix as string))
                        .reduce((acc, [, n]) => acc + n, 0)
                    : (findingsByRule[r.rule] ?? 0);
                  const clean = count === 0;
                  return (
                    <li
                      key={r.rule}
                      className="flex items-start gap-3 text-xs"
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-4 h-4 rounded-full mt-0.5 shrink-0',
                          clean
                            ? 'bg-success-500/15 text-success-500'
                            : 'bg-orange-500/15 text-orange-300',
                        )}
                      >
                        {clean ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'font-medium',
                              clean ? 'text-gray-300' : 'text-orange-200',
                            )}
                          >
                            {r.title}
                          </span>
                          <span className="text-[10px] font-mono text-purple-400/80">
                            {r.owasp}
                          </span>
                          <span className="text-[10px] font-mono text-gray-600">
                            {r.severity}
                          </span>
                          {!clean && (
                            <span className="text-[10px] font-mono text-orange-300">
                              {count} finding{count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {r.description}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useMemoOwaspCounts(findings: PostureFinding[]): Record<string, number> {
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of OWASP_CATEGORIES) counts[cat.code] = 0;
    for (const f of findings) {
      if (f.owasp && counts[f.owasp] !== undefined) counts[f.owasp]++;
    }
    return counts;
  }, [findings]);
}

/**
 * Compact 10-cell grid showing how the app fares against the OWASP API
 * Security Top 10 (2023). Green when zero findings, yellow for 1–2, red
 * for 3+. Clicking a cell filters the posture list to that category;
 * clicking the active cell again clears the filter.
 *
 * The zeros are deliberately just as visible as the hits — a clean cell
 * is *evidence* that we checked the category, not silence about it.
 */
function OwaspCoverageTile({
  counts,
  filter,
  onSelect,
}: {
  counts: Record<string, number>;
  filter: string | null;
  onSelect: (code: string | null) => void;
}) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          OWASP API Security Top 10 (2023)
        </h3>
        <span className="text-[11px] text-gray-500">
          coverage at a glance — click a cell to filter
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {OWASP_CATEGORIES.map((cat) => {
          const n = counts[cat.code] ?? 0;
          const tone =
            n === 0
              ? 'border-success-500/30 bg-success-500/5 text-success-500'
              : n < 3
                ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300';
          const isActive = filter === cat.code;
          return (
            <button
              key={cat.code}
              onClick={() => onSelect(isActive ? null : cat.code)}
              title={`${cat.code} · ${cat.label} — ${n} finding${n === 1 ? '' : 's'}`}
              className={cn(
                'text-left p-2.5 rounded-lg border transition-colors',
                tone,
                isActive ? 'ring-2 ring-primary-400/60' : 'hover:brightness-125',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium">
                  {cat.code.replace(':2023', '')}
                </span>
                <span className="text-sm font-bold tabular-nums">{n}</span>
              </div>
              <div className="mt-1 text-[10px] leading-tight opacity-80 line-clamp-2">
                {cat.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PostureFindingCard({
  finding,
  isNew,
  suppression,
  onSuppress,
  onUnsuppress,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: {
  finding: PostureFinding;
  isNew: boolean;
  suppression?: Suppression;
  onSuppress: (id: string, reason: string) => void;
  onUnsuppress: (id: string) => void;
  onOpenExchange: (exchangeId: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}) {
  const style = SEVERITY_STYLES[finding.severity];
  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/40 p-4 space-y-3 transition-opacity',
        style.ring,
        suppression && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
                style.chip,
              )}
            >
              {finding.severity}
            </span>
            {finding.owasp && (
              <span className="text-[10px] font-mono text-purple-400">
                OWASP {finding.owasp}
              </span>
            )}
            {isNew && <NewBadge />}
            <span className="text-[10px] font-mono text-gray-600">{finding.rule}</span>
          </div>
          <h4 className="text-sm font-semibold text-white">{finding.title}</h4>
          <p className="mt-1 text-xs text-gray-400 leading-relaxed">{finding.description}</p>
          {finding.fixHint && (
            <p className="mt-2 text-xs text-success-500/80 leading-relaxed">
              <span className="font-medium mr-1">Fix:</span>
              {finding.fixHint}
            </p>
          )}
        </div>
        <EvidenceButton
          finding={finding}
          onOpenExchange={onOpenExchange}
          onOpenRoute={onOpenRoute}
          onOpenLogs={onOpenLogs}
        />
      </div>
      <div className="flex items-center justify-end pt-1">
        <SuppressControl
          prefixedId={`p:${finding.id}`}
          suppression={suppression}
          onSuppress={onSuppress}
          onUnsuppress={onUnsuppress}
        />
      </div>
    </div>
  );
}

/**
 * Render the right CTA for whichever evidence kind this finding
 * carries. Single button keeps the card visually tidy; the user always
 * has exactly one obvious next step from a finding.
 */
function EvidenceButton({
  finding,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: {
  finding: PostureFinding;
  onOpenExchange: (exchangeId: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}) {
  switch (finding.evidence.kind) {
    case 'exchange': {
      const id = finding.evidence.exchangeId;
      return (
        <button
          onClick={() => onOpenExchange(id)}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
          title="Open the recorded exchange in the Requests view"
        >
          View exchange <ExternalLink className="w-3 h-3" />
        </button>
      );
    }
    case 'route':
      return (
        <button
          onClick={onOpenRoute}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
          title="Jump to the Requests view"
        >
          <span className="font-mono">
            {finding.evidence.method} {finding.evidence.path}
          </span>
          <ExternalLink className="w-3 h-3" />
        </button>
      );
    case 'log':
      return (
        <button
          onClick={onOpenLogs}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
        >
          View logs <ExternalLink className="w-3 h-3" />
        </button>
      );
    case 'file': {
      const ev = finding.evidence;
      return (
        <button
          onClick={() =>
            openInEditor({ filePath: ev.filePath, lineNumber: ev.lineNumber })
          }
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
          title={ev.filePath}
        >
          <FileCode className="w-3 h-3" /> Open file
        </button>
      );
    }
    default:
      return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────

function SeverityGroup({
  severity,
  count,
  children,
}: {
  severity: Severity;
  count: number;
  children: React.ReactNode;
}) {
  const style = SEVERITY_STYLES[severity];
  const Icon = severityIcon(severity);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', style.text)} />
        <h3 className={cn('text-sm font-semibold capitalize', style.text)}>
          {severity.toLowerCase()}
        </h3>
        <span className="text-xs text-gray-500 font-mono">({count})</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function severityIcon(severity: Severity) {
  switch (severity) {
    case 'CRITICAL':
      return ShieldAlert;
    case 'HIGH':
      return AlertTriangle;
    case 'MEDIUM':
      return ShieldQuestion;
    case 'LOW':
      return ShieldCheck;
    default:
      return Info;
  }
}

function groupBySeverity<T extends { severity: Severity }>(
  items: T[],
): Partial<Record<Severity, T[]>> {
  const out: Partial<Record<Severity, T[]>> = {};
  for (const item of items) {
    const bucket = out[item.severity] ?? [];
    bucket.push(item);
    out[item.severity] = bucket;
  }
  return out;
}

function EmptyState({
  icon: Icon,
  message,
  spin = false,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  spin?: boolean;
  tone?: 'default' | 'success';
}) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-md">
        <Icon
          className={cn(
            'w-10 h-10 mx-auto mb-3',
            tone === 'success' ? 'text-success-500' : 'text-gray-600',
            spin && 'animate-spin',
          )}
        />
        <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
