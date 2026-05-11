/**
 * Small dropdown menu attached to a request row that exports the exchange
 * as cURL / JS fetch / OpenAPI 3.1 snippet and copies it to the clipboard.
 */

import { useEffect, useRef, useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import {
  formatExchange,
  copyToClipboard,
  type ExportFormat,
} from '../lib/format-request';
import type { RecordedExchange } from '../types';

const FORMATS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: 'curl', label: 'Copy as cURL', hint: 'Terminal-ready command' },
  { id: 'fetch', label: 'Copy as fetch()', hint: 'JavaScript / TypeScript' },
  { id: 'openapi', label: 'Copy as OpenAPI', hint: 'OpenAPI 3.1 path fragment' },
];

interface ExportMenuProps {
  exchange: RecordedExchange;
  /** Compact mode shows just a 3-dot trigger, otherwise a labeled button. */
  compact?: boolean;
}

export function ExportMenu({ exchange, compact = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleCopy(e: React.MouseEvent, format: ExportFormat) {
    e.stopPropagation();
    const text = formatExchange(exchange, format);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(format);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          compact
            ? 'p-1 text-gray-500 hover:text-primary-400 rounded'
            : 'flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded'
        }
        title="Export this request"
      >
        <Copy className="w-4 h-4" />
        {!compact && (
          <>
            <span>Export</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 py-1">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={(e) => handleCopy(e, f.id)}
              className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm text-white">{f.label}</div>
                <div className="text-[10px] text-gray-500">{f.hint}</div>
              </div>
              {copied === f.id && (
                <Check className="w-4 h-4 text-primary-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
