/**
 * Request replay view component
 */

import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Clock, X } from 'lucide-react';
import { cn, formatTimestamp, getMethodColor, getMethodBgColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { ReplayDiff, type ReplayDiffPayload } from './ReplayDiff';
import type { RecordedExchange } from '../types';

interface ReplayDisplay {
  success: boolean;
  diff?: ReplayDiffPayload;
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
      const r = replayResult.replay;
      next.set(targetId, {
        success: replayResult.success,
        diff:
          replayResult.success && r && original
            ? {
                original: {
                  statusCode: original.response.statusCode,
                  statusMessage: original.response.statusMessage,
                  headers: original.response.headers,
                  body: original.response.body,
                  duration: original.response.duration,
                },
                replay: {
                  statusCode: r.statusCode,
                  statusMessage: r.statusMessage,
                  headers: r.headers,
                  body: r.body,
                  duration: r.duration ?? 0,
                },
              }
            : undefined,
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
            <div key={exchange.id} className="studio-card p-4">
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
                  className="studio-btn-primary px-4 py-2 text-sm"
                >
                  {isReplaying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
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
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  {result.success && result.diff ? (
                    <ReplayDiff payload={result.diff} />
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
