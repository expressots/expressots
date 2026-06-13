import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { buildWarnings } from '../../lib/architecture/warnings';

export type WarningFilter = 'cycle' | 'orphan' | 'hub';

interface Props {
  onWarningClick?: (filter: WarningFilter) => void;
}

export function ArchitectureHealthStrip({ onWarningClick }: Props) {
  const structure = useAppStore((s) => s.structure);

  const { cycles, orphans, hubs, total } = useMemo(() => {
    if (!structure) return { cycles: 0, orphans: 0, hubs: 0, total: 0 };
    const warnings = buildWarnings(structure);
    let c = 0;
    let o = 0;
    let h = 0;
    for (const w of warnings.values()) {
      if (w.cycle) c++;
      if (w.orphan) o++;
      if (w.fanIn) h++;
    }
    const t =
      structure.controllers.length +
      structure.services.length +
      structure.providers.length +
      structure.middleware.length;
    return { cycles: c, orphans: o, hubs: h, total: t };
  }, [structure]);

  if (!structure) return null;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      {cycles > 0 && (
        <button
          onClick={() => onWarningClick?.('cycle')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-error-500/10 border border-error-500/30 text-error-300 hover:bg-error-500/20 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          {cycles} cycle{cycles === 1 ? '' : 's'}
        </button>
      )}
      {hubs > 0 && (
        <button
          onClick={() => onWarningClick?.('hub')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          {hubs} hub{hubs === 1 ? '' : 's'}
        </button>
      )}
      {orphans > 0 && (
        <button
          onClick={() => onWarningClick?.('orphan')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:bg-gray-500/20 transition-colors"
        >
          {orphans} orphan{orphans === 1 ? '' : 's'}
        </button>
      )}
      <span className="text-gray-600 ml-1">{total} artifact{total === 1 ? '' : 's'}</span>
    </div>
  );
}
