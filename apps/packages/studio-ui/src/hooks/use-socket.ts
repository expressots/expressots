/**
 * WebSocket hook for connecting to Studio Agent
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../stores/app-store';
import type { WSMessage, TraceInfo, RouteInfo, AppMetrics, AppStructure, RecordedExchange, EndpointStats } from '../types';

export function useSocket() {
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
  } = useAppStore();

  // Connect to agent
  useEffect(() => {
    const socket = io(agentUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Studio Agent');
      setConnected(true);
      
      // Request initial data
      socket.emit('get_routes');
      socket.emit('get_metrics');
      socket.emit('get_structure');
      socket.emit('get_exchanges', { limit: 100 });
      socket.emit('get_endpoint_stats');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Studio Agent');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    socket.on('message', (message: WSMessage) => {
      handleMessage(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agentUrl]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WSMessage) => {
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
      case 'request':
        // Real-time request notification - could add to recent requests
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [setRoutes, addTrace, setMetrics, setStructure, setExchanges, setEndpointStats]);

  // Emit events
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Request methods
  const requestRoutes = useCallback(() => emit('get_routes'), [emit]);
  const requestMetrics = useCallback(() => emit('get_metrics'), [emit]);
  const requestStructure = useCallback(() => emit('get_structure'), [emit]);
  const requestExchanges = useCallback((limit = 100, offset = 0) => 
    emit('get_exchanges', { limit, offset }), [emit]);
  const requestExchange = useCallback((id: string) => 
    emit('get_exchange', { id }), [emit]);
  const searchExchanges = useCallback((query: string, method?: string, limit = 100) =>
    emit('search_exchanges', { query, method, limit }), [emit]);
  const replayRequest = useCallback((exchangeId: string) =>
    emit('replay', { exchangeId }), [emit]);
  const rescan = useCallback(() => emit('rescan'), [emit]);
  const clearRecordings = useCallback(() => emit('clear_recordings'), [emit]);
  const requestStats = useCallback(() => emit('get_stats'), [emit]);
  const requestEndpointStats = useCallback(() => emit('get_endpoint_stats'), [emit]);

  return {
    emit,
    requestRoutes,
    requestMetrics,
    requestStructure,
    requestExchanges,
    requestExchange,
    searchExchanges,
    replayRequest,
    rescan,
    clearRecordings,
    requestStats,
    requestEndpointStats,
  };
}
