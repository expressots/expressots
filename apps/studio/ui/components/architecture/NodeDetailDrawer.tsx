import { X, Send, FileCode, AlertTriangle, Lightbulb } from 'lucide-react';
import { openInEditor } from '../../lib/open-in-editor';
import { getMethodColor } from '../../lib/utils';
import type { SelectedNode } from '../../lib/architecture/types';
import type { RouteInfo } from '../../types';

export function NodeDetailDrawer({
  node,
  onClose,
  onTryInApiClient,
}: {
  node: SelectedNode;
  onClose: () => void;
  onTryInApiClient: (route: RouteInfo) => void;
}) {
  const w = node.warnings;
  const hasWarnings = w && (w.cycle || w.orphan || w.fanIn);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-[#0e1014]/95 border-l border-white/[0.07] backdrop-blur-md p-4 overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500">{node.kind}</p>
          <h3 className="text-sm font-mono font-semibold text-gray-100">{node.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="studio-icon-btn"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warnings with actionable guidance */}
      {hasWarnings && (
        <div className="space-y-2 mb-3">
          {w.cycle && (
            <WarningCard
              severity="error"
              title="Circular dependency detected"
              description={`${node.name} is part of a dependency cycle. This means two or more artifacts depend on each other, which can cause the DI container to fail at resolution time or produce unexpected behavior.`}
              suggestions={[
                'Extract the shared logic into a new, separate provider that both sides can depend on',
                'Use an interface or abstract class with late binding to break the circular reference',
                'Re-evaluate whether both directions of the dependency are truly necessary',
              ]}
            />
          )}
          {w.fanIn != null && (
            <WarningCard
              severity="warning"
              title={`High fan-in: ${w.fanIn} dependents`}
              description={`${w.fanIn} other artifacts depend on ${node.name}, making it a coupling hotspot. Changes to this artifact risk cascading across a large portion of the application.`}
              suggestions={[
                'Consider splitting into smaller, more focused providers with single responsibilities',
                'Introduce a facade that groups related methods, so dependents only couple to what they actually use',
                'Check if some dependents only use a subset of methods; extract that subset into its own provider',
              ]}
            />
          )}
          {w.orphan && (
            <WarningCard
              severity="info"
              title="Orphan (unreferenced)"
              description={`${node.name} is registered in the container but no other artifact depends on it. It may be unused dead code, or it might be missing a connection.`}
              suggestions={[
                'If this artifact is no longer needed, remove it to reduce bundle size and complexity',
                'If it should be used, check whether a consumer forgot to inject it',
              ]}
            />
          )}
        </div>
      )}

      {node.stats && node.stats.req > 0 && (
        <div className="studio-stat mb-3 !px-3 !py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Runtime</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-300">
              <span className="text-gray-500">req:</span> {node.stats.req}
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">avg:</span> {node.stats.avgMs.toFixed(0)}ms
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">p95:</span> {node.stats.p95Ms.toFixed(0)}ms
            </span>
            <span className={node.stats.errors > 0 ? 'text-error-400' : 'text-gray-500'}>
              <span className="text-gray-500">err:</span> {node.stats.errors}
            </span>
          </div>
        </div>
      )}

      {node.routes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Routes ({node.routes.length})
          </p>
          <div className="space-y-1">
            {node.routes.map((r, i) => (
              <div
                key={`${r.method}-${r.path}-${i}`}
                className="studio-card !rounded-md p-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-semibold w-12 text-center ${getMethodColor(
                      r.method,
                    )}`}
                  >
                    {r.method}
                  </span>
                  <span className="text-xs font-mono text-gray-200 flex-1 truncate">{r.path}</span>
                  <button
                    onClick={() => onTryInApiClient(r)}
                    title="Send via API Client"
                    className="text-primary-300 hover:text-primary-200 p-1 rounded hover:bg-primary-500/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                {r.bodyDto && (
                  <div className="mt-1 ml-14">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-sky-400/70">body:</span>
                      <span className="text-[10px] font-mono text-sky-300">{r.bodyDto}</span>
                    </div>
                    {r.bodySample && Object.keys(r.bodySample).length > 0 && (
                      <div className="mt-0.5 ml-2 space-y-px">
                        {Object.entries(r.bodySample).map(([field, value]) => (
                          <div key={field} className="flex items-center gap-1.5 text-[9px]">
                            <span className="font-mono text-gray-400">{field}</span>
                            <span className="text-gray-600">:</span>
                            <span className="font-mono text-gray-500">{typeof value === 'object' && value !== null ? 'object' : typeof value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {node.methods.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Methods ({node.methods.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {node.methods.map((m) => (
              <span
                key={m}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 border border-white/[0.08] text-gray-300"
              >
                {m}()
              </span>
            ))}
          </div>
        </div>
      )}

      {node.dependencies.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Depends on</p>
          <div className="flex flex-wrap gap-1">
            {node.dependencies.map((d) => (
              <span
                key={d}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 border border-white/[0.08] text-gray-300"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.filePath && (
        <button
          onClick={() => openInEditor({ filePath: node.filePath! })}
          className="studio-btn w-full justify-center mt-2"
        >
          <FileCode className="w-3.5 h-3.5" />
          Open in editor
        </button>
      )}
    </div>
  );
}

const severityStyles = {
  error: {
    border: 'border-error-500/30',
    bg: 'bg-error-500/5',
    icon: 'text-error-400',
    title: 'text-error-300',
    badge: 'bg-error-500/15 text-error-300',
  },
  warning: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    icon: 'text-orange-400',
    title: 'text-orange-300',
    badge: 'bg-orange-500/15 text-orange-300',
  },
  info: {
    border: 'border-gray-500/30',
    bg: 'bg-gray-500/5',
    icon: 'text-gray-400',
    title: 'text-gray-300',
    badge: 'bg-gray-500/15 text-gray-400',
  },
};

function WarningCard({
  severity,
  title,
  description,
  suggestions,
}: {
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  suggestions: string[];
}) {
  const s = severityStyles[severity];
  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-3`}>
      <div className="flex items-start gap-2 mb-1.5">
        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.icon}`} />
        <p className={`text-xs font-medium ${s.title}`}>{title}</p>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{description}</p>
      <div className="space-y-1.5">
        {suggestions.map((tip, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-primary-400/60" />
            <p className="text-[11px] text-gray-300 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
