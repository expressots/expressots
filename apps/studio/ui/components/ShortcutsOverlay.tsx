/**
 * Keyboard shortcuts cheat-sheet overlay.
 *
 * Reads the canonical list from `use-keyboard-shortcuts.ts` so the docs
 * never drift from the actual handler.
 */

import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS, type ShortcutDescriptor } from '../hooks/use-keyboard-shortcuts';

const CATEGORY_ORDER: ShortcutDescriptor['category'][] = [
  'Navigation',
  'Lists',
  'Detail',
  'Help',
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: SHORTCUTS.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative studio-card shadow-elevated w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-panel-header px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary-400" />
            <h2 className="text-base font-semibold text-white">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {grouped.map((group) => (
            <div key={group.category}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {group.category}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.combo + item.description} className="flex items-center gap-3 text-sm">
                    <KeyCombo combo={item.combo} />
                    <span className="text-gray-300">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-800 text-xs text-gray-500">
          Press <KeyCombo combo="?" /> any time to toggle this overlay.
        </div>
      </div>
    </div>
  );
}

function KeyCombo({ combo }: { combo: string }) {
  // Split on `+` to render each chord as its own pill; for sequences like
  // "G then R" we keep the natural-language phrase as one pill.
  const parts = combo.includes(' then ') ? [combo] : combo.split('+');
  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-800 border border-gray-700 rounded text-gray-300 min-w-[24px] text-center"
        >
          {part.trim()}
        </kbd>
      ))}
    </span>
  );
}
