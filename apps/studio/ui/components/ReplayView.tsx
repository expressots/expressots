/**
 * Request replay view component
 */

import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Clock, Check, X } from 'lucide-react';
import { cn, formatDuration, formatTimestamp, getMethodColor, getMethodBgColor, getStatusColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import type { RecordedExchange } from '../types';

interface ReplayDisplay {
  success: boolean;
  originalStatus: number;
  originalDuration: number;
  replayStatus?: number;
  replayDuration?: number;
  replayBody?: unknown;
  error?: string;
}

export function ReplayView() {
  const { exchanges, searchQuery, filterMethod, replayResult, setReplayResult } = useAppStore();
  const { replayRequest } = useSocket();
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replays, setReplays] = useState<Map<string, ReplayDisplay>>(new Map());

  const filteredExchanges = useMemo(() => {
    return exchanges.filter((exchange) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!exchange.request.path.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterMethod && exchange.request.method !== filterMethod) {
        return false;
      }
      return true;
    });
  }, [exchanges, searchQuery, filterMethod]);

  // Consume incoming replay_result and merge into the local display map
  useEffect(() => {
    if (!replayResult) return;

    const targetId = replayingId ?? replayResult.original?.id;
    if (!targetId) return;

    const original = replayResult.original ?? exchanges.find((e) => e.id === targetId);

    setReplays((prev) => {
      const next = new Map(prev);
      next.set(targetId, {
        success: replayResult.success,
        originalStatus: original?.response.statusCode ?? 0,
        originalDuration: original?.response.duration ?? 0,
        replayStatus: replayResult.replay?.statusCode,
        replayDuration: replayResult.replay?.duration,
        replayBody: replayResult.replay?.body,
        error: replayResult.error,
      });
      return next;
    });
    setReplayingId(null);
    setReplayResult(null);
  }, [replayResult, replayingId, exchanges, setReplayResult]);

  const handleReplay = (exchange: RecordedExchange) => {
    setReplayingId(exchange.id);
    replayRequest(exchange.id);
  };

  if (exchanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <RotateCcw className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No requests to replay</p>
        <p className="text-sm mt-2">Record some requests first, then replay them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Play className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-primary-300">Request Replay</h3>
            <p className="text-sm text-primary-200/70 mt-1">
              Replay recorded requests against your running application to compare behavior.
              This is useful for debugging and regression testing.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredExchanges.map((exchange) => {
          const result = replays.get(exchange.id);
          const isReplaying = replayingId === exchange.id;

          return (
            <div
              key={exchange.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono font-semibold',
                      getMethodBgColor(exchange.request.method),
                      getMethodColor(exchange.request.method),
                    )}
                  >
                    {exchange.request.method}
                  </div>
                  <div>
                    <p className="font-mono text-sm text-gray-200">{exchange.request.path}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTimestamp(exchange.request.timestamp)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleReplay(exchange)}
                  disabled={isReplaying}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isReplaying
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600',
                  )}
                >
                  {isReplaying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Replaying...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Replay
                    </>
                  )}
                </button>
              </div>

              {result && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  {result.success && result.replayStatus !== undefined ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                            Original
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-lg font-semibold',
                                getStatusColor(result.originalStatus),
                              )}
                            >
                              {result.originalStatus}
                            </span>
                            <span className="text-sm text-gray-400">
                              {formatDuration(result.originalDuration)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                            Replay
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-lg font-semibold',
                                getStatusColor(result.replayStatus),
                              )}
                            >
                              {result.replayStatus}
                            </span>
                            <span className="text-sm text-gray-400">
                              {result.replayDuration !== undefined
                                ? formatDuration(result.replayDuration)
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {result.originalStatus === result.replayStatus ? (
                          <div className="flex items-center gap-2 text-success-500 text-sm">
                            <Check className="w-4 h-4" />
                            Same status code
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-error-500 text-sm">
                            <X className="w-4 h-4" />
                            Status changed from {result.originalStatus} to {result.replayStatus}
                          </div>
                        )}

                        {result.replayDuration !== undefined && result.originalDuration > 0 && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span
                              className={cn(
                                'text-sm',
                                result.replayDuration < result.originalDuration
                                  ? 'text-success-500'
                                  : 'text-warning-500',
                              )}
                            >
                              {result.replayDuration < result.originalDuration ? '↓' : '↑'}
                              {Math.abs(
                                ((result.replayDuration - result.originalDuration) /
                                  result.originalDuration) *
                                  100,
                              ).toFixed(0)}
                              % duration
                            </span>
                          </>
                        )}
                      </div>

                      {result.replayBody !== undefined && result.replayBody !== null && (
                        <details className="mt-3">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                            Show replay response body
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-950 border border-gray-800 rounded p-3 overflow-auto max-h-64 text-gray-300">
                            {typeof result.replayBody === 'string'
                              ? result.replayBody
                              : JSON.stringify(result.replayBody, null, 2)}
                          </pre>
                        </details>
                      )}
                    </>
                  ) : (
                    <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-error-400 text-sm">
                        <X className="w-4 h-4" />
                        Replay failed: {result.error ?? 'Unknown error'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
