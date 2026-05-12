/**
 * Main App Component for ExpressoTS Studio
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './stores/app-store';
import { SocketProvider } from './contexts/socket-context';
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
} from './components';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { currentView, selectedExchangeId } = useAppStore();

  const renderView = () => {
    switch (currentView) {
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
      default:
        return <RequestList />;
    }
  };

  return (
    <Layout>
      {renderView()}
      {selectedExchangeId && <TraceDetail />}
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
