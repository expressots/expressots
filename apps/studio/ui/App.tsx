/**
 * Main App Component for ExpressoTS Studio
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './stores/app-store';
import { SocketProvider } from './contexts/socket-context';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import {
  Layout,
  RequestList,
  TraceDetail,
  ArchitectureMap,
  MetricsDashboard,
  ReplayView,
  ApiClient,
  ContainerInspector,
  LogsView,
  StatusDashboard,
  SecurityView,
} from './components';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';

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
      {renderView()}
      {selectedExchangeId && <TraceDetail />}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </Layout>
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
