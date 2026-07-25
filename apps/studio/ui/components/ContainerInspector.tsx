/**
 * Container Inspector (Binding Inspector)
 *
 * A DI-focused view that answers three questions:
 *   1. "Is something wrong?" - Health signals (scope mismatches, dead bindings)
 *   2. "What happened in this request?" - Per-request resolution highlight
 *   3. "What is this binding?" - Click-to-detail panel with deps + methods
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  Info,
  ExternalLink,
  FileSearch,
  ArrowRight,
  ArrowLeft,
  Network,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { cn } from '../lib/utils';
import type { ContainerBindingNode, AppStructure, ServiceInfo, ControllerInfo } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'className' | 'serviceIdentifier' | 'scope' | 'type' | 'cached' | 'resolutions';
type SortDir = 'asc' | 'desc';

interface HealthWarning {
  type: 'scope-mismatch' | 'never-resolved' | 'over-injection' | 'duplicate-token';
  severity: 'warning' | 'info';
  message: string;
  bindingIds: string[];
}

interface SelectedBinding {
  binding: ContainerBindingNode;
  structureInfo: StructureMatch | null;
  dependsOn: ContainerBindingNode[];
  dependedOnBy: ContainerBindingNode[];
  resolutionCount: number;
}

interface StructureMatch {
  kind: 'controller' | 'service' | 'provider' | 'middleware';
  filePath: string;
  methods: string[];
  dependencies: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const scopeColors: Record<string, string> = {
  Singleton: 'text-primary-400 bg-primary-950/40 border-primary-700/40',
  Request: 'text-amber-300 bg-amber-950/40 border-amber-700/40',
  Transient: 'text-purple-300 bg-purple-950/40 border-purple-700/40',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContainerInspector() {
  const containerSnapshot = useAppStore((s) => s.containerSnapshot);
  const structure = useAppStore((s) => s.structure);
  const selectedExchangeId = useAppStore((s) => s.selectedExchangeId);
  const containerResolutionsByExchange = useAppStore(
    (s) => s.containerResolutionsByExchange,
  );
  const { refreshContainer } = useSocket();

  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [neverResolvedOnly, setNeverResolvedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('className');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<string[] | null>(null);

  // Per-request resolution set (for highlight)
  const resolved = useMemo(() => {
    if (!selectedExchangeId) return new Set<string>();
    return new Set(containerResolutionsByExchange[selectedExchangeId] ?? []);
  }, [selectedExchangeId, containerResolutionsByExchange]);

  // Aggregate resolution counts across all recorded traffic
  const resolutionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const identifiers of Object.values(containerResolutionsByExchange)) {
      for (const sid of identifiers) {
        counts[sid] = (counts[sid] ?? 0) + 1;
      }
    }
    return counts;
  }, [containerResolutionsByExchange]);

  const totalExchanges = Object.keys(containerResolutionsByExchange).length;

  // Build index: id -> binding
  const bindingsById = useMemo(() => {
    if (!containerSnapshot) return new Map<string, ContainerBindingNode>();
    const m = new Map<string, ContainerBindingNode>();
    for (const b of containerSnapshot.bindings) m.set(b.id, b);
    return m;
  }, [containerSnapshot]);

  // Health warnings
  const healthWarnings = useMemo(() => {
    if (!containerSnapshot) return [];
    return computeHealthWarnings(
      containerSnapshot.bindings,
      containerSnapshot.edges,
      bindingsById,
      resolutionCounts,
      totalExchanges,
      structure,
    );
  }, [containerSnapshot, bindingsById, resolutionCounts, totalExchanges, structure]);

  // Get resolution count for a binding
  const getResCount = useCallback(
    (b: ContainerBindingNode) =>
      (resolutionCounts[b.serviceIdentifier] ?? 0) +
      (b.className !== b.serviceIdentifier ? (resolutionCounts[b.className] ?? 0) : 0),
    [resolutionCounts],
  );

  // Filter + sort
  const filteredBindings = useMemo(() => {
    if (!containerSnapshot) return [];
    let list = containerSnapshot.bindings;

    // Health filter (from clicking a warning card)
    if (healthFilter) {
      const ids = new Set(healthFilter);
      list = list.filter((b) => ids.has(b.id));
    }

    if (scopeFilter !== 'all') {
      list = list.filter((b) => b.scope === scopeFilter);
    }
    if (typeFilter !== 'all') {
      list = list.filter((b) => b.type === typeFilter);
    }
    if (neverResolvedOnly) {
      list = list.filter((b) => getResCount(b) === 0);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.className.toLowerCase().includes(q) ||
          b.serviceIdentifier.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'className':
          cmp = a.className.localeCompare(b.className);
          break;
        case 'serviceIdentifier':
          cmp = a.serviceIdentifier.localeCompare(b.serviceIdentifier);
          break;
        case 'scope':
          cmp = a.scope.localeCompare(b.scope);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'cached':
          cmp = Number(a.cached) - Number(b.cached);
          break;
        case 'resolutions':
          cmp = getResCount(a) - getResCount(b);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [containerSnapshot, scopeFilter, typeFilter, neverResolvedOnly, search, sortField, sortDir, healthFilter, getResCount]);

  // Selected binding detail
  const selectedBinding = useMemo((): SelectedBinding | null => {
    if (!selectedId || !containerSnapshot) return null;
    const binding = bindingsById.get(selectedId);
    if (!binding) return null;

    const structureInfo = resolveStructureMatch(binding.className, structure);

    const dependsOn: ContainerBindingNode[] = [];
    const dependedOnBy: ContainerBindingNode[] = [];
    for (const edge of containerSnapshot.edges) {
      if (edge.source === selectedId) {
        const target = bindingsById.get(edge.target);
        if (target) dependsOn.push(target);
      }
      if (edge.target === selectedId) {
        const source = bindingsById.get(edge.source);
        if (source) dependedOnBy.push(source);
      }
    }

    return {
      binding,
      structureInfo,
      dependsOn,
      dependedOnBy,
      resolutionCount: getResCount(binding),
    };
  }, [selectedId, containerSnapshot, bindingsById, structure, getResCount]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Timestamp display
  const snapshotAge = useMemo(() => {
    if (!containerSnapshot?.timestamp) return null;
    const ts = new Date(containerSnapshot.timestamp).getTime();
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }, [containerSnapshot?.timestamp]);

  if (!containerSnapshot || containerSnapshot.bindings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Boxes className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No container snapshot</p>
        <p className="text-sm mt-2 max-w-md text-center">
          The Studio Agent could not introspect the DI container. Make sure
          your application is running and the agent is connected.
        </p>
      </div>
    );
  }

  const uniqueTypes = Object.keys(containerSnapshot.summary.byType);

  return (
    <div className="flex gap-4 items-start">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Bindings" value={containerSnapshot.summary.total} />
          <SummaryCard
            label="Singletons"
            value={containerSnapshot.summary.byScope['Singleton'] ?? 0}
          />
          <SummaryCard
            label="Request-scoped"
            value={containerSnapshot.summary.byScope['Request'] ?? 0}
          />
          <SummaryCard
            label="Transient"
            value={containerSnapshot.summary.byScope['Transient'] ?? 0}
          />
          <SummaryCard
            label="Materialized"
            value={containerSnapshot.summary.cached}
          />
        </div>

        {/* Health signals */}
        {healthWarnings.length > 0 && (
          <HealthSignals
            warnings={healthWarnings}
            activeFilter={healthFilter}
            onFilter={(ids) => setHealthFilter(ids)}
          />
        )}

        {/* Per-request banner */}
        {resolved.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-950/30 border border-primary-700/40 rounded-lg text-sm">
            <FileSearch className="w-4 h-4 text-primary-400" />
            <span className="text-primary-300">
              Showing {resolved.size} binding{resolved.size === 1 ? '' : 's'} resolved by the selected request.
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bindings..."
              className="studio-input w-full pl-9 pr-3 py-2"
            />
          </div>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="studio-select"
          >
            <option value="all">All scopes</option>
            {Object.keys(containerSnapshot.summary.byScope).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="studio-select"
          >
            <option value="all">All types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={neverResolvedOnly}
              onChange={(e) => setNeverResolvedOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-gray-800 border-gray-700"
            />
            Never resolved
          </label>

          {healthFilter && (
            <button
              onClick={() => setHealthFilter(null)}
              className="studio-btn text-xs"
            >
              <X className="w-3 h-3" />
              Clear filter
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto text-xs text-gray-500">
            {snapshotAge && <span>Snapshot: {snapshotAge}</span>}
            <button
              onClick={refreshContainer}
              className="studio-icon-btn"
              title="Re-capture container snapshot"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bindings Table */}
        <div className="studio-card">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-[#101319] sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <SortableHeader field="className" label="Class" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader field="serviceIdentifier" label="Token" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader field="scope" label="Scope" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader field="type" label="Type" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader field="cached" label="Cached" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader field="resolutions" label="Resolved" current={sortField} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredBindings.map((b) => {
                  const isResolved =
                    resolved.has(b.serviceIdentifier) || resolved.has(b.className);
                  const count = getResCount(b);
                  const isSelected = selectedId === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(isSelected ? null : b.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-primary-950/40 ring-1 ring-inset ring-primary-700/50'
                          : isResolved
                            ? 'bg-primary-950/20 hover:bg-primary-950/30'
                            : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <td className="px-4 py-2 font-mono text-white">{b.className}</td>
                      <td className="px-4 py-2 font-mono text-gray-400 text-xs max-w-[200px] truncate" title={b.serviceIdentifier}>
                        {b.serviceIdentifier}
                      </td>
                      <td className="px-4 py-2">
                        <ScopeBadge scope={b.scope} />
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{b.type}</td>
                      <td className="px-4 py-2 text-center">
                        {b.cached ? (
                          <span className="text-primary-400">Yes</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {count > 0 ? (
                          <span className="text-gray-200">{count}</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredBindings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No bindings match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedBinding && (
        <BindingDetailPanel
          selection={selectedBinding}
          totalExchanges={totalExchanges}
          isResolvedInRequest={
            resolved.has(selectedBinding.binding.serviceIdentifier) ||
            resolved.has(selectedBinding.binding.className)
          }
          onClose={() => setSelectedId(null)}
          onSelectBinding={(id) => setSelectedId(id)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="studio-stat px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const cls = scopeColors[scope] || 'text-gray-300 bg-gray-800 border-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {scope}
    </span>
  );
}

function SortableHeader({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th
      className="px-4 py-2 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}

// ─── Health Signals ───────────────────────────────────────────────────────────

function HealthSignals({
  warnings,
  activeFilter,
  onFilter,
}: {
  warnings: HealthWarning[];
  activeFilter: string[] | null;
  onFilter: (ids: string[] | null) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, HealthWarning[]>();
    for (const w of warnings) {
      const list = map.get(w.type) ?? [];
      list.push(w);
      map.set(w.type, list);
    }
    return map;
  }, [warnings]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
      {Array.from(grouped.entries()).map(([type, items]) => {
        const first = items[0];
        const allIds = items.flatMap((w) => w.bindingIds);
        const isActive =
          activeFilter !== null &&
          activeFilter.length === allIds.length &&
          allIds.every((id) => activeFilter.includes(id));

        return (
          <button
            key={type}
            onClick={() => onFilter(isActive ? null : allIds)}
            className={cn(
              'studio-card !p-3 text-left transition-all',
              isActive && 'ring-1 ring-inset ring-amber-500/50',
              first.severity === 'warning'
                ? 'hover:border-amber-700/50'
                : 'hover:border-gray-600/50',
            )}
          >
            <div className="flex items-start gap-2">
              {first.severity === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn(
                  'text-xs font-medium',
                  first.severity === 'warning' ? 'text-amber-300' : 'text-gray-300',
                )}>
                  {healthTypeLabel(type)} ({items.length})
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {items[0].message}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function healthTypeLabel(type: string): string {
  switch (type) {
    case 'scope-mismatch': return 'Scope Mismatch';
    case 'never-resolved': return 'Never Resolved';
    case 'over-injection': return 'Over-Injection';
    case 'duplicate-token': return 'Duplicate Token';
    default: return type;
  }
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function BindingDetailPanel({
  selection,
  totalExchanges,
  isResolvedInRequest,
  onClose,
  onSelectBinding,
}: {
  selection: SelectedBinding;
  totalExchanges: number;
  isResolvedInRequest: boolean;
  onClose: () => void;
  onSelectBinding: (id: string) => void;
}) {
  const { binding, structureInfo, dependsOn, dependedOnBy, resolutionCount } = selection;

  return (
    <div className="w-80 lg:w-96 shrink-0 studio-card p-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto sticky top-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Binding</p>
          <h3 className="text-sm font-mono font-semibold text-gray-100">{binding.className}</h3>
        </div>
        <button onClick={onClose} className="studio-icon-btn" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DI Registration */}
      <section>
        <SectionLabel>DI Registration</SectionLabel>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-gray-500">Token</dt>
          <dd className="font-mono text-gray-300 truncate" title={binding.serviceIdentifier}>
            {binding.serviceIdentifier}
          </dd>
          <dt className="text-gray-500">Scope</dt>
          <dd><ScopeBadge scope={binding.scope} /></dd>
          <dt className="text-gray-500">Type</dt>
          <dd className="text-gray-300">{binding.type}</dd>
          <dt className="text-gray-500">Cached</dt>
          <dd className={binding.cached ? 'text-primary-400' : 'text-gray-500'}>
            {binding.cached ? 'Yes (instance exists)' : 'No'}
          </dd>
          <dt className="text-gray-500">Activated</dt>
          <dd className={binding.activated ? 'text-primary-400' : 'text-gray-500'}>
            {binding.activated ? 'Yes' : 'No'}
          </dd>
          {binding.moduleId != null && (
            <>
              <dt className="text-gray-500">Module</dt>
              <dd className="text-gray-300 font-mono">{String(binding.moduleId)}</dd>
            </>
          )}
        </dl>
      </section>

      {/* Resolution Stats */}
      <section>
        <SectionLabel>Resolution Stats</SectionLabel>
        <div className="space-y-1 text-xs">
          <p className="text-gray-300">
            Resolved in <span className="text-white font-medium">{resolutionCount}</span>
            {' '}of {totalExchanges} recorded request{totalExchanges === 1 ? '' : 's'}
          </p>
          {isResolvedInRequest && (
            <p className="text-primary-400 flex items-center gap-1">
              <FileSearch className="w-3 h-3" />
              Resolved in selected request
            </p>
          )}
          {totalExchanges > 0 && resolutionCount === 0 && (
            <p className="text-amber-400/80 text-[11px]">
              Not observed in any recorded traffic
            </p>
          )}
        </div>
      </section>

      {/* Class Info (from AppStructure) */}
      {structureInfo && (
        <section>
          <SectionLabel>
            Class Info
            <span className="ml-2 text-[10px] text-gray-600 normal-case font-normal">
              ({structureInfo.kind})
            </span>
          </SectionLabel>
          <div className="space-y-2 text-xs">
            {structureInfo.filePath && (
              <div className="flex items-center gap-1 text-gray-400 font-mono truncate" title={structureInfo.filePath}>
                <ExternalLink className="w-3 h-3 shrink-0" />
                {structureInfo.filePath.replace(/^.*\/src\//, 'src/')}
              </div>
            )}
            {structureInfo.methods.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Methods ({structureInfo.methods.length})</p>
                <div className="flex flex-wrap gap-1">
                  {structureInfo.methods.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[10px]">
                      {m}()
                    </span>
                  ))}
                </div>
              </div>
            )}
            {structureInfo.dependencies.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Constructor deps ({structureInfo.dependencies.length})</p>
                <div className="flex flex-wrap gap-1">
                  {structureInfo.dependencies.map((d) => (
                    <span key={d} className="px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400 font-mono text-[10px]">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Explore in Architecture */}
      <ExploreInArchitectureButton className={binding.className} />

      {/* Dependencies (from DI edges) */}
      {(dependsOn.length > 0 || dependedOnBy.length > 0) && (
        <section>
          <SectionLabel>Dependencies</SectionLabel>
          <div className="space-y-2">
            {dependsOn.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-1">
                  <ArrowRight className="w-3 h-3" /> Depends on ({dependsOn.length})
                </p>
                <div className="space-y-0.5">
                  {dependsOn.map((dep) => (
                    <DepChip key={dep.id} binding={dep} onClick={() => onSelectBinding(dep.id)} />
                  ))}
                </div>
              </div>
            )}
            {dependedOnBy.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-1">
                  <ArrowLeft className="w-3 h-3" /> Depended on by ({dependedOnBy.length})
                </p>
                <div className="space-y-0.5">
                  {dependedOnBy.map((dep) => (
                    <DepChip key={dep.id} binding={dep} onClick={() => onSelectBinding(dep.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function DepChip({ binding, onClick }: { binding: ContainerBindingNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/50 hover:bg-gray-700/50 text-left w-full transition-colors"
    >
      <span className="text-xs font-mono text-gray-200 truncate flex-1">{binding.className}</span>
      <ScopeBadge scope={binding.scope} />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 font-medium">
      {children}
    </p>
  );
}

// ─── Health computation ───────────────────────────────────────────────────────

function computeHealthWarnings(
  bindings: ContainerBindingNode[],
  edges: { source: string; target: string }[],
  bindingsById: Map<string, ContainerBindingNode>,
  resolutionCounts: Record<string, number>,
  totalExchanges: number,
  structure: AppStructure | null,
): HealthWarning[] {
  const warnings: HealthWarning[] = [];

  // 1. Scope mismatches: Singleton depending on Transient/Request
  for (const edge of edges) {
    const source = bindingsById.get(edge.source);
    const target = bindingsById.get(edge.target);
    if (!source || !target) continue;
    if (source.scope === 'Singleton' && target.scope !== 'Singleton') {
      warnings.push({
        type: 'scope-mismatch',
        severity: 'warning',
        message: `${source.className} (Singleton) depends on ${target.className} (${target.scope})`,
        bindingIds: [source.id, target.id],
      });
    }
  }

  // 2. Never resolved (only meaningful when we have traffic data)
  if (totalExchanges >= 5) {
    const neverResolved = bindings.filter((b) => {
      const count =
        (resolutionCounts[b.serviceIdentifier] ?? 0) +
        (b.className !== b.serviceIdentifier ? (resolutionCounts[b.className] ?? 0) : 0);
      return count === 0;
    });
    if (neverResolved.length > 0) {
      warnings.push({
        type: 'never-resolved',
        severity: 'info',
        message: `${neverResolved.length} binding${neverResolved.length === 1 ? '' : 's'} not observed in ${totalExchanges} requests`,
        bindingIds: neverResolved.map((b) => b.id),
      });
    }
  }

  // 3. Over-injection: 7+ constructor deps
  if (structure) {
    const allServices: (ServiceInfo | ControllerInfo)[] = [
      ...structure.services,
      ...structure.providers,
      ...structure.controllers,
      ...structure.middleware,
    ];
    for (const svc of allServices) {
      if (svc.dependencies.length >= 7) {
        const matching = bindings.filter(
          (b) => b.className === svc.name || b.serviceIdentifier === svc.name,
        );
        if (matching.length > 0) {
          warnings.push({
            type: 'over-injection',
            severity: 'warning',
            message: `${svc.name} has ${svc.dependencies.length} constructor dependencies`,
            bindingIds: matching.map((b) => b.id),
          });
        }
      }
    }
  }

  // 4. Duplicate tokens
  const tokenCounts = new Map<string, ContainerBindingNode[]>();
  for (const b of bindings) {
    const list = tokenCounts.get(b.serviceIdentifier) ?? [];
    list.push(b);
    tokenCounts.set(b.serviceIdentifier, list);
  }
  for (const [token, group] of tokenCounts) {
    if (group.length > 1) {
      warnings.push({
        type: 'duplicate-token',
        severity: 'info',
        message: `"${token}" has ${group.length} bindings registered`,
        bindingIds: group.map((b) => b.id),
      });
    }
  }

  return warnings;
}

// ─── Structure cross-reference ────────────────────────────────────────────────

function resolveStructureMatch(
  className: string,
  structure: AppStructure | null,
): StructureMatch | null {
  if (!structure) return null;

  const controller = structure.controllers.find((c) => c.name === className);
  if (controller) {
    return {
      kind: 'controller',
      filePath: controller.filePath,
      methods: [],
      dependencies: controller.dependencies,
    };
  }

  const service = structure.services.find((s) => s.name === className);
  if (service) {
    return {
      kind: 'service',
      filePath: service.filePath,
      methods: service.methods,
      dependencies: service.dependencies,
    };
  }

  const provider = structure.providers.find((p) => p.name === className);
  if (provider) {
    return {
      kind: 'provider',
      filePath: provider.filePath,
      methods: provider.methods,
      dependencies: provider.dependencies,
    };
  }

  const middleware = structure.middleware.find((m) => m.name === className);
  if (middleware) {
    return {
      kind: 'middleware',
      filePath: middleware.filePath,
      methods: middleware.methods,
      dependencies: middleware.dependencies,
    };
  }

  return null;
}

function ExploreInArchitectureButton({ className: name }: { className: string }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingArchitectureContext = useAppStore((s) => s.setPendingArchitectureContext);
  const structure = useAppStore((s) => s.structure);

  const kind = useMemo(() => {
    if (!structure) return null;
    if (structure.controllers.some((c) => c.name === name)) return 'controller';
    if (structure.services.some((s) => s.name === name)) return 'service';
    if (structure.providers.some((p) => p.name === name)) return 'provider';
    if (structure.middleware.some((m) => m.name === name)) return 'middleware';
    return null;
  }, [structure, name]);

  if (!kind) return null;

  return (
    <button
      onClick={() => {
        setPendingArchitectureContext({
          lens: 'explore',
          nodeId: `${kind}-${name}`,
        });
        setCurrentView('architecture');
      }}
      className="studio-btn w-full justify-center text-xs"
    >
      <Network className="w-3.5 h-3.5" />
      Explore dependencies
    </button>
  );
}
