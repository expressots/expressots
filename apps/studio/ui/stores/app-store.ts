/**
 * Main application store using Zustand
 */

import { create } from 'zustand';
import type {
  RouteInfo,
  TraceInfo,
  AppMetrics,
  EndpointStats,
  AppStructure,
  RecordedExchange,
  ReplayResultPayload,
  ViewMode,
} from '../types';

interface AppState {
  // Connection
  connected: boolean;
  agentUrl: string;

  // View state
  currentView: ViewMode;
  selectedTraceId: string | null;
  selectedExchangeId: string | null;

  // Data
  routes: RouteInfo[];
  traces: TraceInfo[];
  metrics: AppMetrics | null;
  endpointStats: EndpointStats[];
  structure: AppStructure | null;
  exchanges: RecordedExchange[];
  replayResult: ReplayResultPayload | null;

  // UI state
  sidebarOpen: boolean;
  searchQuery: string;
  filterMethod: string | null;
  filterStatus: 'all' | 'success' | 'error';

  // Actions
  setConnected: (connected: boolean) => void;
  setAgentUrl: (url: string) => void;
  setCurrentView: (view: ViewMode) => void;
  setSelectedTraceId: (id: string | null) => void;
  setSelectedExchangeId: (id: string | null) => void;
  setRoutes: (routes: RouteInfo[]) => void;
  addTrace: (trace: TraceInfo) => void;
  setTraces: (traces: TraceInfo[]) => void;
  setMetrics: (metrics: AppMetrics) => void;
  setEndpointStats: (stats: EndpointStats[]) => void;
  setStructure: (structure: AppStructure) => void;
  setExchanges: (exchanges: RecordedExchange[]) => void;
  addExchange: (exchange: RecordedExchange) => void;
  setReplayResult: (result: ReplayResultPayload | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterMethod: (method: string | null) => void;
  setFilterStatus: (status: 'all' | 'success' | 'error') => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  agentUrl: 'ws://localhost:3334',
  currentView: 'requests' as ViewMode,
  selectedTraceId: null,
  selectedExchangeId: null,
  routes: [],
  traces: [],
  metrics: null,
  endpointStats: [],
  structure: null,
  exchanges: [],
  replayResult: null,
  sidebarOpen: true,
  searchQuery: '',
  filterMethod: null,
  filterStatus: 'all' as const,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setAgentUrl: (agentUrl) => set({ agentUrl }),
  setCurrentView: (currentView) => set({ currentView }),
  setSelectedTraceId: (selectedTraceId) => set({ selectedTraceId }),
  setSelectedExchangeId: (selectedExchangeId) => set({ selectedExchangeId }),
  
  setRoutes: (routes) => set({ routes }),
  
  addTrace: (trace) =>
    set((state) => ({
      traces: [trace, ...state.traces].slice(0, 100), // Keep last 100 traces
    })),
  
  setTraces: (traces) => set({ traces }),
  setMetrics: (metrics) => set({ metrics }),
  setEndpointStats: (endpointStats) => set({ endpointStats }),
  setStructure: (structure) => set({ structure }),
  setExchanges: (exchanges) => set({ exchanges }),
  
  addExchange: (exchange) =>
    set((state) => ({
      exchanges: [exchange, ...state.exchanges].slice(0, 100),
    })),

  setReplayResult: (replayResult) => set({ replayResult }),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterMethod: (filterMethod) => set({ filterMethod }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  
  reset: () => set(initialState),
}));
