/**
 * RouteSidebar - the left pane of the API Client.
 *
 * Lists discovered routes grouped by a derived resource (default), controller,
 * or HTTP method, with pinned Favorites and Recent sections, a filter box, and
 * a drag-to-resize handle. Selecting a route hands it back to the parent
 * composer via `onPick`. Grouping/favorites/recents/collapse/width are
 * persisted in `api-client-store`.
 */

import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Star, Clock } from 'lucide-react';
import { cn, getMethodBgColor, getMethodColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import {
  useApiClientStore,
  type RouteGroupBy,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from '../stores/api-client-store';
import { deriveResourceGroups, routeKey } from '../lib/resource-tags';
import type { RouteInfo, HttpMethod } from '../types';

/** Above this many groups the sidebar collapses them all by default. */
const COLLAPSE_THRESHOLD = 6;

const METHOD_ORDER: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface RouteGroup {
  tag: string;
  routes: RouteInfo[];
}

interface RouteSidebarProps {
  /** `routeKey` of the route currently loaded in the composer, for highlight. */
  activeKey: string | null;
  onPick: (route: RouteInfo) => void;
}

/** Group routes for the chosen axis. Resource grouping is path-derived. */
function buildGroups(
  routes: RouteInfo[],
  groupBy: RouteGroupBy,
  globalPrefix: string | undefined,
): RouteGroup[] {
  if (groupBy === 'resource') {
    return deriveResourceGroups(routes, { globalPrefix });
  }

  if (groupBy === 'method') {
    const byMethod = new Map<string, RouteInfo[]>();
    for (const r of routes) {
      const list = byMethod.get(r.method) ?? [];
      list.push(r);
      byMethod.set(r.method, list);
    }
    return [...byMethod.entries()]
      .sort((a, b) => METHOD_ORDER.indexOf(a[0] as HttpMethod) - METHOD_ORDER.indexOf(b[0] as HttpMethod))
      .map(([tag, list]) => ({
        tag,
        routes: list.sort((a, b) => a.path.localeCompare(b.path)),
      }));
  }

  // Controller grouping (legacy behaviour). Anonymous routes bucket as "Other".
  const byController = new Map<string, RouteInfo[]>();
  for (const r of routes) {
    const key = r.controller && r.controller !== 'Unknown' ? r.controller : 'Other';
    const list = byController.get(key) ?? [];
    list.push(r);
    byController.set(key, list);
  }
  return [...byController.entries()]
    .map(([tag, list]) => ({
      tag,
      routes: list.sort((a, b) =>
        a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
      ),
    }))
    .sort((a, b) => {
      if (a.tag === 'Other') return 1;
      if (b.tag === 'Other') return -1;
      return a.tag.localeCompare(b.tag);
    });
}

/** Display the path relative to its resource segment so the leaf stays visible. */
function relativePath(path: string, tag: string): string {
  const segs = path.split('/');
  const idx = segs.indexOf(tag);
  if (idx >= 0 && idx < segs.length - 1) {
    return '/' + segs.slice(idx + 1).join('/');
  }
  return path;
}

export function RouteSidebar({ activeKey, onPick }: RouteSidebarProps) {
  const routes = useAppStore((s) => s.routes);
  const globalPrefix = useAppStore((s) => s.runtime?.globalPrefix);
  const {
    groupBy,
    setGroupBy,
    favorites,
    toggleFavorite,
    recents,
    groupOpen,
    setGroupOpen,
    sidebarWidth,
    setSidebarWidth,
  } = useApiClientStore();

  const [filter, setFilter] = useState('');
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const width = liveWidth ?? sidebarWidth;

  const groups = useMemo(
    () => buildGroups(routes, groupBy, globalPrefix),
    [routes, groupBy, globalPrefix],
  );

  // Lookup by key so Favorites/Recent can resolve back to live routes.
  const routeByKey = useMemo(() => {
    const map = new Map<string, RouteInfo>();
    for (const r of routes) map.set(routeKey(r), r);
    return map;
  }, [routes]);

  const q = filter.trim().toLowerCase();
  const matches = (r: RouteInfo): boolean =>
    !q ||
    r.path.toLowerCase().includes(q) ||
    r.method.toLowerCase().includes(q) ||
    (r.controllerMethod ?? '').toLowerCase().includes(q);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, routes: g.routes.filter(matches) }))
        .filter((g) => g.routes.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, q],
  );

  const defaultOpen = groups.length <= COLLAPSE_THRESHOLD;
  const isOpen = (tag: string) => groupOpen[tag] ?? defaultOpen;

  const favoriteRoutes = favorites
    .map((k) => routeByKey.get(k))
    .filter((r): r is RouteInfo => Boolean(r) && matches(r as RouteInfo));
  const recentRoutes = recents
    .map((k) => routeByKey.get(k))
    .filter((r): r is RouteInfo => Boolean(r) && matches(r as RouteInfo));

  const totalEndpoints = routes.length;

  // Drag-to-resize: track live width during the drag, persist on release.
  const dragStart = useRef<{ x: number; w: number } | null>(null);
  const onResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, w: width };
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const next = dragStart.current.w + (ev.clientX - dragStart.current.x);
      setLiveWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, next)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setLiveWidth((w) => {
        if (w != null) setSidebarWidth(w);
        return null;
      });
      dragStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="relative shrink-0 flex flex-col studio-card p-0 self-start max-h-[calc(100vh-9rem)]"
      style={{ width }}
    >
      <div className="p-3 space-y-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Routes</p>
          <span className="text-[11px] text-gray-600">
            {totalEndpoints} endpoint{totalEndpoints === 1 ? '' : 's'}
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search routes…"
            className="studio-input w-full pl-8 pr-2 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">Group by</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as RouteGroupBy)}
            className="studio-select flex-1 px-2 py-1 text-xs"
          >
            <option value="resource">Resource</option>
            <option value="controller">Controller</option>
            <option value="method">Method</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {totalEndpoints === 0 && (
          <p className="text-xs text-gray-500 italic px-1 py-2">
            No routes discovered yet.
          </p>
        )}

        {favoriteRoutes.length > 0 && (
          <Section icon={<Star className="w-3 h-3 text-yellow-400" />} label="Favorites">
            {favoriteRoutes.map((r) => (
              <RouteRow
                key={`fav-${routeKey(r)}`}
                route={r}
                label={r.path}
                active={routeKey(r) === activeKey}
                favorite
                onPick={() => onPick(r)}
                onToggleFavorite={() => toggleFavorite(routeKey(r))}
              />
            ))}
          </Section>
        )}

        {!q && recentRoutes.length > 0 && (
          <Section icon={<Clock className="w-3 h-3 text-gray-500" />} label="Recent">
            {recentRoutes.map((r) => (
              <RouteRow
                key={`recent-${routeKey(r)}`}
                route={r}
                label={r.path}
                active={routeKey(r) === activeKey}
                favorite={favorites.includes(routeKey(r))}
                onPick={() => onPick(r)}
                onToggleFavorite={() => toggleFavorite(routeKey(r))}
              />
            ))}
          </Section>
        )}

        {filteredGroups.length === 0 && totalEndpoints > 0 && (
          <p className="text-xs text-gray-500 italic px-1 py-2">No routes match "{filter}".</p>
        )}

        {filteredGroups.map((group) => {
          const open = q ? true : isOpen(group.tag);
          return (
            <div key={group.tag} className="rounded-md overflow-hidden">
              <button
                onClick={() => setGroupOpen(group.tag, !open)}
                className="w-full flex items-center gap-1.5 px-1.5 py-1.5 text-left hover:bg-white/[0.04] rounded transition-colors"
              >
                {open ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
                <span className="text-xs font-mono font-semibold text-primary-300 truncate">
                  {group.tag}
                </span>
                <span className="text-[11px] text-gray-500 ml-auto shrink-0">
                  {group.routes.length}
                </span>
              </button>
              {open && (
                <div className="pl-2 flex flex-col gap-0.5">
                  {group.routes.map((r, i) => (
                    <RouteRow
                      key={`${group.tag}-${r.method}-${r.path}-${i}`}
                      route={r}
                      label={groupBy === 'resource' ? relativePath(r.path, group.tag) : r.path}
                      active={routeKey(r) === activeKey}
                      favorite={favorites.includes(routeKey(r))}
                      onPick={() => onPick(r)}
                      onToggleFavorite={() => toggleFavorite(routeKey(r))}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onResizeDown}
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary-500/30 transition-colors"
        title="Drag to resize"
      />
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-1 mb-1 border-b border-white/[0.04]">
      <div className="flex items-center gap-1.5 px-1.5 py-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <div className="pl-2 flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function RouteRow({
  route,
  label,
  active,
  favorite,
  onPick,
  onToggleFavorite,
}: {
  route: RouteInfo;
  label: string;
  active: boolean;
  favorite: boolean;
  onPick: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 pl-1.5 pr-1 py-1 rounded border transition-colors',
        active
          ? 'bg-primary-500/10 border-primary-500/40'
          : 'border-transparent hover:bg-white/[0.04] hover:border-primary-500/30',
      )}
    >
      <button
        onClick={onPick}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        title={`${route.method} ${route.path}${route.controllerMethod ? ` -> ${route.controllerMethod}()` : ''}`}
      >
        <span
          className={cn(
            'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded w-12 text-center shrink-0',
            getMethodBgColor(route.method),
            getMethodColor(route.method),
          )}
        >
          {route.method}
        </span>
        <span className="text-xs font-mono text-gray-200 flex-1 truncate">{label}</span>
        {route.bodyDto && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary-500/10 border border-primary-500/30 text-primary-300 shrink-0">
            dto
          </span>
        )}
      </button>
      <button
        onClick={onToggleFavorite}
        aria-label={favorite ? 'Unpin route' : 'Pin route'}
        className={cn(
          'p-0.5 shrink-0 transition-opacity',
          favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <Star
          className={cn(
            'w-3 h-3',
            favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500 hover:text-yellow-400',
          )}
        />
      </button>
    </div>
  );
}
