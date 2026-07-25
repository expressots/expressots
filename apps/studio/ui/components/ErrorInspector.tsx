/**
 * Error Inspector
 *
 * Surfaces the most useful debugging information when a request failed
 * (status >= 400): parses the response body for RFC-7807 fields, lifts the
 * stack trace, collapses `node_modules` frames, and offers a one-click
 * "open the throw site in editor" jump.
 *
 * Designed to be defensive — every error response shape is different, so
 * we render whatever we can recover and silently ignore missing pieces.
 */

import { useMemo, useState } from 'react';
import { AlertOctagon, Code, ChevronDown, ChevronRight, FileCode, ExternalLink, Shield } from 'lucide-react';
import { openInEditor } from '../lib/open-in-editor';
import type { RecordedExchange } from '../types';

interface StackFrame {
  raw: string;
  function?: string;
  file?: string;
  line?: number;
  column?: number;
  isUserCode: boolean;
}

interface ParsedError {
  /** RFC-7807 type URI ("https://expressots.dev/errors/bad-request" etc.). */
  type?: string;
  /** Short, human-readable error title. */
  title?: string;
  /** Long-form explanation or object with details. */
  detail?: string | Record<string, unknown>;
  /** RFC-7807 status (may differ from HTTP status for legacy clients). */
  problemStatus?: number;
  /** ExpressoTS framework extension: stable machine-readable code. */
  errorCode?: string;
  /** Optional list of validation errors (class-validator style). */
  validationErrors?: Array<{ property: string; constraints?: Record<string, string> }>;
  /** Raw stack string when available. */
  stack?: string;
  /** Parsed frames (best-effort). */
  frames: StackFrame[];
  /** True when we couldn't recognise anything useful — fall back to JSON. */
  empty: boolean;
}

function safeString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  return undefined;
}

function parseStack(stack?: string): StackFrame[] {
  if (!stack) return [];
  // Skip the first line ("Error: message") if present.
  const lines = stack.split(/\r?\n/).filter((l) => l.trim().startsWith('at '));
  const frames: StackFrame[] = [];
  for (const line of lines) {
    // Match: "at fnName (file:line:col)" or "at file:line:col"
    const m =
      line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/) ||
      line.match(/at\s+(.+?):(\d+):(\d+)$/);
    if (!m) {
      frames.push({ raw: line.trim(), isUserCode: false });
      continue;
    }
    const [, fn, file, lineStr, colStr] = m;
    const filePath = file || fn || '';
    const isInternal =
      filePath.startsWith('node:') ||
      filePath.includes('node_modules') ||
      filePath.includes('@expressots');
    frames.push({
      raw: line.trim(),
      function: fn?.trim(),
      file: filePath,
      line: Number(lineStr),
      column: Number(colStr),
      isUserCode: !isInternal,
    });
  }
  return frames;
}

function parseErrorBody(body: unknown): ParsedError {
  if (!body || typeof body !== 'object') {
    return { frames: [], empty: true };
  }
  const b = body as Record<string, unknown>;

  // Some frameworks nest the error under `error` or `data`.
  const error = (b.error && typeof b.error === 'object' ? (b.error as Record<string, unknown>) : null) || b;

  const stack = safeString(error.stack) || safeString(b.stack);
  const detail = error.detail ?? b.detail ?? error.message;
  const validationErrors = Array.isArray(error.validationErrors)
    ? (error.validationErrors as ParsedError['validationErrors'])
    : Array.isArray(b.errors)
      ? (b.errors as ParsedError['validationErrors'])
      : undefined;

  const parsed: ParsedError = {
    type: safeString(error.type) || safeString(b.type),
    title: safeString(error.title) || safeString(b.title) || safeString(error.message) || safeString(b.message),
    detail: typeof detail === 'string' || (detail && typeof detail === 'object')
      ? (detail as ParsedError['detail'])
      : undefined,
    problemStatus: typeof error.status === 'number' ? (error.status as number) : undefined,
    errorCode: safeString(error.errorCode) || safeString(b.errorCode),
    validationErrors,
    stack,
    frames: parseStack(stack),
    empty: false,
  };

  parsed.empty =
    !parsed.type &&
    !parsed.title &&
    !parsed.detail &&
    !parsed.stack &&
    (!parsed.validationErrors || parsed.validationErrors.length === 0);

  return parsed;
}

interface Props {
  exchange: RecordedExchange;
}

export function ErrorInspector({ exchange }: Props) {
  const { response } = exchange;
  const parsed = useMemo(() => parseErrorBody(response.body), [response.body]);
  const [showAllFrames, setShowAllFrames] = useState(false);

  if (response.statusCode < 400) return null;

  const userFrames = parsed.frames.filter((f) => f.isUserCode);
  const visibleFrames = showAllFrames || userFrames.length === 0 ? parsed.frames : userFrames;
  const collapsedCount = parsed.frames.length - visibleFrames.length;
  const firstUserFrame = userFrames[0];
  const isServerError = response.statusCode >= 500;

  return (
    <div className="border-b border-gray-800">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`p-2 rounded ${
              isServerError ? 'bg-error-500/15 text-error-400' : 'bg-warning-500/15 text-warning-500'
            }`}
          >
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isServerError
                    ? 'bg-error-500/10 text-error-400 border border-error-500/30'
                    : 'bg-warning-500/10 text-warning-500 border border-warning-500/30'
                }`}
              >
                {response.statusCode} {response.statusMessage || (isServerError ? 'Server Error' : 'Client Error')}
              </span>
              {parsed.errorCode && (
                <span className="text-xs font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                  {parsed.errorCode}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white">
              {parsed.title || 'Request failed'}
            </h3>
            {parsed.type && (
              <a
                href={parsed.type}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1 font-mono"
              >
                {parsed.type}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {parsed.detail && (
          <div className="mt-3 pl-12 text-sm">
            {typeof parsed.detail === 'string' ? (
              <p className="text-gray-300 leading-relaxed">{parsed.detail}</p>
            ) : (
              <pre className="text-xs font-mono bg-gray-800/50 text-gray-300 rounded p-3 overflow-x-auto">
                {JSON.stringify(parsed.detail, null, 2)}
              </pre>
            )}
          </div>
        )}

        {parsed.validationErrors && parsed.validationErrors.length > 0 && (
          <div className="mt-3 pl-12">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wide">
              <Shield className="w-3 h-3" />
              Validation errors
            </div>
            <ul className="space-y-1.5">
              {parsed.validationErrors.map((ve, i) => (
                <li key={i} className="text-sm bg-gray-800/40 rounded px-3 py-2">
                  <span className="font-mono text-warning-500">{ve.property}</span>
                  {ve.constraints && (
                    <ul className="mt-1 ml-3 text-xs text-gray-400 space-y-0.5">
                      {Object.entries(ve.constraints).map(([k, v]) => (
                        <li key={k}>
                          <span className="text-gray-500">{k}:</span> {v}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {firstUserFrame?.file && (
          <div className="mt-3 pl-12">
            <button
              onClick={() =>
                openInEditor({
                  filePath: firstUserFrame.file,
                  lineNumber: firstUserFrame.line,
                  column: firstUserFrame.column,
                })
              }
              className="studio-btn-primary"
            >
              <FileCode className="w-3.5 h-3.5" />
              Open throw site in editor
              <span className="font-mono text-gray-900/70">
                {shortenPath(firstUserFrame.file)}:{firstUserFrame.line}
              </span>
            </button>
          </div>
        )}

        {parsed.frames.length > 0 && (
          <StackFramesPanel
            frames={visibleFrames}
            allFrames={parsed.frames}
            collapsedCount={collapsedCount}
            showAllFrames={showAllFrames}
            onToggle={() => setShowAllFrames(!showAllFrames)}
          />
        )}

        {parsed.empty && (
          <p className="mt-2 pl-12 text-sm text-gray-500">
            No structured error data was returned by the server. The response
            body is rendered below as-is.
          </p>
        )}
      </div>
    </div>
  );
}

function shortenPath(file: string): string {
  const parts = file.split(/[\\/]/);
  if (parts.length <= 2) return file;
  return '…/' + parts.slice(-2).join('/');
}

interface StackFramesPanelProps {
  frames: StackFrame[];
  allFrames: StackFrame[];
  collapsedCount: number;
  showAllFrames: boolean;
  onToggle: () => void;
}

function StackFramesPanel({
  frames,
  allFrames,
  collapsedCount,
  showAllFrames,
  onToggle,
}: StackFramesPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-4 pl-12">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 hover:text-white"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Code className="w-3 h-3" />
        Stack trace
        <span className="text-gray-600 normal-case">
          ({allFrames.length} frame{allFrames.length === 1 ? '' : 's'})
        </span>
      </button>

      {open && (
        <div className="mt-2 bg-gray-800/40 rounded border border-gray-800 divide-y divide-gray-800/60 font-mono text-xs">
          {frames.map((frame, i) => (
            <FrameRow key={i} frame={frame} />
          ))}
          {collapsedCount > 0 && (
            <button
              onClick={onToggle}
              className="w-full text-left px-3 py-2 text-gray-500 hover:bg-gray-800/30 hover:text-gray-300 transition-colors"
            >
              {showAllFrames
                ? '↑ Hide framework / node_modules frames'
                : `↓ Show ${collapsedCount} framework / node_modules frame${collapsedCount === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FrameRow({ frame }: { frame: StackFrame }) {
  const canOpen = frame.isUserCode && frame.file && frame.line;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 ${
        frame.isUserCode ? 'bg-primary-950/20' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        {frame.function && (
          <div className={frame.isUserCode ? 'text-primary-300' : 'text-gray-400'}>
            {frame.function}
          </div>
        )}
        {frame.file && (
          <div className="text-gray-500 truncate">
            {frame.file}
            {frame.line ? `:${frame.line}` : ''}
            {frame.column ? `:${frame.column}` : ''}
          </div>
        )}
        {!frame.file && !frame.function && (
          <div className="text-gray-500 truncate">{frame.raw}</div>
        )}
      </div>
      {canOpen && (
        <button
          onClick={() =>
            openInEditor({
              filePath: frame.file,
              lineNumber: frame.line,
              column: frame.column,
            })
          }
          className="p-1 text-gray-500 hover:text-primary-400"
          title="Open in editor"
        >
          <FileCode className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
