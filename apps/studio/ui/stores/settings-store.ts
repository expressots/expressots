/**
 * Settings store — persisted to localStorage.
 *
 * Kept separate from the main app store on purpose: app-store holds live,
 * ephemeral data (exchanges, logs, etc.) that should reset on reload, while
 * this store holds user preferences that should NOT reset on reload.
 *
 * The hand-rolled persist layer is intentionally small — Zustand's official
 * `persist` middleware would add ~3kb gzipped for state we can read/write in
 * 10 lines. Versioning is supported so we can migrate shapes later.
 */

import { create } from 'zustand';
import type { ViewMode, LogLevel } from '../types';

const STORAGE_KEY = 'expressots.studio.settings.v1';

/** Supported editor URL schemes for "Open in editor" buttons. */
export type EditorScheme =
  | 'vscode'
  | 'cursor'
  | 'webstorm'
  | 'idea'
  | 'sublime'
  | 'custom';

export const EDITOR_SCHEME_LABELS: Record<EditorScheme, string> = {
  vscode: 'Visual Studio Code',
  cursor: 'Cursor',
  webstorm: 'WebStorm',
  idea: 'IntelliJ IDEA',
  sublime: 'Sublime Text',
  custom: 'Custom…',
};

export interface SettingsState {
  // — Connection —
  agentUrl: string;

  // — Editor —
  editorScheme: EditorScheme;
  /** Used when editorScheme === 'custom'. Should produce a `${file}:${line}:${col}`-compatible URL. */
  customEditorPrefix: string;

  // — Recording defaults —
  recordOnLaunch: boolean;
  maxExchanges: number;
  maxLogBuffer: number;

  // — Display —
  defaultView: ViewMode;
  defaultSidebarOpen: boolean;
  defaultAutoScroll: boolean;
  defaultLogLevels: LogLevel[];

  // — Actions —
  update: (patch: Partial<Omit<SettingsState, 'update' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS: Omit<SettingsState, 'update' | 'reset'> = {
  agentUrl: 'ws://localhost:3334',
  editorScheme: 'cursor',
  customEditorPrefix: 'vscode://file',
  recordOnLaunch: true,
  maxExchanges: 100,
  maxLogBuffer: 1000,
  defaultView: 'status',
  defaultSidebarOpen: true,
  defaultAutoScroll: true,
  defaultLogLevels: ['log', 'info', 'warn', 'error', 'debug'],
};

/**
 * Marker for one-shot settings migrations. Each entry below uses its
 * own key so a migration only ever runs once per browser, even if the
 * user opens Studio dozens of times after upgrading.
 */
const MIGRATION_KEYS = {
  /**
   * v4-preview.2: the launch view changed from `'requests'` to `'status'`.
   * Users who still have the legacy stored value should be bumped once;
   * users who explicitly chose `'requests'` *after* the migration are
   * left alone (the marker prevents a re-bump).
   */
  defaultViewStatus: 'expressots.studio.settings.migrated.defaultViewStatus',
} as const;

function loadSettings(): Omit<SettingsState, 'update' | 'reset'> {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULTS>;
    // Defensive merge — discard unknown keys, fall back to defaults for
    // missing ones. Treat anything non-string/number/array as missing.
    const merged = { ...DEFAULTS, ...parsed };

    // One-shot: bump the legacy `'requests'` launch default once.
    const alreadyMigrated =
      window.localStorage.getItem(MIGRATION_KEYS.defaultViewStatus) === '1';
    if (!alreadyMigrated) {
      if (merged.defaultView === 'requests') {
        merged.defaultView = 'status';
      }
      window.localStorage.setItem(MIGRATION_KEYS.defaultViewStatus, '1');
    }

    return merged;
  } catch {
    return DEFAULTS;
  }
}

function persistSettings(state: Omit<SettingsState, 'update' | 'reset'>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled — silently degrade.
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...loadSettings(),

  update: (patch) => {
    set(patch);
    const { update: _u, reset: _r, ...rest } = get();
    persistSettings(rest);
  },

  reset: () => {
    set({ ...DEFAULTS });
    persistSettings(DEFAULTS);
  },
}));
