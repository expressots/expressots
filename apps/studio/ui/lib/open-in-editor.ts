/**
 * Open a file at a specific line in the user's editor.
 *
 * Uses the `vscode://file/<absolute-path>:<line>:<col>` URL scheme which
 * is registered by both VS Code and Cursor on every supported OS. If the
 * editor is not installed nothing happens (the OS shows a "no app" dialog).
 *
 * Paths must be absolute. On Windows, vscode:// expects forward slashes
 * (the protocol handler converts them back to backslashes internally).
 */

export interface OpenInEditorTarget {
  filePath?: string;
  lineNumber?: number;
  column?: number;
}

/** Build the vscode:// URL for a target (returns null if the path is missing). */
export function buildEditorUrl(target: OpenInEditorTarget): string | null {
  if (!target.filePath) return null;
  let p = target.filePath.replace(/\\/g, '/');
  // Strip Windows drive letter colon? No — vscode:// expects "C:/path".
  // But the URI needs an authority: vscode://file/C:/path  → strip leading "/" on Windows.
  // Both forms work in practice; we keep the leading "/" only for POSIX paths.
  if (!p.startsWith('/')) {
    // Windows path like "C:/Users/..." — vscode:// expects /C:/Users/... so add it
    p = '/' + p;
  }
  const line = target.lineNumber ?? 1;
  const col = target.column ?? 1;
  return `vscode://file${p}:${line}:${col}`;
}

/** Trigger the editor to open the target. No-op if the target lacks a path. */
export function openInEditor(target: OpenInEditorTarget): void {
  const url = buildEditorUrl(target);
  if (!url) return;
  // Use location.href so the browser delegates to the OS protocol handler.
  // window.open() is blocked by some popup blockers for non-http schemes.
  window.location.href = url;
}
