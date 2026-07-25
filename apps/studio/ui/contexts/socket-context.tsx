/**
 * Socket Context - Singleton socket connection
 */

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../stores/app-store';
import type {
  WSMessage,
  TraceInfo,
  RouteInfo,
  AppMetrics,
  AppStructure,
  RecordedExchange,
  RecordedRequest,
  EndpointStats,
  ReplayResultPayload,
  ContainerSnapshot,
  ContainerResolutions,
  LogEntry,
  RuntimeInfo,
  SecurityReport,
  FixProgressMessage,
  FixResultMessage,
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
  ApiProxyRequest,
  ApiProxyResponse,
} from '../types';

interface SocketContextValue {
  emit: (event: string, data?: unknown) => void;
  /**
   * Dispatch an API Client request through the agent (server-side) and
   * await the response. The agent performs the HTTP call in-process with
   * the user's app, so the browser is never blocked by the app's CORS
   * policy. Rejects if disconnected or if no response arrives in time.
   */
  sendApiRequest: (req: ApiProxyRequest) => Promise<ApiProxyResponse>;
  requestRoutes: () => void;
  requestMetrics: () => void;
  requestStructure: () => void;
  requestExchanges: (limit?: number, offset?: number) => void;
  requestExchange: (id: string) => void;
  searchExchanges: (query: string, method?: string, limit?: number) => void;
  replayRequest: (exchangeId: string) => void;
  rescan: () => void;
  clearRecordings: () => void;
  setRecording: (enabled: boolean) => void;
  requestEndpointStats: () => void;
  requestContainer: () => void;
  /** Re-capture the DI container snapshot (forces agent-side rescan). */
  refreshContainer: () => void;
  requestLogs: () => void;
  clearLogs: () => void;
  requestRuntime: () => void;
  /** Re-request the in-memory database schema snapshot. */
  requestDatabaseSchema: () => void;
  /** Request a page of rows for a single in-memory database table. */
  requestDatabaseTable: (table: string, offset?: number, limit?: number) => void;
  /** Ask the agent to (re)generate the full-app OpenAPI document. */
  requestOpenApi: (apiVersion?: string | number) => void;
  /**
   * Ask the agent to diff a committed spec against the live app. Pass the
   * parsed spec inline (`spec`) or a `specPath` for the agent to read.
   */
  requestOpenApiDrift: (params?: {
    spec?: Record<string, unknown>;
    specPath?: string;
    apiVersion?: string | number;
  }) => void;
  /** Re-run the supply-chain scan (`npm audit` + OSV) on the agent. */
  requestSecurityScan: () => void;
  /** Ask the agent to (re)broadcast its current cached security report. */
  requestSecurityReport: () => void;
  /**
   * Ask the agent to spawn an Apply-fix run for either a single finding
   * (`targetKind: 'finding'`) or a fix group (`targetKind: 'fix-group'`).
   * Progress streams over `fix_progress`; the final state arrives via
   * `fix_result` and the engine triggers a full rescan automatically.
   */
  applyFix: (input: {
    targetKind: 'finding' | 'fix-group';
    targetId: string;
    command: string;
    allowMajor?: boolean;
  }) => void;
  /** Ask the agent to (re)broadcast its current cached coverage report. */
  requestCoverageReport: () => void;
  /** Ask the agent to re-detect + re-parse the coverage artifact. */
  requestCoverageScan: () => void;
  /** Fetch a single annotated source file for the coverage viewer. */
  requestCoverageSource: (relPath: string) => void;
  /**
   * Ask the agent to run the project's tests with coverage enabled.
   * Progress streams over `coverage_run_progress`; the final state
   * arrives via `coverage_run_result` and a fresh `coverage` report
   * follows automatically.
   */
  runCoverage: (runner?: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const {
    agentUrl,
    setConnected,
    setRoutes,
    addTrace,
    setMetrics,
    setStructure,
    setExchanges,
    setEndpointStats,
    addExchange,
    setReplayResult,
    setContainerSnapshot,
    setContainerResolutions,
    setRecordingEnabled,
    markLiveEvent,
    clearExchanges,
    addLog,
    setLogs,
    clearLogs: clearLogsLocal,
    setAgentLatency,
    incrementEventCount,
    setRuntime,
    setSecurityReport,
    setDatabaseSnapshot,
    setDatabaseTableData,
    setOpenApiDoc,
    setSpecDrift,
    startFixRun,
    appendFixProgress,
    completeFixRun,
    setCoverageReport,
    setCoverageSource,
    startCoverageRun,
    appendCoverageProgress,
    completeCoverageRun,
    setTestResults,
  } = useAppStore();

  // Handle incoming messages
  const handleMessage = useCallback((message: WSMessage) => {
    incrementEventCount();
    switch (message.type) {
      case 'routes':
        setRoutes(message.data as RouteInfo[]);
        break;
      case 'trace':
        addTrace(message.data as TraceInfo);
        break;
      case 'metrics':
        setMetrics(message.data as AppMetrics);
        break;
      case 'structure': {
        // Older Studio Agents (pre-middleware-nodes) emit `middleware`
        // as `string[]`. Coerce to the new `MiddlewareInfo[]` shape so
        // the architecture map and other consumers see a consistent
        // type regardless of agent version.
        const raw = message.data as AppStructure & {
          middleware: AppStructure['middleware'] | string[];
        };
        const normalised: AppStructure = {
          ...raw,
          middleware: Array.isArray(raw.middleware)
            ? raw.middleware.map((entry) =>
                typeof entry === 'string'
                  ? {
                      name: entry,
                      filePath: '',
                      dependencies: [],
                      methods: [],
                      scope: 'unknown' as const,
                    }
                  : entry,
              )
            : [],
        };
        setStructure(normalised);
        break;
      }
      case 'exchanges':
        setExchanges(message.data as RecordedExchange[]);
        break;
      case 'endpoint_stats':
        setEndpointStats(message.data as EndpointStats[]);
        break;
      case 'exchange':
        // Single exchange update - could merge into existing
        break;
      case 'request': {
        // Real-time request notification - add to exchanges
        const requestData = message.data as {
          request: RecordedRequest;
          response: { statusCode: number; duration: number };
        };
        if (requestData.request) {
          const exchange = {
            id: requestData.request.id,
            request: requestData.request,
            response: {
              id: '',
              requestId: requestData.request.id,
              traceId: requestData.request.traceId || '',
              timestamp: Date.now(),
              statusCode: requestData.response.statusCode,
              statusMessage: requestData.response.statusCode < 400 ? 'OK' : 'Error',
              headers: {},
              duration: requestData.response.duration,
            },
          };
          addExchange(exchange);
          markLiveEvent();
        }
        break;
      }
      case 'recording_state':
        setRecordingEnabled(
          Boolean((message.data as { enabled: boolean })?.enabled),
        );
        break;
      case 'cleared':
        // Server confirmed recordings were wiped — reset local mirror.
        clearExchanges();
        break;
      case 'replay_result': {
        const payload = message.data as Omit<ReplayResultPayload, 'replayedAt'>;
        setReplayResult({ ...payload, replayedAt: Date.now() });
        break;
      }
      case 'container':
        setContainerSnapshot(message.data as ContainerSnapshot | null);
        break;
      case 'container_resolutions':
        setContainerResolutions(message.data as ContainerResolutions);
        break;
      case 'log':
        addLog(message.data as LogEntry);
        break;
      case 'logs':
        // Bulk replay sent by the agent on (re)connect.
        setLogs(message.data as LogEntry[]);
        break;
      case 'logs_cleared':
        clearLogsLocal();
        break;
      case 'pong_studio': {
        const data = message.data as { sentAt?: number };
        if (data?.sentAt) {
          const rtt = Date.now() - data.sentAt;
          if (rtt >= 0 && rtt < 60000) setAgentLatency(rtt);
        }
        break;
      }
      case 'runtime':
        setRuntime(message.data as RuntimeInfo);
        break;
      case 'security':
        setSecurityReport(message.data as SecurityReport);
        break;
      // Scan state is delivered inside SecurityReport.scanState; no
      // separate message type is needed.
      case 'fix_progress':
        appendFixProgress(message.data as FixProgressMessage);
        break;
      case 'fix_result':
        completeFixRun(message.data as FixResultMessage);
        break;
      case 'database':
        setDatabaseSnapshot(message.data as DatabaseSnapshot);
        break;
      case 'database_table':
        setDatabaseTableData(message.data as DatabaseTableData);
        break;
      case 'openapi':
        setOpenApiDoc(message.data as OpenApiDocument);
        break;
      case 'openapi_drift':
        setSpecDrift(message.data as SpecDriftReport | SpecDriftError);
        break;
      case 'coverage':
        setCoverageReport(message.data as CoverageReport);
        break;
      case 'coverage_source':
        setCoverageSource(message.data as CoverageSource);
        break;
      case 'coverage_run_progress':
        appendCoverageProgress(message.data as CoverageRunProgressMessage);
        break;
      case 'coverage_run_result':
        completeCoverageRun(message.data as CoverageRunResultMessage);
        break;
      case 'coverage_tests':
        setTestResults(message.data as TestRunSummary);
        break;
      default:
        // Unknown event — ignored silently (a noisy `console.log` here
        // would echo back through the agent's own log capture).
        break;
    }
  }, [setRoutes, addTrace, setMetrics, setStructure, setExchanges, setEndpointStats, addExchange, setReplayResult, setContainerSnapshot, setContainerResolutions, setRecordingEnabled, markLiveEvent, clearExchanges, addLog, setLogs, clearLogsLocal, setAgentLatency, incrementEventCount, setRuntime, setSecurityReport, setDatabaseSnapshot, setDatabaseTableData, setOpenApiDoc, setSpecDrift, appendFixProgress, completeFixRun, setCoverageReport, setCoverageSource, appendCoverageProgress, completeCoverageRun, setTestResults]);

  // Connect to agent - only once
  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(agentUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Periodically ping the agent to measure RTT. The interval is started
    // on connect and torn down on disconnect / unmount.
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('get_routes');
      socket.emit('get_metrics');
      socket.emit('get_structure');
      socket.emit('get_exchanges', { limit: 100 });
      socket.emit('get_endpoint_stats');
      socket.emit('get_container');
      socket.emit('get_logs');
      socket.emit('get_runtime');
      socket.emit('get_security_report');
      socket.emit('get_database_schema');
      socket.emit('get_openapi');
      socket.emit('get_coverage_report');

      // Kick off an immediate ping then settle into a 5s cadence.
      const sendPing = () => socket.emit('ping_studio', { sentAt: Date.now() });
      sendPing();
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(sendPing, 5000);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('message', handleMessage);

    return () => {
      if (pingTimer) clearInterval(pingTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agentUrl, handleMessage, setConnected]);

  // Emit events
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Proxy an API Client request through the agent and resolve with the
  // correlated `api_response`. We attach a one-shot listener filtered by
  // request id and tear it down on resolve / timeout so concurrent sends
  // don't cross-talk.
  const sendApiRequest = useCallback(
    (req: ApiProxyRequest) =>
      new Promise<ApiProxyResponse>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          reject(
            new Error(
              'Not connected to the Studio agent. Is your app running with @expressots/studio-agent enabled?',
            ),
          );
          return;
        }

        const timeout = setTimeout(() => {
          socket.off('message', onMessage);
          reject(new Error('Request timed out waiting for the agent.'));
        }, 30000);

        const onMessage = (message: WSMessage) => {
          if (message.type !== 'api_response') return;
          const data = message.data as ApiProxyResponse;
          if (data.id !== req.id) return;
          clearTimeout(timeout);
          socket.off('message', onMessage);
          resolve(data);
        };

        socket.on('message', onMessage);
        socket.emit('api_request', req);
      }),
    [],
  );

  // Request methods
  const value: SocketContextValue = {
    emit,
    sendApiRequest,
    requestRoutes: useCallback(() => emit('get_routes'), [emit]),
    requestMetrics: useCallback(() => emit('get_metrics'), [emit]),
    requestStructure: useCallback(() => emit('get_structure'), [emit]),
    requestExchanges: useCallback((limit = 100, offset = 0) => 
      emit('get_exchanges', { limit, offset }), [emit]),
    requestExchange: useCallback((id: string) => 
      emit('get_exchange', { id }), [emit]),
    searchExchanges: useCallback((query: string, method?: string, limit = 100) =>
      emit('search_exchanges', { query, method, limit }), [emit]),
    replayRequest: useCallback((exchangeId: string) =>
      emit('replay', { exchangeId }), [emit]),
    rescan: useCallback(() => emit('rescan'), [emit]),
    clearRecordings: useCallback(() => emit('clear_recordings'), [emit]),
    setRecording: useCallback(
      (enabled: boolean) => emit('set_recording', { enabled }),
      [emit],
    ),
    requestEndpointStats: useCallback(() => emit('get_endpoint_stats'), [emit]),
    requestContainer: useCallback(() => emit('get_container'), [emit]),
    refreshContainer: useCallback(() => emit('refresh_container'), [emit]),
    requestLogs: useCallback(() => emit('get_logs'), [emit]),
    clearLogs: useCallback(() => emit('clear_logs'), [emit]),
    requestRuntime: useCallback(() => emit('get_runtime'), [emit]),
    requestDatabaseSchema: useCallback(() => emit('get_database_schema'), [emit]),
    requestDatabaseTable: useCallback(
      (table: string, offset = 0, limit = 50) =>
        emit('get_database_table', { table, offset, limit }),
      [emit],
    ),
    requestOpenApi: useCallback(
      (apiVersion?: string | number) => emit('get_openapi', { apiVersion }),
      [emit],
    ),
    requestOpenApiDrift: useCallback(
      (params?: {
        spec?: Record<string, unknown>;
        specPath?: string;
        apiVersion?: string | number;
      }) => emit('get_openapi_drift', params ?? {}),
      [emit],
    ),
    requestSecurityScan: useCallback(() => emit('request_security_scan'), [emit]),
    requestSecurityReport: useCallback(() => emit('get_security_report'), [emit]),
    applyFix: useCallback(
      (input: {
        targetKind: 'finding' | 'fix-group';
        targetId: string;
        command: string;
        allowMajor?: boolean;
      }) => {
        // Seed the local transcript before the agent sends its first
        // line so the UI flips into the "running" banner immediately.
        startFixRun(input.targetId, input.command);
        emit('apply_security_fix', {
          targetKind: input.targetKind,
          targetId: input.targetId,
          allowMajor: Boolean(input.allowMajor),
        });
      },
      [emit, startFixRun],
    ),
    requestCoverageReport: useCallback(() => emit('get_coverage_report'), [emit]),
    requestCoverageScan: useCallback(() => emit('request_coverage_scan'), [emit]),
    requestCoverageSource: useCallback(
      (relPath: string) => emit('get_coverage_source', { relPath }),
      [emit],
    ),
    runCoverage: useCallback(
      (runner?: string) => {
        // Seed the local transcript so the UI flips into "running"
        // immediately, before the agent's first progress line.
        startCoverageRun(runner);
        emit('run_coverage', { runner });
      },
      [emit, startCoverageRun],
    ),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
