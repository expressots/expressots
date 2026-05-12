/**
 * Settings panel — right-side drawer that mirrors TraceDetail's layout.
 *
 * Everything edited here is persisted to localStorage via the settings
 * store. Changes that affect the *current* runtime (e.g. agent URL) are
 * also mirrored into the app store immediately, so the user sees the
 * effect without reloading.
 */

import { useState } from 'react';
import {
  X,
  Plug,
  FileCode,
  Eye,
  Database,
  Info,
  RotateCcw,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  useSettings,
  EDITOR_SCHEME_LABELS,
  type EditorScheme,
} from '../stores/settings-store';
import { useAppStore } from '../stores/app-store';
import { cn, copyToClipboard } from '../lib/utils';
import type { LogLevel, ViewMode } from '../types';

const LOG_LEVELS: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'requests', label: 'Requests' },
  { id: 'logs', label: 'Logs' },
  { id: 'api-client', label: 'API Client' },
  { id: 'container', label: 'Container' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'replay', label: 'Replay' },
];

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const settings = useSettings();
  const { agentUrl, connected, setAgentUrl, exchanges, logs } = useAppStore();

  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative ml-auto w-full max-w-xl bg-gray-900 border-l border-gray-800 overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-gray-800">
          {/* Connection */}
          <Section icon={Plug} title="Connection">
            <Field label="Agent URL" hint="WebSocket URL of the running Studio Agent.">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.agentUrl}
                  onChange={(e) => settings.update({ agentUrl: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded font-mono focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => setAgentUrl(settings.agentUrl)}
                  className="px-3 py-2 text-xs bg-primary-700 hover:bg-primary-600 text-white rounded whitespace-nowrap"
                  title="Reconnect Studio to this URL (page reload required for full effect)"
                >
                  Apply
                </button>
              </div>
              <ConnectionStatus connected={connected} liveUrl={agentUrl} />
            </Field>
          </Section>

          {/* Editor */}
          <Section icon={FileCode} title="Editor">
            <Field
              label="Editor scheme"
              hint="Used by every Open-in-editor button. Changing this affects all future clicks."
            >
              <select
                value={settings.editorScheme}
                onChange={(e) =>
                  settings.update({ editorScheme: e.target.value as EditorScheme })
                }
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-primary-500"
              >
                {(Object.keys(EDITOR_SCHEME_LABELS) as EditorScheme[]).map((s) => (
                  <option key={s} value={s}>
                    {EDITOR_SCHEME_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            {settings.editorScheme === 'custom' && (
              <Field
                label="Custom URL prefix"
                hint='Path and ":<line>:<col>" will be appended. Example: "vscode-insiders://file"'
              >
                <input
                  type="text"
                  value={settings.customEditorPrefix}
                  onChange={(e) => settings.update({ customEditorPrefix: e.target.value })}
                  placeholder="vscode://file"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded font-mono focus:outline-none focus:border-primary-500"
                />
              </Field>
            )}
          </Section>

          {/* Recording */}
          <Section icon={Database} title="Recording">
            <Toggle
              label="Start recording on launch"
              hint="When off, you must click Resume in the header to begin capturing requests."
              checked={settings.recordOnLaunch}
              onChange={(v) => settings.update({ recordOnLaunch: v })}
            />
            <Field
              label="Max retained exchanges"
              hint="Older exchanges are dropped from memory once this limit is reached."
            >
              <NumberInput
                value={settings.maxExchanges}
                onChange={(v) => settings.update({ maxExchanges: v })}
                min={50}
                max={5000}
                step={50}
              />
            </Field>
            <Field
              label="Max log buffer size"
              hint="Older log lines are dropped once this limit is reached."
            >
              <NumberInput
                value={settings.maxLogBuffer}
                onChange={(v) => settings.update({ maxLogBuffer: v })}
                min={100}
                max={10000}
                step={100}
              />
            </Field>
          </Section>

          {/* Display */}
          <Section icon={Eye} title="Display">
            <Field label="Default view on launch" hint="Which tab Studio opens to on a fresh page load.">
              <select
                value={settings.defaultView}
                onChange={(e) => settings.update({ defaultView: e.target.value as ViewMode })}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-primary-500"
              >
                {VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle
              label="Sidebar open by default"
              checked={settings.defaultSidebarOpen}
              onChange={(v) => settings.update({ defaultSidebarOpen: v })}
            />
            <Toggle
              label="Auto-scroll lists by default"
              hint="Applies to the Requests and Logs timelines."
              checked={settings.defaultAutoScroll}
              onChange={(v) => settings.update({ defaultAutoScroll: v })}
            />
            <Field label="Default log levels" hint="Levels checked here are visible by default in the Logs view.">
              <div className="flex flex-wrap gap-2">
                {LOG_LEVELS.map((level) => {
                  const checked = settings.defaultLogLevels.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        const next = checked
                          ? settings.defaultLogLevels.filter((l) => l !== level)
                          : [...settings.defaultLogLevels, level];
                        settings.update({ defaultLogLevels: next });
                      }}
                      className={cn(
                        'px-2 py-1 text-[11px] font-mono uppercase rounded border transition-colors',
                        checked
                          ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                          : 'border-gray-800 text-gray-600 hover:text-gray-400',
                      )}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          {/* About */}
          <Section icon={Info} title="About">
            <div className="space-y-2 text-sm text-gray-300">
              <Row label="Studio UI" value={getStudioVersion()} />
              <Row label="Agent" value={connected ? 'connected' : 'offline'} valueClass={connected ? 'text-success-500' : 'text-error-500'} />
              <Row label="Agent URL" value={agentUrl} mono copy />
              <Row label="Recorded exchanges" value={`${exchanges.length}`} />
              <Row label="Buffered log lines" value={`${logs.length}`} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-500" />
                  <span className="text-sm text-gray-300">Reset all settings to defaults?</span>
                  <button
                    onClick={() => {
                      settings.reset();
                      setConfirmReset(false);
                    }}
                    className="ml-auto px-3 py-1.5 text-xs bg-error-500/20 border border-error-500/40 text-error-300 hover:bg-error-500/30 rounded"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 hover:text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 hover:text-error-400 hover:border-error-500/50 rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset all settings
                </button>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Reusable form pieces
// ────────────────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0 mt-0.5',
          checked ? 'bg-primary-500' : 'bg-gray-700',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-0.5',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
      <div className="min-w-0">
        <div className="text-sm text-gray-200">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(n);
      }}
      min={min}
      max={max}
      step={step}
      className="w-32 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-primary-500"
    />
  );
}

function Row({
  label,
  value,
  mono,
  copy,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
  valueClass?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500 w-32 shrink-0">{label}</span>
      <span
        className={cn(
          'truncate flex-1',
          mono && 'font-mono text-xs',
          valueClass,
        )}
      >
        {value}
      </span>
      {copy && (
        <button
          onClick={async () => {
            await copyToClipboard(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-gray-500 hover:text-gray-200"
          title="Copy"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function ConnectionStatus({ connected, liveUrl }: { connected: boolean; liveUrl: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          connected ? 'bg-success-500 animate-pulse' : 'bg-error-500',
        )}
      />
      <span className={connected ? 'text-success-500' : 'text-error-500'}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      <span className="text-gray-600 truncate">→ {liveUrl}</span>
    </div>
  );
}

/**
 * Picks the UI build version from a global injected at build time. Falls
 * back to "dev" so users on `npm run dev:ui` aren't shown an empty value.
 */
function getStudioVersion(): string {
  const v = (window as unknown as { __STUDIO_VERSION__?: string }).__STUDIO_VERSION__;
  return v ?? 'dev';
}
