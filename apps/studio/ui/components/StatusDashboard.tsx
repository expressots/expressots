/**
 * Status Dashboard
 *
 * Browser-side equivalent of the CLI startup banner. Surfaces in one
 * page the same info you see in the terminal when the app boots (server,
 * config, health, security, metrics, startup) but live and refreshing.
 *
 * Each metric on the cards is clickable: clicking opens an inline
 * "Details" panel below the grid that lists the underlying items
 * (routes, controllers, services, providers, middleware, bindings) with
 * file paths and "Open in editor" links where applicable.
 *
 * Data sources (already wired through the Studio Agent):
 *   - `runtime`  — pid / node version / platform / boot time / versions
 *   - `metrics`  — uptime, memory usage, request/error counters
 *   - `routes`   — total registered routes
 *   - `structure`— controllers / services / providers / middleware
 *   - `containerSnapshot` — DI bindings + scope distribution
 */

import { useMemo, useState } from 'react';
import {
  Server,
  Settings,
  Activity,
  ShieldCheck,
  BarChart3,
  Rocket,
  Layers,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Box,
  Cog,
  Database,
  Boxes,
  ShieldAlert,
  Route,
  FileCode,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { formatBytes, getMethodColor, cn } from '../lib/utils';
import { openInEditor } from '../lib/open-in-editor';

/**
 * Identifies which list is currently expanded in the inline drill-down
 * panel. `null` keeps the panel closed.
 */
type DrillKey =
  | 'routes'
  | 'controllers'
  | 'services'
  | 'providers'
  | 'middleware'
  | 'bindings'
  | 'interceptors';

const DRILL_TITLES: Record<DrillKey, string> = {
  routes: 'Routes',
  controllers: 'Controllers',
  services: 'Services / Use Cases',
  providers: 'Providers',
  middleware: 'Middleware',
  bindings: 'DI Bindings',
  interceptors: 'Interceptors',
};

export function StatusDashboard() {
  const {
    runtime,
    metrics,
    connected,
    routes,
    structure,
    containerSnapshot,
    recordingEnabled,
    agentLatencyMs,
    eventsReceived,
    securityReport,
    setCurrentView,
  } = useAppStore();
  const { requestRuntime, requestMetrics, rescan } = useSocket();
  const [drill, setDrill] = useState<DrillKey | null>(null);

  const refresh = () => {
    requestRuntime();
    requestMetrics();
    rescan();
  };

  const toggleDrill = (key: DrillKey) =>
    setDrill((current) => (current === key ? null : key));

  // Memory percentages for the health card (fall back to 0 when no data).
  const heapPct =
    metrics && metrics.memoryUsage.heapTotal > 0
      ? Math.round(
          (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100,
        )
      : 0;

  const interceptors =
    runtime?.counts.interceptors ?? structure?.middleware.length ?? 0;

  // Compose by-scope summary string for the security/scope card.
  const byScope = containerSnapshot?.summary.byScope ?? {};
  const scopeSummary = Object.entries(byScope)
    .map(([scope, n]) => `${scope}: ${n}`)
    .join(', ');

  return (
    <div className="space-y-6">
      {/* Banner — hero focal point with brand gradient wash */}
      <div className="studio-card relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 140% at 0% 0%, rgba(61, 230, 120, 0.10) 0%, transparent 45%)',
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/12 border border-primary-500/30 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {runtime?.serviceName ?? 'expressots-app'}
                </h2>
                {runtime?.env && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-medium">
                    {runtime.env}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5 font-mono">
                {connected && runtime?.versions.core ? (
                  <>
                    <span title="@expressots/core">core v{runtime.versions.core}</span>
                    {runtime?.versions.adapterExpress && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span title="@expressots/adapter-express">
                          adapter v{runtime.versions.adapterExpress}
                        </span>
                      </>
                    )}
                    {runtime?.versions.agent && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span title="@expressots/studio-agent">
                          studio-agent v{runtime.versions.agent}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="not-italic text-gray-500">
                    Waiting for your app to connect — start it with the Studio agent enabled.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionPill connected={connected} latencyMs={agentLatencyMs} />
            <button
              onClick={refresh}
              className="studio-btn"
              title="Re-fetch runtime info, metrics, and rescan routes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Six-card grid mirroring the CLI banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Server */}
        <Card icon={Server} title="Server" accent="text-primary-400">
          <Row label="Env" value={runtime?.env ?? '—'} mono />
          <Row label="App URL" value={runtime?.appUrl ?? '—'} mono />
          <Row
            label="App Port"
            value={runtime?.appPort ? String(runtime.appPort) : '—'}
            mono
          />
          <Row
            label="Agent Port"
            value={runtime ? String(runtime.agentPort) : '—'}
            mono
          />
          <Row label="PID" value={runtime ? String(runtime.pid) : '—'} mono />
        </Card>

        {/* Config */}
        <Card icon={Settings} title="Config" accent="text-blue-400">
          <Row label="Global Prefix" value={runtime?.globalPrefix ?? '/'} mono />
          <Row label="Node" value={runtime?.nodeVersion ?? '—'} mono />
          <Row
            label="Platform"
            value={runtime ? `${runtime.platform} (${runtime.arch})` : '—'}
            mono
          />
          <Row
            label="Recording"
            value={recordingEnabled ? 'enabled' : 'paused'}
            valueClass={
              recordingEnabled ? 'text-success-500' : 'text-gray-500'
            }
          />
        </Card>

        {/* Startup */}
        <Card icon={Rocket} title="Startup" accent="text-pink-400">
          <Row
            label="Boot Time"
            value={runtime?.startupMs ? `${runtime.startupMs}ms` : '—'}
            mono
          />
          <Row
            label="Started At"
            value={
              runtime ? new Date(runtime.startedAt).toLocaleString() : '—'
            }
          />
          <Row
            label="Uptime"
            value={runtime ? formatUptime(runtime.uptimeMs) : '—'}
            mono
          />
          <Row
            label="Events"
            value={`${eventsReceived.toLocaleString()} from agent`}
            mono
          />
        </Card>

        {/* Health */}
        <Card icon={Activity} title="Health" accent="text-success-500">
          {metrics ? (
            <>
              <Row
                label="Memory"
                value={`${formatBytes(metrics.memoryUsage.heapUsed)} / ${formatBytes(metrics.memoryUsage.heapTotal)}`}
                mono
                tooltip="V8 heap memory: used / reserved. This is where JS objects, closures, and scoped data live. Differs from the terminal banner which shows a one-time boot snapshot."
              />
              <Row
                label="Heap"
                value={`${heapPct}%`}
                mono
                tooltip="Heap pressure: heapUsed / heapTotal. High values (>85%) mean V8 may trigger frequent garbage collection pauses or expand its heap."
              >
                <div className="mt-1 w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={cn(
                      'h-full',
                      heapPct > 85
                        ? 'bg-error-500'
                        : heapPct > 65
                          ? 'bg-warning-500'
                          : 'bg-success-500',
                    )}
                    style={{ width: `${Math.min(100, heapPct)}%` }}
                  />
                </div>
              </Row>
              <Row
                label="RSS"
                value={formatBytes(metrics.memoryUsage.rss)}
                mono
                tooltip="Resident Set Size: total physical memory used by the entire process, including the V8 heap, native C++ bindings, buffers, and shared libraries. Always larger than heap."
              />
              <Row
                label="Connections"
                value={String(metrics.activeConnections)}
                mono
                tooltip="Number of active WebSocket clients connected to the Studio Agent (e.g. this browser tab). Not the HTTP connections to your app server."
              />
              <div className="mt-1 text-[10px] text-gray-600 italic text-right">
                Live — refreshed every 5s
              </div>
            </>
          ) : (
            <Empty>Waiting for metrics…</Empty>
          )}
        </Card>

        {/* Metrics — clickable */}
        <Card icon={BarChart3} title="Metrics" accent="text-amber-400">
          <ClickRow
            label="Routes"
            value={String(runtime?.counts.routes ?? routes.length)}
            active={drill === 'routes'}
            onClick={() => toggleDrill('routes')}
          />
          <ClickRow
            label="Controllers"
            value={String(
              runtime?.counts.controllers ?? structure?.controllers.length ?? 0,
            )}
            active={drill === 'controllers'}
            onClick={() => toggleDrill('controllers')}
          />
          <ClickRow
            label="Services / UseCases"
            value={String(
              runtime?.counts.services ?? structure?.services.length ?? 0,
            )}
            active={drill === 'services'}
            onClick={() => toggleDrill('services')}
          />
          <ClickRow
            label="Providers"
            value={String(
              runtime?.counts.providers ?? structure?.providers.length ?? 0,
            )}
            active={drill === 'providers'}
            onClick={() => toggleDrill('providers')}
          />
          <ClickRow
            label="Middleware"
            value={String(
              runtime?.counts.middleware ?? structure?.middleware.length ?? 0,
            )}
            active={drill === 'middleware'}
            onClick={() => toggleDrill('middleware')}
          />
        </Card>

        {/* Security & Scope — clickable, opens the Security view */}
        <Card icon={ShieldCheck} title="Security & Scope" accent="text-purple-400">
          <SecurityScoreRow
            report={securityReport}
            onOpen={() => setCurrentView('security')}
          />
          <ClickRow
            label="Interceptors"
            value={String(interceptors)}
            active={drill === 'interceptors'}
            onClick={() => toggleDrill('interceptors')}
          />
          <ClickRow
            label="DI Bindings"
            value={String(containerSnapshot?.summary.total ?? 0)}
            active={drill === 'bindings'}
            onClick={() => toggleDrill('bindings')}
          />
          <Row
            label="By Scope"
            value={scopeSummary || '—'}
            mono
            valueClass="text-xs"
          />
        </Card>
      </div>

      {/* Preset card — full width, hidden when no preset is applied */}
      <MiddlewarePresetCard preset={runtime?.middlewarePreset ?? null} />

      {/* Inline drill-down panel — appears under the grid when a metric is clicked */}
      {drill && (
        <DrillPanel drill={drill} onClose={() => setDrill(null)} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Middleware Preset card
// ────────────────────────────────────────────────────────────────────────

function MiddlewarePresetCard({
  preset,
}: {
  preset: import('../types').MiddlewarePresetInfo | null;
}) {
  if (!preset) {
    return null;
  }

  const corsDisplay = preset.security?.cors
    ? typeof preset.security.cors.origin === 'string'
      ? preset.security.cors.origin
      : preset.security.cors.origin
        ? 'permissive'
        : 'restricted'
    : '—';

  const rateLimitDisplay = preset.security?.rateLimit
    ? `${preset.security.rateLimit.max}/${Math.round((preset.security.rateLimit.windowMs ?? 60000) / 1000)}s`
    : 'off';

  return (
    <div className="studio-card">
      <div className="studio-card-header">
        <Layers className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          Preset
        </span>
        <span className="ml-auto text-xs font-mono text-gray-400">
          {preset.name}{preset.hasOverrides ? ' (custom)' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4 py-3">
        <MiniStat label="Preset" value={preset.name} highlight />
        <MiniStat
          label="Parse"
          value={
            preset.parse?.json?.limit
              ? `JSON ${preset.parse.json.limit}${preset.parse?.cookies ? ' + cookies' : ''}`
              : 'defaults'
          }
        />
        <MiniStat label="CORS" value={corsDisplay} />
        <MiniStat
          label="Rate Limit"
          value={rateLimitDisplay}
          muted={rateLimitDisplay === 'off'}
        />
        <MiniStat
          label="Helmet"
          value={preset.security?.helmet !== false ? 'on' : 'off'}
          muted={preset.security?.helmet === false}
        />
        <MiniStat
          label="Compression"
          value={
            preset.compress?.enabled
              ? preset.compress.level
                ? `level ${preset.compress.level}`
                : 'default'
              : 'off'
          }
          muted={!preset.compress?.enabled}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-mono truncate',
          highlight
            ? 'text-teal-300 font-semibold'
            : muted
              ? 'text-gray-500'
              : 'text-gray-100',
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Drill-down panel
// ────────────────────────────────────────────────────────────────────────

function DrillPanel({
  drill,
  onClose,
}: {
  drill: DrillKey;
  onClose: () => void;
}) {
  const { routes, structure, containerSnapshot, runtime } = useAppStore();

  const items = useMemo(() => {
    switch (drill) {
      case 'routes':
        return routes.map((r, i) => ({
          key: `${r.method}-${r.path}-${i}`,
          primary: r.path,
          secondary: `${r.controller}.${r.controllerMethod}`,
          method: r.method,
          filePath: r.filePath,
          lineNumber: r.lineNumber,
        }));
      case 'controllers':
        return (structure?.controllers ?? []).map((c) => ({
          key: c.name,
          primary: c.name,
          secondary: `${c.routes.length} route${c.routes.length === 1 ? '' : 's'} · ${c.dependencies.length} dep${c.dependencies.length === 1 ? '' : 's'}`,
          deps: c.dependencies,
          filePath: c.filePath,
        }));
      case 'services':
        return (structure?.services ?? []).map((s) => ({
          key: s.name,
          primary: s.name,
          secondary: `${s.methods.length} method${s.methods.length === 1 ? '' : 's'} · ${s.dependencies.length} dep${s.dependencies.length === 1 ? '' : 's'}`,
          deps: s.dependencies,
          filePath: s.filePath,
        }));
      case 'providers':
        return mergeProviders(
          runtime?.runtimeItems?.providers,
          structure?.providers,
          containerSnapshot?.bindings,
        );
      case 'middleware':
        return mergeMiddleware(
          runtime?.runtimeItems?.middleware,
          structure?.middleware,
        );
      case 'interceptors':
        return mergeInterceptors(
          runtime?.runtimeItems?.interceptors,
          structure?.middleware,
        );
      case 'bindings':
        return (containerSnapshot?.bindings ?? []).map((b) => ({
          key: b.id,
          primary: b.className,
          secondary: b.serviceIdentifier,
          scope: b.scope,
          cached: b.cached,
          activated: b.activated,
        }));
      default:
        return [];
    }
  }, [drill, routes, structure, containerSnapshot, runtime]);

  return (
    <div className="studio-card animate-slide-up">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-white/[0.015]">
        <div className="flex items-center gap-2">
          <DrillIcon drill={drill} />
          <h3 className="text-sm font-semibold text-white">
            {DRILL_TITLES[drill]}
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            ({items.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-white rounded transition-colors"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            Nothing to show. {drill === 'bindings' ? 'Container snapshot may not be available yet.' : 'Studio Agent hasn\'t reported any items.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {items.map((item: any) => (
              <DrillRow key={item.key} item={item} drill={drill} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DrillRow({
  item,
  drill,
}: {
  item: any;
  drill: DrillKey;
}) {
  return (
    <li className="px-5 py-3 hover:bg-gray-800/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {item.method && (
              <span
                className={cn(
                  'text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded',
                  getMethodColor(item.method),
                  'bg-gray-800',
                )}
              >
                {item.method}
              </span>
            )}
            {drill === 'middleware' && item.middlewareType && (
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                  item.middlewareType === 'built-in'
                    ? 'text-primary-300 bg-primary-950/60 border-primary-700/50'
                    : 'text-amber-300 bg-amber-950/50 border-amber-700/50',
                )}
              >
                {item.middlewareType === 'built-in' ? 'preset' : 'custom'}
              </span>
            )}
            <span className="text-sm text-white font-mono truncate" title={item.primary}>
              {item.primary}
            </span>
            {item.scope && <ScopePill scope={item.scope} />}
          </div>
          {item.secondary && (
            <div className="text-xs text-gray-500 font-mono truncate" title={item.secondary}>
              {item.secondary}
            </div>
          )}
          {item.deps && item.deps.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.deps.map((d: string) => (
                <span
                  key={d}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-mono"
                >
                  → {d}
                </span>
              ))}
            </div>
          )}
          {drill === 'bindings' && (
            <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
              {item.cached && <span className="text-primary-500">cached</span>}
              {item.activated && <span className="text-amber-400">activated</span>}
            </div>
          )}
        </div>
        {item.filePath && (
          <button
            onClick={() =>
              openInEditor({ filePath: item.filePath, lineNumber: item.lineNumber })
            }
            className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-400 transition-colors"
            title={item.filePath}
          >
            <FileCode className="w-3 h-3" />
            Open
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Merge runtime-discovered providers (class names from DI metadata, sent by
 * the adapter) with whatever the agent's static scan found and the live
 * container snapshot. This is what makes the drill-down agree with the
 * CLI banner — it surfaces framework-registered providers that file
 * scanning never sees, while still showing file paths for project code.
 *
 * Strategy:
 *   1. If runtime list is provided, it's authoritative for which providers
 *      to display (and in what order).
 *   2. For each runtime entry, try to enrich:
 *        - file path / line number from the static scan (by class name)
 *        - DI scope, cached/activated flags from the container snapshot
 *   3. If runtime list is missing, fall back to the static scan.
 */
function mergeProviders(
  runtimeProviders: { name: string; source?: string }[] | undefined,
  staticProviders: { name: string; filePath: string; methods: string[]; dependencies: string[] }[] | undefined,
  bindings: { className: string; serviceIdentifier: string; scope: string; cached: boolean; activated: boolean }[] | undefined,
): Array<Record<string, unknown>> {
  const staticByName = new Map((staticProviders ?? []).map((p) => [p.name, p]));
  const bindingByName = new Map((bindings ?? []).map((b) => [b.className, b]));

  if (runtimeProviders && runtimeProviders.length > 0) {
    return runtimeProviders.map((rp, i) => {
      const stat = staticByName.get(rp.name);
      const bind = bindingByName.get(rp.name);
      return {
        key: `${rp.name}-${i}`,
        primary: rp.name,
        secondary:
          bind?.serviceIdentifier ??
          (stat
            ? `${stat.methods.length} method${stat.methods.length === 1 ? '' : 's'} · ${stat.dependencies.length} dep${stat.dependencies.length === 1 ? '' : 's'}`
            : rp.source === 'provide'
              ? 'Registered via @provide'
              : undefined),
        deps: stat?.dependencies,
        filePath: stat?.filePath,
        scope: bind?.scope,
        cached: bind?.cached,
        activated: bind?.activated,
      };
    });
  }
  return (staticProviders ?? []).map((p) => ({
    key: p.name,
    primary: p.name,
    secondary: `${p.methods.length} method${p.methods.length === 1 ? '' : 's'} · ${p.dependencies.length} dep${p.dependencies.length === 1 ? '' : 's'}`,
    deps: p.dependencies,
    filePath: p.filePath,
  }));
}

/**
 * Merge runtime interceptor names (sent by the adapter from
 * `Reflect.getMetadata(INTERCEPTOR_METADATA_KEY.interceptor, …)`) with
 * the static-scan middleware list. Sorts by priority ascending — same as
 * the framework's execution order — so reading the drill-down top to
 * bottom matches what actually runs.
 */
function mergeInterceptors(
  runtimeInterceptors: { name: string; priority?: number; source?: string }[] | undefined,
  staticMiddleware: import('../types').MiddlewareInfo[] | undefined,
): Array<Record<string, unknown>> {
  if (runtimeInterceptors && runtimeInterceptors.length > 0) {
    const sorted = [...runtimeInterceptors].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
    return sorted.map((it, i) => ({
      key: `${it.name}-${i}`,
      primary: it.name,
      secondary:
        it.priority !== undefined
          ? `priority ${it.priority}`
          : 'Registered via @Interceptor()',
    }));
  }
  return (staticMiddleware ?? []).map((m, i) => ({
    key: `${m.name}-${i}`,
    primary: m.name,
    secondary: 'Class-based middleware',
  }));
}

/**
 * Merge runtime middleware pipeline items (from `Middleware.getPipelineInfo()`)
 * with the static-scan middleware list. Prefers runtime data because it shows
 * the full ordered pipeline including preset-applied and user-added middleware.
 */
function mergeMiddleware(
  runtimeMiddleware: import('../types').MiddlewarePipelineItem[] | undefined,
  staticMiddleware: import('../types').MiddlewareInfo[] | undefined,
): Array<Record<string, unknown>> {
  if (runtimeMiddleware && runtimeMiddleware.length > 0) {
    return runtimeMiddleware.map((m, i) => ({
      key: `${m.name}-${i}`,
      primary: m.name,
      secondary: `${m.category} · ${m.type}${m.path ? ` · ${m.path}` : ''}`,
      category: m.category,
      middlewareType: m.type,
    }));
  }
  return (staticMiddleware ?? []).map((m, i) => ({
    key: `${m.name}-${i}`,
    primary: m.name,
    secondary: `Class-based middleware${m.scope && m.scope !== 'unknown' ? ` · ${m.scope}` : ''}`,
  }));
}

function DrillIcon({ drill }: { drill: DrillKey }) {
  const map: Record<DrillKey, React.ComponentType<{ className?: string }>> = {
    routes: Route,
    controllers: Box,
    services: Cog,
    providers: Database,
    middleware: ShieldAlert,
    interceptors: ShieldAlert,
    bindings: Boxes,
  };
  const Icon = map[drill];
  return <Icon className="w-4 h-4 text-primary-400" />;
}

function ScopePill({ scope }: { scope: string }) {
  const palette: Record<string, string> = {
    Singleton: 'text-primary-300 bg-primary-950/60 border-primary-700/50',
    Request: 'text-amber-300 bg-amber-950/50 border-amber-700/50',
    Transient: 'text-purple-300 bg-purple-950/50 border-purple-700/50',
  };
  const cls = palette[scope] ?? 'text-gray-300 bg-gray-800 border-gray-700';
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border',
        cls,
      )}
    >
      {scope}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Subcomponents — cards & rows
// ────────────────────────────────────────────────────────────────────────

function Card({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="studio-card group">
      <div className="studio-card-header">
        <Icon className={cn('w-4 h-4', accent)} />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          {title}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  valueClass,
  tooltip,
  children,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
  tooltip?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3" title={tooltip}>
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <div className="flex flex-col items-end min-w-0 flex-1">
        <span
          className={cn(
            'text-sm truncate',
            mono && 'font-mono',
            valueClass ?? 'text-gray-100',
          )}
          title={tooltip ?? value}
        >
          {value}
        </span>
        {children}
      </div>
    </div>
  );
}

/**
 * Like {@link Row} but the whole row is a button that toggles a
 * matching drill-down panel below the grid. Visually shows a chevron
 * to advertise the click affordance, and highlights when active.
 */
function ClickRow({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-baseline justify-between gap-3 w-full -mx-2 px-2 py-1 rounded transition-colors',
        active
          ? 'bg-primary-500/10 border border-primary-500/30'
          : 'border border-transparent hover:bg-gray-800/60',
      )}
    >
      <span
        className={cn(
          'text-[11px] uppercase tracking-wide',
          active ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-400',
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 min-w-0">
        <span
          className={cn(
            'text-sm font-mono',
            active ? 'text-primary-300' : 'text-gray-100',
          )}
        >
          {value}
        </span>
        {active ? (
          <ChevronUp className="w-3 h-3 text-primary-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />
        )}
      </span>
    </button>
  );
}

function ConnectionPill({
  connected,
  latencyMs,
}: {
  connected: boolean;
  latencyMs: number | null;
}) {
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
      {connected && latencyMs != null && (
        <span className="text-gray-400 font-mono">· {latencyMs}ms</span>
      )}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500 italic">{children}</div>;
}

/**
 * Compact security score row — letter grade plus the highest-severity
 * counts that aren't zero. The whole row is a button that takes the
 * user to the Security view, where the full report lives.
 *
 * Kept deliberately tight (single row of pills + grade) so the card
 * still fits the four-row rhythm of the rest of the dashboard.
 */
function SecurityScoreRow({
  report,
  onOpen,
}: {
  report: import('../types').SecurityReport | null;
  onOpen: () => void;
}) {
  // Decide the badge tone — green when we have no findings, yellow if
  // we have data but the scan failed, red for grade F.
  const grade = report?.score ?? 'A';
  const tone =
    grade === 'A'
      ? 'bg-success-500/10 text-success-500 border-success-500/30'
      : grade === 'B'
        ? 'bg-primary-500/10 text-primary-400 border-primary-500/30'
        : grade === 'C'
          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
          : grade === 'D'
            ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
            : 'bg-red-500/10 text-red-400 border-red-500/30';

  const counts = report?.counts;
  const summaryParts: string[] = [];
  if (counts) {
    if (counts.CRITICAL) summaryParts.push(`${counts.CRITICAL} critical`);
    if (counts.HIGH) summaryParts.push(`${counts.HIGH} high`);
    if (counts.MEDIUM) summaryParts.push(`${counts.MEDIUM} med`);
  }
  const summary = summaryParts.join(' · ') || 'no findings';

  return (
    <button
      onClick={onOpen}
      className="w-full -mx-2 px-2 py-1.5 rounded border border-transparent hover:bg-gray-800/60 transition-colors text-left"
      title="Open the Security view"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-wide text-gray-500">
          Score
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 font-mono truncate" title={summary}>
            {summary}
          </span>
          <span
            className={cn(
              'inline-flex items-center justify-center w-7 h-7 rounded-md border text-sm font-bold',
              tone,
            )}
            aria-label={`Security grade: ${grade}`}
          >
            {grade}
          </span>
        </div>
      </div>
      {report?.scanState.audit === 'running' && (
        <div className="text-[10px] text-gray-500 mt-1 italic">Scanning…</div>
      )}
      {report?.scanState.audit === 'error' && (
        <div className="text-[10px] text-red-400/80 mt-1 truncate">
          {report.scanState.auditError ?? 'Scan failed'}
        </div>
      )}
      {report?.scanState.missingLockfile && (
        <div className="text-[10px] text-gray-500 mt-1 italic">No lockfile</div>
      )}
    </button>
  );
}

/** Pretty-print uptime — picks the most granular unit that still fits in two parts. */
function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
