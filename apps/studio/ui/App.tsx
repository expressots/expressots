/**
 * Main App Component for ExpressoTS Studio
 */

import { Suspense, lazy, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './stores/app-store';
import { SocketProvider } from './contexts/socket-context';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
// The layout shell is always needed, so it stays in the entry bundle.
import { Layout } from './components/Layout';

/**
 * Views are lazy-loaded so the heavy, view-specific dependencies stay out
 * of the initial download and only fetch when a tab is first opened:
 *   - recharts            → Metrics
 *   - @xyflow/react        → Architecture + Container
 *   - the large Security view code
 * Each `import()` becomes its own async chunk.
 */
const StatusDashboard = lazy(() =>
  import('./components/StatusDashboard').then((m) => ({ default: m.StatusDashboard })),
);
const RequestList = lazy(() =>
  import('./components/RequestList').then((m) => ({ default: m.RequestList })),
);
const ArchitectureMap = lazy(() =>
  import('./components/ArchitectureMap').then((m) => ({ default: m.ArchitectureMap })),
);
const MetricsDashboard = lazy(() =>
  import('./components/MetricsDashboard').then((m) => ({ default: m.MetricsDashboard })),
);
const ReplayView = lazy(() =>
  import('./components/ReplayView').then((m) => ({ default: m.ReplayView })),
);
const ApiClient = lazy(() =>
  import('./components/ApiClient').then((m) => ({ default: m.ApiClient })),
);
const ContainerInspector = lazy(() =>
  import('./components/ContainerInspector').then((m) => ({ default: m.ContainerInspector })),
);
const LogsView = lazy(() =>
  import('./components/LogsView').then((m) => ({ default: m.LogsView })),
);
const SecurityView = lazy(() =>
  import('./components/SecurityView').then((m) => ({ default: m.SecurityView })),
);
const DatabaseView = lazy(() =>
  import('./components/DatabaseView').then((m) => ({ default: m.DatabaseView })),
);
const TraceDetail = lazy(() =>
  import('./components/TraceDetail').then((m) => ({ default: m.TraceDetail })),
);
const ShortcutsOverlay = lazy(() =>
  import('./components/ShortcutsOverlay').then((m) => ({ default: m.ShortcutsOverlay })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { currentView, selectedExchangeId, setSelectedExchangeId } = useAppStore();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts({
    onToggleHelp: () => setShowShortcuts((v) => !v),
    onCloseAll: () => {
      // Esc closes the shortcuts overlay first, then any open detail panel.
      if (showShortcuts) {
        setShowShortcuts(false);
      } else if (selectedExchangeId) {
        setSelectedExchangeId(null);
      }
    },
  });

  const renderView = () => {
    switch (currentView) {
      case 'status':
        return <StatusDashboard />;
      case 'requests':
        return <RequestList />;
      case 'architecture':
        return <ArchitectureMap />;
      case 'metrics':
        return <MetricsDashboard />;
      case 'replay':
        return <ReplayView />;
      case 'api-client':
        return <ApiClient />;
      case 'container':
        return <ContainerInspector />;
      case 'database':
        return <DatabaseView />;
      case 'logs':
        return <LogsView />;
      case 'security':
        return <SecurityView />;
      default:
        return <RequestList />;
    }
  };

  return (
    <Layout>
      <Suspense fallback={<ViewFallback />}>
        <div key={currentView} className="studio-view">
          {renderView()}
        </div>
      </Suspense>
      {selectedExchangeId && (
        <Suspense fallback={null}>
          <TraceDetail />
        </Suspense>
      )}
      {showShortcuts && (
        <Suspense fallback={null}>
          <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
        </Suspense>
      )}
    </Layout>
  );
}

/** Lightweight placeholder shown while a view chunk is fetched. */
function ViewFallback() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="spinner" />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </QueryClientProvider>
  );
}
