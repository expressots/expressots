import { useState, useEffect } from 'react';
import { Boxes, GitBranch, Network } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { ArchitectureHealthStrip, type WarningFilter } from './ArchitectureHealthStrip';
import { ArchitectureLegend } from './ArchitectureLegend';
import { ModuleOverviewLens } from './ModuleOverviewLens';
import { RequestFlowLens } from './RequestFlowLens';
import { ExploreLens } from './ExploreLens';

export type ArchitectureLens = 'overview' | 'flow' | 'explore';

const LENS_STORAGE_KEY = 'expressots.studio.architectureLens';

const VALID_LENSES: ArchitectureLens[] = ['overview', 'flow', 'explore'];

const lensItems: Array<{ id: ArchitectureLens; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Boxes className="w-4 h-4" /> },
  { id: 'flow', label: 'Request Flow', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'explore', label: 'Explore', icon: <Network className="w-4 h-4" /> },
];

function loadPersistedLens(): ArchitectureLens {
  try {
    const stored = localStorage.getItem(LENS_STORAGE_KEY);
    if (stored && VALID_LENSES.includes(stored as ArchitectureLens)) {
      return stored as ArchitectureLens;
    }
  } catch {
    // localStorage unavailable
  }
  return 'overview';
}

export function ArchitectureView() {
  const structure = useAppStore((s) => s.structure);
  const pendingContext = useAppStore((s) => s.pendingArchitectureContext);
  const setPendingArchitectureContext = useAppStore((s) => s.setPendingArchitectureContext);

  const [activeLens, setActiveLens] = useState<ArchitectureLens>(loadPersistedLens);
  const [exploreNodeId, setExploreNodeId] = useState<string | undefined>();
  const [exploreWarningFilter, setExploreWarningFilter] = useState<WarningFilter | undefined>();

  const setSelectedExchangeId = useAppStore((s) => s.setSelectedExchangeId);

  // Consume pending cross-view handoff on mount.
  useEffect(() => {
    if (!pendingContext) return;
    const lens = VALID_LENSES.includes(pendingContext.lens as ArchitectureLens)
      ? (pendingContext.lens as ArchitectureLens)
      : 'overview';
    setActiveLens(lens);
    if (pendingContext.nodeId) setExploreNodeId(pendingContext.nodeId);
    if (pendingContext.warningFilter) setExploreWarningFilter(pendingContext.warningFilter);
    if (pendingContext.exchangeId) setSelectedExchangeId(pendingContext.exchangeId);
    setPendingArchitectureContext(null);
  }, [pendingContext, setPendingArchitectureContext, setSelectedExchangeId]);

  const switchLens = (lens: ArchitectureLens) => {
    setActiveLens(lens);
    try {
      localStorage.setItem(LENS_STORAGE_KEY, lens);
    } catch {
      // ignore
    }
  };

  const handleWarningClick = (filter: WarningFilter) => {
    setExploreWarningFilter(filter);
    switchLens('explore');
  };

  const handleSwitchToFlow = () => {
    switchLens('flow');
  };

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
        <GitBranch className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No architecture data available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view the architecture</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: lens tabs + legend + health strip */}
      <div className="studio-card p-2.5 flex items-center gap-3 flex-wrap">
        <div className="studio-segment">
          {lensItems.map((item) => (
            <button
              key={item.id}
              onClick={() => switchLens(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                activeLens === item.id
                  ? 'studio-segment-btn-active'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <ArchitectureLegend />
        <div className="ml-auto">
          <ArchitectureHealthStrip onWarningClick={handleWarningClick} />
        </div>
      </div>

      {/* Active lens */}
      {activeLens === 'overview' && (
        <ModuleOverviewLens onSwitchToFlow={handleSwitchToFlow} />
      )}
      {activeLens === 'flow' && <RequestFlowLens />}
      {activeLens === 'explore' && (
        <ExploreLens
          initialNodeId={exploreNodeId}
          initialWarningFilter={exploreWarningFilter}
        />
      )}
    </div>
  );
}
