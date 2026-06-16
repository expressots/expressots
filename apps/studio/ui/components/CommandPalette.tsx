/**
 * CommandPalette - fast fuzzy "jump to route" overlay (Cmd/Ctrl+K).
 *
 * Lists every discovered route and filters by a space-separated query matched
 * against method, path, controller, and handler. Enter loads the route into
 * the API Client composer (via the `pendingApiClientRequest` handoff) and
 * switches to that view, so the palette works from anywhere in Studio.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn, getMethodBgColor, getMethodColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { useApiClientStore } from '../stores/api-client-store';
import { routeKey } from '../lib/resource-tags';
import type { RouteInfo } from '../types';

const MAX_RESULTS = 60;

function score(route: RouteInfo, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack =
    `${route.method} ${route.path} ${route.controller ?? ''} ${route.controllerMethod ?? ''}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const routes = useAppStore((s) => s.routes);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPending = useAppStore((s) => s.setPendingApiClientRequest);
  const addRecent = useApiClientStore((s) => s.addRecent);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return routes.filter((r) => score(r, tokens)).slice(0, MAX_RESULTS);
  }, [routes, query]);

  // Keep the active index in range as results change.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  const select = (route: RouteInfo | undefined) => {
    if (!route) return;
    setPending({ method: route.method, path: route.path, body: route.bodySample });
    addRecent(routeKey(route));
    setCurrentView('api-client');
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll the active row into view when navigating with the keyboard.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-6 pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative studio-card shadow-elevated w-full max-w-xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a route by method, path, or handler…"
            className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-600 font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700 rounded text-gray-400">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-auto py-1">
          {results.length === 0 ? (
            <p className="text-xs text-gray-500 italic px-3 py-6 text-center">
              {routes.length === 0 ? 'No routes discovered yet.' : `No routes match "${query}".`}
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${routeKey(r)}-${i}`}
                data-idx={i}
                onClick={() => select(r)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-left',
                  i === active ? 'bg-primary-500/10' : 'hover:bg-white/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded w-12 text-center shrink-0',
                    getMethodBgColor(r.method),
                    getMethodColor(r.method),
                  )}
                >
                  {r.method}
                </span>
                <span className="text-xs font-mono text-gray-200 flex-1 truncate">{r.path}</span>
                {r.controller && r.controller !== 'Unknown' && (
                  <span className="text-[10px] font-mono text-gray-500 truncate max-w-[40%]">
                    {r.controller}
                  </span>
                )}
                {i === active && <CornerDownLeft className="w-3 h-3 text-gray-500 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
