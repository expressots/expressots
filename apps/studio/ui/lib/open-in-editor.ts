/**
 * Open a file at a specific line in the user's editor.
 *
 * Each supported editor registers its own URL scheme. The selected scheme
 * is read from the persisted settings store, so a user on Cursor doesn't
 * keep launching VS Code (and vice versa).
 *
 * Paths must be absolute. All schemes accept forward slashes on every OS
 * — Windows drive letters are kept intact (`/C:/Users/...`).
 */

import { useSettings, type EditorScheme } from '../stores/settings-store';

export interface OpenInEditorTarget {
  filePath?: string;
  lineNumber?: number;
  column?: number;
}

/**
 * Prefix used for each scheme. The path is appended verbatim followed by
 * `:line:col`. WebStorm / IDEA use the JetBrains "Toolbox" protocol which
 * understands a different shape; we fall back to a vscode-compatible URL
 * if Toolbox isn't installed (it's harmless — the OS just shows "no app").
 */
const SCHEME_PREFIX: Record<Exclude<EditorScheme, 'custom'>, string> = {
  vscode: 'vscode://file',
  cursor: 'cursor://file',
  webstorm: 'webstorm://open?file=',
  idea: 'idea://open?file=',
  sublime: 'subl://open?url=file://',
};

function getActivePrefix(): string {
  const s = useSettings.getState();
  if (s.editorScheme === 'custom') return s.customEditorPrefix || 'vscode://file';
  return SCHEME_PREFIX[s.editorScheme] ?? 'vscode://file';
}

/** Build the editor URL for a target (returns null if the path is missing). */
export function buildEditorUrl(target: OpenInEditorTarget): string | null {
  if (!target.filePath) return null;

  let p = target.filePath.replace(/\\/g, '/');
  if (!p.startsWith('/')) p = '/' + p; // ensures /C:/… on Windows

  const line = target.lineNumber ?? 1;
  const col = target.column ?? 1;
  const prefix = getActivePrefix();

  // The JetBrains schemes (webstorm/idea) use `?file=PATH&line=N` instead of
  // a colon-separated tail. Detect and adapt.
  if (prefix.endsWith('?file=')) {
    return `${prefix}${encodeURIComponent(p)}&line=${line}&column=${col}`;
  }
  if (prefix.endsWith('?url=file://')) {
    return `${prefix}${encodeURIComponent(p)}:${line}:${col}`;
  }
  return `${prefix}${p}:${line}:${col}`;
}

/** Trigger the editor to open the target. No-op if the target lacks a path. */
export function openInEditor(target: OpenInEditorTarget): void {
  const url = buildEditorUrl(target);
  if (!url) return;
  // Use location.href so the browser delegates to the OS protocol handler.
  // window.open() is blocked by some popup blockers for non-http schemes.
  window.location.href = url;
}
