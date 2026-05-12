/**
 * Global keyboard shortcut handler.
 *
 * Wires `keydown` against `window` so any focus state still allows the
 * user to escape (Esc) or open help (?). Most other shortcuts skip when
 * the user is typing in an input/textarea so we don't break their typing.
 */

import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export interface ShortcutDescriptor {
  /** Human-readable key combo (e.g. "Cmd+K"). Shown in the help overlay. */
  combo: string;
  /** Short description. */
  description: string;
  /** Category bucket for grouping in the overlay. */
  category: 'Navigation' | 'Lists' | 'Detail' | 'Help';
}

export const SHORTCUTS: ShortcutDescriptor[] = [
  { combo: '?',          description: 'Toggle keyboard shortcuts overlay',  category: 'Help' },
  { combo: 'Esc',        description: 'Close open panel or overlay',        category: 'Help' },
  { combo: '/',          description: 'Focus the search / filter input',    category: 'Lists' },
  { combo: 'Cmd/Ctrl+K', description: 'Focus the search / filter input',    category: 'Lists' },
  { combo: 'J',          description: 'Select next request',                category: 'Lists' },
  { combo: 'K',          description: 'Select previous request',            category: 'Lists' },
  { combo: 'Enter',      description: 'Open the selected request',          category: 'Lists' },
  { combo: 'Cmd/Ctrl+R', description: 'Rescan routes / refresh',            category: 'Navigation' },
  { combo: 'G then R',   description: 'Go to Requests',                     category: 'Navigation' },
  { combo: 'G then L',   description: 'Go to Logs',                         category: 'Navigation' },
  { combo: 'G then A',   description: 'Go to API Client',                   category: 'Navigation' },
  { combo: 'G then M',   description: 'Go to Metrics',                      category: 'Navigation' },
  { combo: 'G then C',   description: 'Go to Container',                    category: 'Navigation' },
  { combo: 'G then X',   description: 'Go to Architecture',                 category: 'Navigation' },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Try to focus the visible search/filter input. We hunt by placeholder text
 * which works across our views without forcing each one to expose a ref.
 */
function focusSearchInput(): boolean {
  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])'),
  );
  const match = candidates.find((el) => {
    const ph = (el.placeholder || '').toLowerCase();
    return /filter|search/.test(ph);
  });
  if (match) {
    match.focus();
    match.select();
    return true;
  }
  return false;
}

interface Options {
  onToggleHelp: () => void;
  onCloseAll: () => void;
}

export function useKeyboardShortcuts({ onToggleHelp, onCloseAll }: Options) {
  const {
    exchanges,
    selectedExchangeId,
    setSelectedExchangeId,
    setCurrentView,
  } = useAppStore();

  useEffect(() => {
    // Two-key sequence support (`G` then `R/L/...`). We hold the leader key
    // briefly to avoid hijacking single-key actions.
    let leader: 'g' | null = null;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;
    const armLeader = () => {
      leader = 'g';
      if (leaderTimer) clearTimeout(leaderTimer);
      leaderTimer = setTimeout(() => {
        leader = null;
      }, 800);
    };
    const disarmLeader = () => {
      leader = null;
      if (leaderTimer) {
        clearTimeout(leaderTimer);
        leaderTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Esc and ? are always reachable, even mid-typing.
      if (e.key === 'Escape') {
        onCloseAll();
        return;
      }
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // Block other shortcuts while user is typing.
      if (isTypingTarget(e.target)) return;

      const cmd = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K or '/' → focus filter
      if ((cmd && e.key.toLowerCase() === 'k') || e.key === '/') {
        if (focusSearchInput()) {
          e.preventDefault();
        }
        return;
      }

      // Cmd/Ctrl+R → rescan / refresh. Browser default reloads the page,
      // which is also fine, but we let it through and just trigger a
      // rescan signal too via a custom event. Avoid preventDefault here.
      if (cmd && e.key.toLowerCase() === 'r') {
        // We don't intercept reload — user expects browser behaviour.
        return;
      }

      // `G` leader sequence
      if (e.key.toLowerCase() === 'g' && !cmd && !e.altKey && !e.shiftKey) {
        armLeader();
        return;
      }
      if (leader === 'g') {
        const mapping: Record<string, () => void> = {
          r: () => setCurrentView('requests'),
          l: () => setCurrentView('logs'),
          a: () => setCurrentView('api-client'),
          m: () => setCurrentView('metrics'),
          c: () => setCurrentView('container'),
          x: () => setCurrentView('architecture'),
          p: () => setCurrentView('replay'),
        };
        const action = mapping[e.key.toLowerCase()];
        if (action) {
          e.preventDefault();
          disarmLeader();
          action();
          return;
        }
        // Any other key cancels the leader.
        disarmLeader();
      }

      // J / K — navigate the request list
      if ((e.key === 'j' || e.key === 'k') && !cmd && !e.altKey) {
        if (exchanges.length === 0) return;
        const currentIdx = selectedExchangeId
          ? exchanges.findIndex((ex) => ex.id === selectedExchangeId)
          : -1;
        let nextIdx: number;
        if (e.key === 'j') {
          // J = next row visually. Our list is newest-first, so "next" =
          // older = higher index.
          nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, exchanges.length - 1);
        } else {
          nextIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
        }
        const next = exchanges[nextIdx];
        if (next) {
          e.preventDefault();
          setSelectedExchangeId(next.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (leaderTimer) clearTimeout(leaderTimer);
    };
  }, [exchanges, selectedExchangeId, setSelectedExchangeId, setCurrentView, onToggleHelp, onCloseAll]);
}
