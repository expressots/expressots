/**
 * API Client view - test endpoints directly from Studio
 */

import { useMemo, useState } from 'react';
import { Send, Plus, X, Copy, Check } from 'lucide-react';
import {
  cn,
  copyToClipboard,
  formatDuration,
  getMethodBgColor,
  getMethodColor,
  getStatusColor,
  safeParseJSON,
} from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import type { HttpMethod } from '../types';

type Tab = 'headers' | 'body' | 'query';

interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiResponse {
  status: number;
  statusText: string;
  duration: number;
  headers: Record<string, string>;
  body: string;
  parsed: unknown;
  isJson: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const DEFAULT_BASE_URL = 'http://localhost:3000';

const newKV = (): KeyValue => ({
  id: Math.random().toString(36).slice(2, 10),
  key: '',
  value: '',
  enabled: true,
});

export function ApiClient() {
  const { routes } = useAppStore();
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>(`${DEFAULT_BASE_URL}/`);
  const [tab, setTab] = useState<Tab>('headers');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [query, setQuery] = useState<KeyValue[]>([]);
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const supportsBody = method !== 'GET' && method !== 'HEAD';

  const discoveredRoutes = useMemo(() => {
    return routes.map((r) => ({ method: r.method, path: r.path }));
  }, [routes]);

  const pickRoute = (m: HttpMethod, path: string) => {
    setMethod(m);
    try {
      const parsed = new URL(url);
      parsed.pathname = path;
      parsed.search = '';
      setUrl(parsed.toString());
    } catch {
      setUrl(`${DEFAULT_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    }
  };

  const updateKV = (
    list: KeyValue[],
    setter: (next: KeyValue[]) => void,
    id: string,
    patch: Partial<KeyValue>,
  ) => {
    setter(list.map((kv) => (kv.id === id ? { ...kv, ...patch } : kv)));
  };

  const removeKV = (
    list: KeyValue[],
    setter: (next: KeyValue[]) => void,
    id: string,
  ) => {
    setter(list.filter((kv) => kv.id !== id));
  };

  const buildFinalUrl = (): string => {
    const enabledQuery = query.filter((q) => q.enabled && q.key);
    if (enabledQuery.length === 0) return url;
    try {
      const u = new URL(url);
      for (const q of enabledQuery) {
        u.searchParams.set(q.key, q.value);
      }
      return u.toString();
    } catch {
      return url;
    }
  };

  const send = async () => {
    setError(null);
    setResponse(null);
    setSending(true);

    const finalUrl = buildFinalUrl();
    const reqHeaders: Record<string, string> = {};
    headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        reqHeaders[h.key] = h.value;
      });

    const init: RequestInit = { method, headers: reqHeaders };
    if (supportsBody && body.trim()) {
      init.body = body;
      const hasCT = Object.keys(reqHeaders).some(
        (k) => k.toLowerCase() === 'content-type',
      );
      if (!hasCT) {
        const trimmed = body.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          reqHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    const start = performance.now();
    try {
      const res = await fetch(finalUrl, init);
      const duration = performance.now() - start;
      const text = await res.text();
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        respHeaders[k] = v;
      });
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const parsed = isJson ? safeParseJSON(text) : text;

      setResponse({
        status: res.status,
        statusText: res.statusText,
        duration,
        headers: respHeaders,
        body: text,
        parsed,
        isJson,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      const hint =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('networkerror')
          ? ' — check that the app is running and that @expressots/studio-agent is installed (it injects CORS headers for the Studio UI).'
          : '';
      setError(`${msg}${hint}`);
    } finally {
      setSending(false);
    }
  };

  const handleCopyResponse = async () => {
    if (!response) return;
    const text =
      response.isJson && typeof response.parsed !== 'string'
        ? JSON.stringify(response.parsed, null, 2)
        : response.body;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Discovered routes */}
      {discoveredRoutes.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Discovered routes</p>
          <div className="flex flex-wrap gap-2">
            {discoveredRoutes.map((r, i) => (
              <button
                key={`${r.method}-${r.path}-${i}`}
                onClick={() => pickRoute(r.method, r.path)}
                className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/60 border border-gray-700 hover:border-primary-500 transition-colors"
              >
                <span
                  className={cn(
                    'text-xs font-mono font-semibold px-1.5 py-0.5 rounded',
                    getMethodBgColor(r.method),
                    getMethodColor(r.method),
                  )}
                >
                  {r.method}
                </span>
                <span className="text-xs font-mono text-gray-300">{r.path}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Request bar */}
      <div className="flex items-stretch gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className={cn(
            'px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm font-mono font-semibold focus:outline-none focus:border-primary-500',
            getMethodColor(method),
          )}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} className="bg-gray-900 text-gray-200">
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !sending) send();
          }}
          placeholder="http://localhost:3000/"
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={send}
          disabled={sending || !url.trim()}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            sending || !url.trim()
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600',
          )}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-800">
          {(['headers', 'query', 'body'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={t === 'body' && !supportsBody}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors',
                tab === t
                  ? 'text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-gray-200',
                t === 'body' && !supportsBody && 'opacity-40 cursor-not-allowed',
              )}
            >
              {t}
              {t === 'headers' && headers.filter((h) => h.enabled && h.key).length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({headers.filter((h) => h.enabled && h.key).length})
                </span>
              )}
              {t === 'query' && query.filter((q) => q.enabled && q.key).length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({query.filter((q) => q.enabled && q.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-3">
          {tab === 'headers' && (
            <KeyValueEditor
              items={headers}
              onChange={(id, patch) => updateKV(headers, setHeaders, id, patch)}
              onRemove={(id) => removeKV(headers, setHeaders, id)}
              onAdd={() => setHeaders([...headers, newKV()])}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
            />
          )}

          {tab === 'query' && (
            <KeyValueEditor
              items={query}
              onChange={(id, patch) => updateKV(query, setQuery, id, patch)}
              onRemove={(id) => removeKV(query, setQuery, id)}
              onAdd={() => setQuery([...query, newKV()])}
              keyPlaceholder="Param"
              valuePlaceholder="Value"
            />
          )}

          {tab === 'body' && (
            <>
              {supportsBody ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{\n  "key": "value"\n}'
                  spellCheck={false}
                  className="w-full h-48 px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-500">Body is not supported for {method} requests.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Response */}
      {(response || error) && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-4">
              {response && (
                <>
                  <span className={cn('text-lg font-semibold', getStatusColor(response.status))}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-sm text-gray-400">{formatDuration(response.duration)}</span>
                  <span className="text-sm text-gray-500">
                    {new Blob([response.body]).size} bytes
                  </span>
                </>
              )}
              {error && (
                <span className="text-error-400 text-sm font-medium">Error: {error}</span>
              )}
            </div>
            {response && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHeaders((v) => !v)}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded"
                >
                  {showHeaders ? 'Hide' : 'Show'} headers
                </button>
                <button
                  onClick={handleCopyResponse}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {response && showHeaders && (
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/50">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Response headers</p>
              <div className="space-y-1">
                {Object.entries(response.headers).map(([k, v]) => (
                  <div key={k} className="text-xs font-mono text-gray-300">
                    <span className="text-gray-500">{k}:</span> {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {response && (
            <pre className="px-4 py-3 text-xs text-gray-200 font-mono overflow-auto max-h-96 bg-gray-950/50">
              {response.isJson && typeof response.parsed !== 'string'
                ? JSON.stringify(response.parsed, null, 2)
                : response.body || '(empty body)'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (id: string, patch: Partial<KeyValue>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}

function KeyValueEditor({
  items,
  onChange,
  onRemove,
  onAdd,
  keyPlaceholder,
  valuePlaceholder,
}: KeyValueEditorProps) {
  return (
    <div className="space-y-2">
      {items.map((kv) => (
        <div key={kv.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={kv.enabled}
            onChange={(e) => onChange(kv.id, { enabled: e.target.checked })}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700"
          />
          <input
            type="text"
            value={kv.key}
            onChange={(e) => onChange(kv.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="flex-1 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
          />
          <input
            type="text"
            value={kv.value}
            onChange={(e) => onChange(kv.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="flex-1 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={() => onRemove(kv.id)}
            className="text-gray-500 hover:text-error-400 p-1"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>
    </div>
  );
}
