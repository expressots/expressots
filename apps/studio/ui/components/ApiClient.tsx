/**
 * API Client view - test endpoints directly from Studio
 */

import { useEffect, useMemo, useState } from 'react';
import { Send, Plus, X, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
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
import { OpenApiPanel } from './OpenApiPanel';
import type { HttpMethod } from '../types';

type Tab = 'headers' | 'body' | 'query';
type BodyMode = 'form' | 'json';

interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/** Primitive types we surface in the body Form editor. */
type FormFieldType = 'string' | 'number' | 'boolean' | 'null' | 'json';

interface FormField {
  id: string;
  key: string;
  type: FormFieldType;
  /** Raw input string. We coerce on serialize so users can type freely. */
  value: string;
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
  const { routes, pendingApiClientRequest, setPendingApiClientRequest, runtime } = useAppStore();
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>(`${DEFAULT_BASE_URL}/`);
  const [tab, setTab] = useState<Tab>('headers');

  // Derive the actual base URL from the agent's runtime info once it
  // arrives over WS. Incorporates both the real port (`appPort`) and the
  // global route prefix so that newly-opened Studio shows
  // `http://localhost:3000/api` instead of the generic `http://localhost:3000/`.
  const baseUrl = runtime?.appUrl ?? DEFAULT_BASE_URL;
  useEffect(() => {
    const prefix =
      runtime?.globalPrefix && runtime.globalPrefix !== '/'
        ? runtime.globalPrefix
        : '/';
    setUrl(`${baseUrl}${prefix}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime?.appUrl, runtime?.globalPrefix]);
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [query, setQuery] = useState<KeyValue[]>([]);
  const [body, setBody] = useState<string>('');
  // 'form' is the default UX surface — collapses the JSON-typing
  // overhead for the common case of POST {key: value, …}. Switching
  // to 'json' restores the raw textarea (useful for nested objects).
  const [bodyMode, setBodyMode] = useState<BodyMode>('form');
  const [sending, setSending] = useState<boolean>(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const supportsBody = method !== 'GET' && method !== 'HEAD';

  // Cross-view handoff: when another view (e.g. Architecture Map) hands
  // us a request via the store, populate the inputs and clear the slot
  // so navigating back doesn't re-apply the same request.
  useEffect(() => {
    if (!pendingApiClientRequest) return;
    const { method: m, path: p, body: b } = pendingApiClientRequest;
    setMethod(m);
    try {
      const next = new URL(url);
      next.pathname = p;
      next.search = '';
      setUrl(next.toString());
    } catch {
      setUrl(`${baseUrl}${p.startsWith('/') ? p : `/${p}`}`);
    }
    if (b && (m === 'POST' || m === 'PUT' || m === 'PATCH')) {
      setBody(JSON.stringify(b, null, 2));
      setTab('body');
      setBodyMode('form');
    }
    setPendingApiClientRequest(null);
    // We intentionally only react to the store value changing — re-running
    // when `url` updates would clobber the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingApiClientRequest]);

  // Group discovered routes by controller so big APIs (dozens of
  // endpoints across many controllers) stay scannable. Within each
  // group routes are sorted by path → method to mirror the order
  // users read them in source. Anonymous routes (e.g. `app.get(...)`
  // outside a controller) bucket under the synthetic "Other" group.
  const groupedRoutes = useMemo(() => {
    const buckets = new Map<
      string,
      Array<{
        method: HttpMethod;
        path: string;
        bodyDto?: string;
        bodySample?: Record<string, unknown>;
        controllerMethod?: string;
      }>
    >();

    for (const r of routes) {
      const groupKey = r.controller && r.controller !== 'Unknown' ? r.controller : 'Other';
      const list = buckets.get(groupKey) ?? [];
      list.push({
        method: r.method,
        path: r.path,
        bodyDto: r.bodyDto,
        bodySample: r.bodySample,
        controllerMethod: r.controllerMethod,
      });
      buckets.set(groupKey, list);
    }

    const ordered: Array<{
      controller: string;
      routes: Array<{
        method: HttpMethod;
        path: string;
        bodyDto?: string;
        bodySample?: Record<string, unknown>;
        controllerMethod?: string;
      }>;
    }> = [];
    for (const [controller, list] of buckets) {
      list.sort((a, b) =>
        a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
      );
      ordered.push({ controller, routes: list });
    }
    // "Other" always last so user-defined controllers come first.
    ordered.sort((a, b) => {
      if (a.controller === 'Other') return 1;
      if (b.controller === 'Other') return -1;
      return a.controller.localeCompare(b.controller);
    });
    return ordered;
  }, [routes]);

  // Per-controller collapse state. Default: every group expanded so
  // small APIs stay one-click. Users can collapse noisy groups.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const [routeFilter, setRouteFilter] = useState<string>('');
  const filteredGroups = useMemo(() => {
    const q = routeFilter.trim().toLowerCase();
    if (!q) return groupedRoutes;
    return groupedRoutes
      .map((g) => ({
        controller: g.controller,
        routes: g.routes.filter(
          (r) =>
            r.path.toLowerCase().includes(q) ||
            r.method.toLowerCase().includes(q) ||
            (r.controllerMethod ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.routes.length > 0);
  }, [groupedRoutes, routeFilter]);

  const pickRoute = (
    m: HttpMethod,
    path: string,
    bodySample?: Record<string, unknown>,
  ) => {
    setMethod(m);
    try {
      const parsed = new URL(url);
      parsed.pathname = path;
      parsed.search = '';
      setUrl(parsed.toString());
    } catch {
      setUrl(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    }

    // Auto-fill the request body for body-bearing methods when the agent
    // discovered a `@Body() : Dto` annotation. Only overwrite when the
    // body editor is empty so we never clobber the user's typed JSON.
    const bodyMethods: HttpMethod[] = ['POST', 'PUT', 'PATCH'];
    if (bodyMethods.includes(m) && bodySample) {
      const formatted = JSON.stringify(bodySample, null, 2);
      setBody((current) => (current.trim() ? current : formatted));
      setTab('body');
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
      {/* OpenAPI: generate, download, and check drift */}
      <OpenApiPanel />

      {/* Discovered routes — grouped by controller, filterable */}
      {groupedRoutes.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Discovered routes
              <span className="ml-2 text-gray-600 normal-case font-normal">
                {groupedRoutes.reduce((sum, g) => sum + g.routes.length, 0)} endpoints across{' '}
                {groupedRoutes.length} controller{groupedRoutes.length === 1 ? '' : 's'}
              </span>
            </p>
            <input
              type="text"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              placeholder="Filter by path, method, or handler…"
              className="w-64 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-primary-500"
            />
          </div>
          {filteredGroups.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No routes match "{routeFilter}".</p>
          ) : (
            filteredGroups.map((group) => {
              const isCollapsed = collapsed.has(group.controller);
              return (
                <div
                  key={group.controller}
                  className="border border-gray-800 rounded-md overflow-hidden bg-gray-950/40"
                >
                  <button
                    onClick={() => toggleGroup(group.controller)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left bg-gray-900/60 hover:bg-gray-900 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span className="text-xs font-mono font-semibold text-primary-300">
                      {group.controller}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {group.routes.length} route{group.routes.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="px-3 py-2 flex flex-col gap-1">
                      {group.routes.map((r, i) => (
                        <button
                          key={`${r.method}-${r.path}-${i}`}
                          onClick={() => pickRoute(r.method, r.path, r.bodySample)}
                          title={
                            r.bodyDto
                              ? `Auto-fills body from ${r.bodyDto}`
                              : `${r.method} ${r.path}${r.controllerMethod ? ` → ${r.controllerMethod}()` : ''}`
                          }
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/60 border border-transparent hover:border-primary-500/40 transition-colors text-left"
                        >
                          <span
                            className={cn(
                              'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded w-14 text-center',
                              getMethodBgColor(r.method),
                              getMethodColor(r.method),
                            )}
                          >
                            {r.method}
                          </span>
                          <span className="text-xs font-mono text-gray-200 flex-1 truncate">
                            {r.path}
                          </span>
                          {r.controllerMethod && (
                            <span className="text-[10px] font-mono text-gray-500 truncate">
                              {r.controllerMethod}()
                            </span>
                          )}
                          {r.bodyDto && (
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/30 text-primary-300"
                              title={`Auto-fills body from ${r.bodyDto}`}
                            >
                              {r.bodyDto}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-md border border-gray-800 overflow-hidden">
                      {(['form', 'json'] as BodyMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setBodyMode(m)}
                          className={cn(
                            'px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
                            bodyMode === m
                              ? 'bg-primary-500/20 text-primary-300'
                              : 'bg-gray-900 text-gray-500 hover:text-gray-300',
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {bodyMode === 'form'
                        ? 'Type each variable below — JSON is built for you.'
                        : 'Raw JSON. Click Form to edit field-by-field.'}
                    </p>
                  </div>
                  {bodyMode === 'form' ? (
                    <BodyFormEditor body={body} onChange={setBody} />
                  ) : (
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={'{\n  "key": "value"\n}'}
                      spellCheck={false}
                      className="w-full h-48 px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500 resize-none"
                    />
                  )}
                </div>
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

/**
 * Form-style body editor. Parses the current JSON body into typed
 * fields the user can edit one row at a time, then re-serializes back
 * to JSON. Designed for the common DTO shape `{ key: primitive }`;
 * nested objects/arrays are kept as a single "JSON" field so users
 * never lose data they typed in raw mode.
 */
function BodyFormEditor({
  body,
  onChange,
}: {
  body: string;
  onChange: (next: string) => void;
}) {
  const initialFields = useMemo<FormField[]>(
    () => deserializeBody(body),
    // We only want to seed the initial state from the parent; further
    // edits are owned locally and re-serialized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [fields, setFields] = useState<FormField[]>(initialFields);

  // Re-hydrate when the parent body is replaced wholesale (e.g. user
  // clicked a different discovered route → new DTO sample).
  const lastSeen = useMemo(() => body, [body]);
  const [lastBody, setLastBody] = useState<string>(lastSeen);
  if (lastBody !== body && body !== serializeFields(fields)) {
    // Parent provided a fresh body — sync without entering an edit loop.
    setFields(deserializeBody(body));
    setLastBody(body);
  }

  const commit = (next: FormField[]) => {
    setFields(next);
    const serialized = serializeFields(next);
    setLastBody(serialized);
    onChange(serialized);
  };

  const updateField = (id: string, patch: Partial<FormField>) =>
    commit(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeField = (id: string) => commit(fields.filter((f) => f.id !== id));

  const addField = () =>
    commit([
      ...fields,
      {
        id: Math.random().toString(36).slice(2, 10),
        key: '',
        type: 'string',
        value: '',
      },
    ]);

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-gray-500 italic px-1">
          No fields yet. Click <span className="text-primary-300">Add field</span> or pick a route
          with a <span className="font-mono">@Body()</span> DTO to auto-fill the form.
        </p>
      )}
      {fields.map((f) => {
        const acceptsValue = f.type !== 'null';
        return (
          <div key={f.id} className="flex items-center gap-2">
            <input
              type="text"
              value={f.key}
              onChange={(e) => updateField(f.id, { key: e.target.value })}
              placeholder="field"
              className="w-40 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
            />
            <select
              value={f.type}
              onChange={(e) => updateField(f.id, { type: e.target.value as FormFieldType })}
              className="w-24 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-xs font-mono text-gray-300 focus:outline-none focus:border-primary-500"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="null">null</option>
              <option value="json">json</option>
            </select>
            {f.type === 'boolean' ? (
              <select
                value={f.value || 'true'}
                onChange={(e) => updateField(f.id, { value: e.target.value })}
                className="flex-1 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : acceptsValue ? (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={f.value}
                onChange={(e) => updateField(f.id, { value: e.target.value })}
                placeholder={
                  f.type === 'json' ? '{"nested":true}' : f.type === 'number' ? '0' : 'value'
                }
                spellCheck={false}
                className="flex-1 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary-500"
              />
            ) : (
              <span className="flex-1 px-2 py-1 text-xs text-gray-500 italic">null</span>
            )}
            <button
              onClick={() => removeField(f.id)}
              className="text-gray-500 hover:text-error-400 p-1"
              aria-label="Remove field"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <button
        onClick={addField}
        className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
      >
        <Plus className="w-4 h-4" />
        Add field
      </button>
    </div>
  );
}

function inferType(value: unknown): FormFieldType {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'json';
}

function deserializeBody(raw: string): FormField[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      // Not a plain object → fall back to a single JSON field so we
      // don't strip the user's data.
      return [
        {
          id: Math.random().toString(36).slice(2, 10),
          key: '$root',
          type: 'json',
          value: JSON.stringify(parsed),
        },
      ];
    }
    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => {
      const type = inferType(value);
      const valueAsString =
        type === 'string'
          ? (value as string)
          : type === 'json'
            ? JSON.stringify(value)
            : String(value);
      return {
        id: Math.random().toString(36).slice(2, 10),
        key,
        type,
        value: type === 'null' ? '' : valueAsString,
      };
    });
  } catch {
    return [];
  }
}

function serializeFields(fields: FormField[]): string {
  if (fields.length === 0) return '';
  // Special-case the synthetic "$root" field used for non-object roots.
  if (fields.length === 1 && fields[0].key === '$root' && fields[0].type === 'json') {
    return fields[0].value || '';
  }
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.key) continue;
    switch (f.type) {
      case 'string':
        out[f.key] = f.value;
        break;
      case 'number': {
        const n = Number(f.value);
        out[f.key] = Number.isFinite(n) ? n : 0;
        break;
      }
      case 'boolean':
        out[f.key] = f.value === 'true';
        break;
      case 'null':
        out[f.key] = null;
        break;
      case 'json':
        try {
          out[f.key] = JSON.parse(f.value || 'null');
        } catch {
          // Preserve user input as a string so they can keep editing
          // without losing it on a transient parse failure.
          out[f.key] = f.value;
        }
        break;
    }
  }
  return JSON.stringify(out, null, 2);
}
