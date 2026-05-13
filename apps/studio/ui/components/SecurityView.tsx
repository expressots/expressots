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

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
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

const SCORE_STYLES: Record<SecurityReport['score'], { badge: string; tone: string }> = {
  A: { badge: 'bg-success-500/10 border-success-500/40 text-success-500', tone: 'success' },
  B: { badge: 'bg-primary-500/10 border-primary-500/40 text-primary-400', tone: 'primary' },
  C: { badge: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400', tone: 'yellow' },
  D: { badge: 'bg-orange-500/10 border-orange-500/40 text-orange-400', tone: 'orange' },
  F: { badge: 'bg-red-500/10 border-red-500/40 text-red-400', tone: 'red' },
};

export function SecurityView() {
  const { securityReport, connected, setCurrentView, setSelectedExchangeId } =
    useAppStore();
  const { requestSecurityScan } = useSocket();
  const [tab, setTab] = useState<Tab>('dependencies');

  const report = securityReport;
  const scanning = report?.scanState.audit === 'running';

  return (
    <div className="space-y-6">
      {/* Header banner — score + scan state + rescan button */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <ScoreBadge report={report} />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Security
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Supply-chain CVEs from <code className="text-gray-400">npm audit</code> + OSV.dev,
                runtime posture from Studio's recorded traffic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionPill connected={connected} />
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
      </div>

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
        <DependenciesTab report={report} />
      )}
      {tab === 'posture' && (
        <PostureTab
          report={report}
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
  return (
    <div
      className={cn(
        'w-14 h-14 rounded-lg border flex items-center justify-center text-2xl font-bold',
        styles.badge,
      )}
      title={`Aggregate posture grade: ${score}`}
    >
      {score}
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
// Dependencies tab
// ────────────────────────────────────────────────────────────────────────

function DependenciesTab({ report }: { report: SecurityReport | null }) {
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

  const groups = groupBySeverity(report.dependencies);
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
        />
      )}

      {/* Per-severity breakdown — the audit detail view. */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300 tracking-tight">
            All advisories
          </h3>
          <span className="text-xs text-gray-600 font-mono">
            ({report.dependencies.length})
          </span>
        </div>
        {SEVERITY_ORDER.map((sev) => {
          const items = groups[sev] ?? [];
          if (items.length === 0) return null;
          return (
            <SeverityGroup key={sev} severity={sev} count={items.length}>
              {items.map((f) => (
                <DependencyFindingCard
                  key={f.id}
                  finding={f}
                  fixInFlight={report.scanState.fix?.state === 'running'}
                />
              ))}
            </SeverityGroup>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Fix groups — the "act on the change, not on every CVE" headline
// ────────────────────────────────────────────────────────────────────────

function FixGroupsSection({
  groups,
  findingsById,
  fixInFlight,
}: {
  groups: FixGroup[];
  findingsById: Map<string, DependencyFinding>;
  fixInFlight: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          Recommended fixes
        </h3>
        <span className="text-xs text-gray-500 font-mono">({groups.length})</span>
      </div>
      <p className="text-xs text-gray-500 -mt-1 mb-2">
        Each row collapses every advisory that shares a single upgrade.
        Apply one change, clear many findings.
      </p>
      <div className="space-y-3">
        {groups.map((group) => (
          <FixGroupCard
            key={group.id}
            group={group}
            findings={group.findingIds
              .map((id) => findingsById.get(id))
              .filter((f): f is DependencyFinding => Boolean(f))}
            fixInFlight={fixInFlight}
          />
        ))}
      </div>
    </div>
  );
}

function FixGroupCard({
  group,
  findings,
  fixInFlight,
}: {
  group: FixGroup;
  findings: DependencyFinding[];
  fixInFlight: boolean;
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
    <div className={cn('rounded-lg border bg-gray-900/40 overflow-hidden', style.ring)}>
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
}: {
  finding: DependencyFinding;
  fixInFlight: boolean;
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
    <div className={cn('rounded-lg border bg-gray-900/40 p-4 space-y-3', style.ring)}>
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
          </div>
        </>
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
  onOpenExchange: (exchangeId: string) => void;
  onOpenRoute: () => void;
  onOpenLogs: () => void;
}

function PostureTab({
  report,
  onOpenExchange,
  onOpenRoute,
  onOpenLogs,
}: PostureTabProps) {
  if (!report) {
    return <EmptyState icon={Loader2} message="Connecting to agent…" />;
  }
  if (report.posture.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        tone="success"
        message="No runtime posture findings yet. Send some requests through your app — the analyzer evaluates recorded traffic."
      />
    );
  }

  const groups = groupBySeverity(report.posture);

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((sev) => {
        const items = groups[sev] ?? [];
        if (items.length === 0) return null;
        return (
          <SeverityGroup key={sev} severity={sev} count={items.length}>
            {items.map((f) => (
              <PostureFindingCard
                key={f.id}
                finding={f}
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

function PostureFindingCard({
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
  const style = SEVERITY_STYLES[finding.severity];
  return (
    <div className={cn('rounded-lg border bg-gray-900/40 p-4 space-y-3', style.ring)}>
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
