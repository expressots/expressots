/**
 * API Client store — persisted to localStorage.
 *
 * Holds sticky, per-user preferences for the API Client tab: how routes are
 * grouped, which routes are pinned (favorites), recently fired routes, the
 * per-group open/closed overrides, and the sidebar width. Kept separate from
 * `app-store` (which holds ephemeral live data) and modelled on the
 * hand-rolled persist layer in `settings-store.ts` to avoid pulling in
 * Zustand's `persist` middleware.
 *
 * Route identity uses the `routeKey(route)` helper (`METHOD path`) from
 * `../lib/resource-tags`.
 */

import { create } from 'zustand';

const STORAGE_KEY = 'expressots.studio.apiClient.v1';

/** How the route sidebar clusters routes. */
export type RouteGroupBy = 'resource' | 'controller' | 'method';

/** Most-recent routes kept; older entries fall off the list. */
const MAX_RECENTS = 8;

const DEFAULT_SIDEBAR_WIDTH = 300;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;

interface PersistedState {
  groupBy: RouteGroupBy;
  /** Route keys pinned to the top of the sidebar. */
  favorites: string[];
  /** Route keys most recently loaded into the composer, newest first. */
  recents: string[];
  /** Per-group open overrides keyed by group label; absent = use default. */
  groupOpen: Record<string, boolean>;
  /** Persisted sidebar width in pixels. */
  sidebarWidth: number;
}

export interface ApiClientState extends PersistedState {
  setGroupBy: (mode: RouteGroupBy) => void;
  toggleFavorite: (key: string) => void;
  isFavorite: (key: string) => boolean;
  addRecent: (key: string) => void;
  clearRecents: () => void;
  setGroupOpen: (group: string, open: boolean) => void;
  setSidebarWidth: (px: number) => void;
}

const DEFAULTS: PersistedState = {
  groupBy: 'resource',
  favorites: [],
  recents: [],
  groupOpen: {},
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
};

function clampWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(px)));
}

function load(): PersistedState {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const merged: PersistedState = { ...DEFAULTS, ...parsed };
    // Defensive normalisation: stored shapes can drift across versions.
    merged.favorites = Array.isArray(merged.favorites) ? merged.favorites : [];
    merged.recents = Array.isArray(merged.recents)
      ? merged.recents.slice(0, MAX_RECENTS)
      : [];
    merged.groupOpen =
      merged.groupOpen && typeof merged.groupOpen === 'object' ? merged.groupOpen : {};
    merged.sidebarWidth = clampWidth(merged.sidebarWidth);
    if (merged.groupBy !== 'resource' && merged.groupBy !== 'controller' && merged.groupBy !== 'method') {
      merged.groupBy = 'resource';
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

function persist(state: PersistedState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled — silently degrade.
  }
}

export const useApiClientStore = create<ApiClientState>((set, get) => {
  const save = () => {
    const { groupBy, favorites, recents, groupOpen, sidebarWidth } = get();
    persist({ groupBy, favorites, recents, groupOpen, sidebarWidth });
  };

  return {
    ...load(),

    setGroupBy: (mode) => {
      set({ groupBy: mode });
      save();
    },

    toggleFavorite: (key) => {
      const favorites = get().favorites.includes(key)
        ? get().favorites.filter((k) => k !== key)
        : [...get().favorites, key];
      set({ favorites });
      save();
    },

    isFavorite: (key) => get().favorites.includes(key),

    addRecent: (key) => {
      const recents = [key, ...get().recents.filter((k) => k !== key)].slice(0, MAX_RECENTS);
      set({ recents });
      save();
    },

    clearRecents: () => {
      set({ recents: [] });
      save();
    },

    setGroupOpen: (group, open) => {
      set({ groupOpen: { ...get().groupOpen, [group]: open } });
      save();
    },

    setSidebarWidth: (px) => {
      set({ sidebarWidth: clampWidth(px) });
      save();
    },
  };
});

export { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH };
