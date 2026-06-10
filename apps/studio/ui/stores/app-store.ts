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
  ContainerSnapshot,
  ContainerResolutions,
  LogEntry,
  LogLevel,
  RuntimeInfo,
  SecurityReport,
  FixProgressMessage,
  FixResultMessage,
  HttpMethod,
  DatabaseSnapshot,
  DatabaseTableData,
  OpenApiDocument,
  SpecDriftReport,
  SpecDriftError,
  CoverageReport,
  CoverageSource,
  CoverageRunProgressMessage,
  CoverageRunResultMessage,
  TestRunSummary,
} from '../types';

/**
 * Live transcript for an in-flight Apply-fix job. Lines accumulate as
 * the agent streams `fix_progress` frames; once `result` lands the
 * banner switches into final state and the rescan kicks in.
 */
export interface FixRunState {
  targetId: string;
  command: string;
  startedAt: number;
  lines: { stream: 'stdout' | 'stderr'; text: string; timestamp: number }[];
  result?: FixResultMessage;
}

/**
 * Live transcript for an in-flight "Run tests with coverage" job.
 * Mirrors `FixRunState`: lines accumulate from `coverage_run_progress`
 * frames; once `result` lands the banner switches to its final state and
 * a fresh `coverage` report follows.
 */
export interface CoverageRunState {
  startedAt: number;
  runner?: string;
  lines: { stream: 'stdout' | 'stderr'; text: string; timestamp: number }[];
  result?: CoverageRunResultMessage;
}

import { useSettings } from './settings-store';

const MAX_LOGS = 1000;

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
  containerSnapshot: ContainerSnapshot | null;
  /** Map from exchange id → list of resolved service identifiers for that request. */
  containerResolutionsByExchange: Record<string, string[]>;
  /** Runtime / app boot info for the Status dashboard. */
  runtime: RuntimeInfo | null;
  /**
   * Latest security report from the agent (supply-chain + runtime
   * posture). `null` until the first `security` WS message arrives.
   */
  securityReport: SecurityReport | null;
  /**
   * Live transcript of the currently-running (or just-finished)
   * Apply-fix job. Cleared on next user-initiated run.
   */
  fixRun: FixRunState | null;
  /**
   * In-memory database schema snapshot from the agent. `null` until the
   * first `database` WS message arrives; `available: false` when no
   * `InMemoryDBProvider` is registered.
   */
  databaseSnapshot: DatabaseSnapshot | null;
  /** Most recent page of rows for the table currently being browsed. */
  databaseTableData: DatabaseTableData | null;
  /**
   * Latest generated OpenAPI document from the agent's `get_openapi`
   * handler. `null` until the first `openapi` message arrives.
   */
  openApiDoc: OpenApiDocument | null;
  /**
   * Latest spec-drift result. Either a report or an error envelope when
   * the committed spec couldn't be read. `null` until first requested.
   */
  specDrift: SpecDriftReport | SpecDriftError | null;
  /**
   * Latest coverage report from the agent. `null` until the first
   * `coverage` message arrives; `scanState.missingArtifact` is true when
   * no coverage artifact has been produced yet.
   */
  coverageReport: CoverageReport | null;
  /** Source of the file currently open in the coverage source viewer. */
  coverageSource: CoverageSource | null;
  /** Live transcript of the current/just-finished coverage run, if any. */
  coverageRun: CoverageRunState | null;
  /** Latest parsed test-run results (distinct stream from coverage). */
  testResults: TestRunSummary | null;
  /** Live console.* stream from the host app (latest first). */
  logs: LogEntry[];
  /** Logs grouped by traceId, so TraceDetail can show "logs for this request". */
  logsByTraceId: Record<string, LogEntry[]>;
  /** Active level filters in the Logs view. */
  logLevelFilter: Set<LogLevel>;

  // UI state
  sidebarOpen: boolean;
  searchQuery: string;
  filterMethod: string | null;
  filterStatus: 'all' | 'success' | 'error';
  /**
   * Cross-view handoff: when set, the API Client picks this request up
   * on next mount, applies it to its inputs, and clears the slot. Used
   * by the Architecture Map's "Try in API Client" button so users go
   * straight from the diagram to a populated request.
   */
  pendingApiClientRequest: {
    method: HttpMethod;
    path: string;
    body?: Record<string, unknown>;
  } | null;
  /** Agent-side recording toggle (`set_recording` event). */
  recordingEnabled: boolean;
  /** Auto-scroll the request list to the newest entry. */
  autoScroll: boolean;
  /** Timestamp (ms) of the last live event — used to flash the "Live" badge. */
  lastEventAt: number | null;
  /** Round-trip latency to the agent in ms (most recent ping_studio sample). */
  agentLatencyMs: number | null;
  /** Total WebSocket messages received since the page loaded. */
  eventsReceived: number;

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
  setContainerSnapshot: (snapshot: ContainerSnapshot | null) => void;
  setContainerResolutions: (entry: ContainerResolutions) => void;
  setRuntime: (runtime: RuntimeInfo) => void;
  setSecurityReport: (report: SecurityReport) => void;
  setDatabaseSnapshot: (snapshot: DatabaseSnapshot | null) => void;
  setDatabaseTableData: (data: DatabaseTableData | null) => void;
  setOpenApiDoc: (doc: OpenApiDocument | null) => void;
  setSpecDrift: (drift: SpecDriftReport | SpecDriftError | null) => void;
  setCoverageReport: (report: CoverageReport) => void;
  setCoverageSource: (source: CoverageSource | null) => void;
  startCoverageRun: (runner?: string) => void;
  appendCoverageProgress: (msg: CoverageRunProgressMessage) => void;
  completeCoverageRun: (msg: CoverageRunResultMessage) => void;
  clearCoverageRun: () => void;
  setTestResults: (summary: TestRunSummary) => void;
  startFixRun: (targetId: string, command: string) => void;
  appendFixProgress: (msg: FixProgressMessage) => void;
  completeFixRun: (msg: FixResultMessage) => void;
  clearFixRun: () => void;
  addLog: (entry: LogEntry) => void;
  setLogs: (entries: LogEntry[]) => void;
  clearLogs: () => void;
  setLogLevelFilter: (levels: Set<LogLevel>) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterMethod: (method: string | null) => void;
  setFilterStatus: (status: 'all' | 'success' | 'error') => void;
  setPendingApiClientRequest: (
    req: { method: HttpMethod; path: string; body?: Record<string, unknown> } | null,
  ) => void;
  setRecordingEnabled: (enabled: boolean) => void;
  setAutoScroll: (enabled: boolean) => void;
  markLiveEvent: () => void;
  setAgentLatency: (ms: number) => void;
  incrementEventCount: () => void;
  clearExchanges: () => void;
  reset: () => void;
}

function buildInitialState() {
  // Seed from persisted user settings so that page-load preferences feel
  // sticky. Live data (exchanges, logs, etc.) intentionally stays empty.
  const s = useSettings.getState();
  return {
    connected: false,
    agentUrl: s.agentUrl,
    currentView: s.defaultView,
    selectedTraceId: null,
    selectedExchangeId: null,
    routes: [],
    traces: [],
    metrics: null,
    endpointStats: [],
    structure: null,
    exchanges: [],
    replayResult: null,
    containerSnapshot: null,
    containerResolutionsByExchange: {},
    runtime: null,
    securityReport: null,
    databaseSnapshot: null,
    databaseTableData: null,
    openApiDoc: null,
    specDrift: null,
    coverageReport: null,
    coverageSource: null,
    coverageRun: null,
    testResults: null,
    fixRun: null,
    logs: [],
    logsByTraceId: {},
    logLevelFilter: new Set<LogLevel>(s.defaultLogLevels),
    sidebarOpen: s.defaultSidebarOpen,
    searchQuery: '',
    filterMethod: null,
    filterStatus: 'all' as const,
    pendingApiClientRequest: null,
    recordingEnabled: true,
    autoScroll: s.defaultAutoScroll,
    lastEventAt: null,
    agentLatencyMs: null,
    eventsReceived: 0,
  };
}

const initialState = buildInitialState();

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
      lastEventAt: Date.now(),
    })),

  setReplayResult: (replayResult) => set({ replayResult }),

  setContainerSnapshot: (containerSnapshot) => set({ containerSnapshot }),

  setContainerResolutions: (entry) =>
    set((state) => ({
      containerResolutionsByExchange: {
        ...state.containerResolutionsByExchange,
        [entry.exchangeId]: entry.resolved,
      },
    })),

  setRuntime: (runtime) => set({ runtime }),

  setSecurityReport: (securityReport) => set({ securityReport }),

  setDatabaseSnapshot: (databaseSnapshot) => set({ databaseSnapshot }),
  setDatabaseTableData: (databaseTableData) => set({ databaseTableData }),

  setOpenApiDoc: (openApiDoc) => set({ openApiDoc }),
  setSpecDrift: (specDrift) => set({ specDrift }),

  setCoverageReport: (coverageReport) => set({ coverageReport }),
  setCoverageSource: (coverageSource) => set({ coverageSource }),

  startCoverageRun: (runner) =>
    set({
      coverageRun: {
        startedAt: Date.now(),
        runner,
        lines: [],
        result: undefined,
      },
    }),

  appendCoverageProgress: (msg) =>
    set((state) => {
      if (!state.coverageRun) return {};
      const next = [
        ...state.coverageRun.lines,
        { stream: msg.stream, text: msg.line, timestamp: msg.timestamp },
      ];
      const trimmed = next.length > 2000 ? next.slice(-2000) : next;
      return { coverageRun: { ...state.coverageRun, lines: trimmed } };
    }),

  completeCoverageRun: (msg) =>
    set((state) => {
      if (!state.coverageRun) return {};
      return { coverageRun: { ...state.coverageRun, result: msg } };
    }),

  clearCoverageRun: () => set({ coverageRun: null }),

  setTestResults: (testResults) => set({ testResults }),

  startFixRun: (targetId, command) =>
    set({
      fixRun: {
        targetId,
        command,
        startedAt: Date.now(),
        lines: [],
        result: undefined,
      },
    }),

  appendFixProgress: (msg) =>
    set((state) => {
      // Drop progress for stale targets (a previous run that's still
      // draining after the user kicked off a new one).
      if (!state.fixRun || state.fixRun.targetId !== msg.targetId) {
        return {};
      }
      // Cap the transcript so a runaway `npm install` can't grow the
      // store unbounded. The agent already truncates on its side, but
      // belt-and-braces.
      const next = [
        ...state.fixRun.lines,
        { stream: msg.stream, text: msg.line, timestamp: msg.timestamp },
      ];
      const trimmed = next.length > 2000 ? next.slice(-2000) : next;
      return {
        fixRun: { ...state.fixRun, lines: trimmed },
      };
    }),

  completeFixRun: (msg) =>
    set((state) => {
      if (!state.fixRun || state.fixRun.targetId !== msg.targetId) {
        return {};
      }
      return {
        fixRun: { ...state.fixRun, result: msg },
      };
    }),

  clearFixRun: () => set({ fixRun: null }),

  addLog: (entry) =>
    set((state) => {
      // Newest-first global stream, capped to MAX_LOGS.
      const logs = [entry, ...state.logs].slice(0, MAX_LOGS);

      // Per-traceId index (only when we have a traceId — anonymous logs
      // still show up in the global stream).
      let logsByTraceId = state.logsByTraceId;
      if (entry.traceId) {
        const existing = logsByTraceId[entry.traceId] ?? [];
        logsByTraceId = {
          ...logsByTraceId,
          [entry.traceId]: [...existing, entry],
        };
      }

      return { logs, logsByTraceId, lastEventAt: Date.now() };
    }),

  setLogs: (entries) =>
    set(() => {
      // Replace the buffer wholesale (used when the agent replays its
      // ring buffer on connect). Preserve newest-first ordering.
      const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
      const byTrace: Record<string, LogEntry[]> = {};
      for (const e of entries) {
        if (!e.traceId) continue;
        if (!byTrace[e.traceId]) byTrace[e.traceId] = [];
        byTrace[e.traceId].push(e);
      }
      return {
        logs: sorted.slice(0, MAX_LOGS),
        logsByTraceId: byTrace,
      };
    }),

  clearLogs: () =>
    set({
      logs: [],
      logsByTraceId: {},
    }),

  setLogLevelFilter: (logLevelFilter) => set({ logLevelFilter }),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterMethod: (filterMethod) => set({ filterMethod }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),

  setPendingApiClientRequest: (pendingApiClientRequest) =>
    set({ pendingApiClientRequest }),

  setRecordingEnabled: (recordingEnabled) => set({ recordingEnabled }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  markLiveEvent: () => set({ lastEventAt: Date.now() }),
  setAgentLatency: (ms) => set({ agentLatencyMs: ms }),
  incrementEventCount: () =>
    set((state) => ({ eventsReceived: state.eventsReceived + 1 })),

  clearExchanges: () =>
    set({
      exchanges: [],
      traces: [],
      selectedExchangeId: null,
      replayResult: null,
      containerResolutionsByExchange: {},
    }),

  reset: () => set(buildInitialState()),
}));
