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
  EndpointStats,
  ReplayResultPayload,
  ContainerSnapshot,
  ContainerResolutions,
  LogEntry,
  RuntimeInfo,
  SecurityReport,
  FixProgressMessage,
  FixResultMessage,
} from '../types';

interface SocketContextValue {
  emit: (event: string, data?: unknown) => void;
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
  requestStats: () => void;
  requestEndpointStats: () => void;
  requestContainer: () => void;
  requestLogs: () => void;
  clearLogs: () => void;
  requestRuntime: () => void;
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
    startFixRun,
    appendFixProgress,
    completeFixRun,
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
      case 'structure':
        setStructure(message.data as AppStructure);
        break;
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
        const requestData = message.data as { request: any; response: { statusCode: number; duration: number } };
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
      case 'security_scan_state':
        // Scan-state-only updates are folded into the report broadcast
        // upstream; we keep the case to avoid the "unknown event"
        // fallthrough warning surfacing for future agent versions.
        break;
      case 'fix_progress':
        appendFixProgress(message.data as FixProgressMessage);
        break;
      case 'fix_result':
        completeFixRun(message.data as FixResultMessage);
        break;
      default:
        // Unknown event — ignored silently (a noisy `console.log` here
        // would echo back through the agent's own log capture).
        break;
    }
  }, [setRoutes, addTrace, setMetrics, setStructure, setExchanges, setEndpointStats, addExchange, setReplayResult, setContainerSnapshot, setContainerResolutions, setRecordingEnabled, markLiveEvent, clearExchanges, addLog, setLogs, clearLogsLocal, setAgentLatency, incrementEventCount, setRuntime, setSecurityReport, appendFixProgress, completeFixRun]);

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

  // Request methods
  const value: SocketContextValue = {
    emit,
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
    requestStats: useCallback(() => emit('get_stats'), [emit]),
    requestEndpointStats: useCallback(() => emit('get_endpoint_stats'), [emit]),
    requestContainer: useCallback(() => emit('get_container'), [emit]),
    requestLogs: useCallback(() => emit('get_logs'), [emit]),
    clearLogs: useCallback(() => emit('clear_logs'), [emit]),
    requestRuntime: useCallback(() => emit('get_runtime'), [emit]),
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
