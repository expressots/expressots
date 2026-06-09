/**
 * OpenAPI panel for the API Client view.
 *
 * Two capabilities, both dev-time:
 *   1. Download / copy the full-app OpenAPI 3.1 document the agent
 *      generates from routes + recorded traffic.
 *   2. Check "spec drift" — diff a committed `openapi.json` against what
 *      the running app actually exposes and returns.
 */

import { useState } from 'react';
import {
  FileJson,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn, copyToClipboard } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import type { SpecDriftFinding, SpecDriftReport } from '../types';

export function OpenApiPanel() {
  const { openApiDoc, specDrift } = useAppStore();
  const { requestOpenApi, requestOpenApiDrift } = useSocket();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [specPath, setSpecPath] = useState('openapi.json');
  const [checking, setChecking] = useState(false);

  const pathCount = openApiDoc ? Object.keys(openApiDoc.paths ?? {}).length : 0;
  const provenance = openApiDoc?.info?.['x-expressots-generated'];

  const handleDownload = () => {
    if (!openApiDoc) return;
    const blob = new Blob([JSON.stringify(openApiDoc, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!openApiDoc) return;
    const ok = await copyToClipboard(JSON.stringify(openApiDoc, null, 2));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCheckDrift = () => {
    setChecking(true);
    requestOpenApiDrift({ specPath: specPath.trim() || 'openapi.json' });
    // The result arrives over WS; clear the spinner shortly after.
    setTimeout(() => setChecking(false), 1200);
  };

  const driftError =
    specDrift && 'error' in specDrift ? specDrift.error : null;
  const driftReport =
    specDrift && !('error' in specDrift) ? (specDrift as SpecDriftReport) : null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        )}
        <FileJson className="w-4 h-4 text-primary-400" />
        <span className="text-xs uppercase tracking-wide text-gray-400">OpenAPI spec</span>
        {openApiDoc && (
          <span className="text-[11px] text-gray-600 normal-case">
            {pathCount} path{pathCount === 1 ? '' : 's'}
            {provenance ? ` · ${provenance}` : ''}
          </span>
        )}
        {driftReport && driftReport.findings.length > 0 && (
          <span className="ml-auto text-[11px] text-warning-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {driftReport.findings.length} drift finding
            {driftReport.findings.length === 1 ? '' : 's'}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
          {/* Generate / export controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => requestOpenApi()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <button
              onClick={handleDownload}
              disabled={!openApiDoc}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs',
                openApiDoc
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed',
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Download openapi.json
            </button>
            <button
              onClick={handleCopy}
              disabled={!openApiDoc}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs',
                openApiDoc
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed',
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy spec'}
            </button>
          </div>

          <p className="text-[11px] text-gray-500">
            Generated from your routes and recorded traffic. Marked{' '}
            <span className="font-mono">{provenance ?? 'inferred'}</span> — review before publishing
            as a contract.
          </p>

          {/* Drift detection */}
          <div className="space-y-2 border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Spec drift</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={specPath}
                onChange={(e) => setSpecPath(e.target.value)}
                placeholder="openapi.json"
                className="flex-1 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-xs font-mono text-gray-200 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleCheckDrift}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', checking && 'animate-spin')} />
                Check drift
              </button>
            </div>

            {driftError && (
              <p className="text-xs text-error-500">{driftError}</p>
            )}

            {driftReport && driftReport.findings.length === 0 && (
              <p className="text-xs text-success-500">
                No drift detected against {specPath} ({driftReport.exchangeCount} exchanges
                considered).
              </p>
            )}

            {driftReport && driftReport.findings.length > 0 && (
              <div className="space-y-1">
                {driftReport.findings.map((f, i) => (
                  <DriftRow key={`${f.rule}-${f.method}-${f.path}-${i}`} finding={f} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DriftRow({ finding }: { finding: SpecDriftFinding }) {
  const color =
    finding.severity === 'error'
      ? 'text-error-500 border-error-500/30'
      : finding.severity === 'warning'
        ? 'text-warning-500 border-warning-500/30'
        : 'text-gray-400 border-gray-700';
  return (
    <div className={cn('text-[11px] rounded border px-2 py-1.5 bg-gray-950/40', color)}>
      <span className="font-mono uppercase mr-2">{finding.severity}</span>
      <span className="text-gray-300">{finding.message}</span>
    </div>
  );
}
