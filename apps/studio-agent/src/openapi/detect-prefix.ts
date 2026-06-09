/**
 * Best-effort discovery of the application's global route prefix from
 * source.
 *
 * At runtime the agent learns the prefix from the adapter (after
 * `setGlobalRoutePrefix("/api")` runs). A headless CLI scan has no
 * running app, so we recover the same value statically by scanning the
 * source for the `setGlobalRoutePrefix("…")` call. This keeps a
 * CLI-generated spec's paths aligned with the ones Studio shows, so
 * drift detection against a committed spec doesn't produce false
 * positives.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const PREFIX_CALL = /setGlobalRoutePrefix\(\s*["'`]([^"'`]+)["'`]\s*\)/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.studio']);

/**
 * Scan a source directory for `setGlobalRoutePrefix("…")` and return the
 * literal prefix, or `undefined` when none is found (or the argument is
 * not a string literal).
 *
 * @param srcDir - source root to scan (e.g. `./src`).
 * @param maxFiles - safety cap on files visited (default 2000).
 */
export function detectGlobalPrefix(
  srcDir: string,
  maxFiles = 2000,
): string | undefined {
  let visited = 0;

  const walk = (dir: string): string | undefined => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return undefined;
    }

    // Probe `app.ts` first — the conventional home of the call.
    entries.sort((a, b) => {
      const aApp = a.isFile() && a.name === 'app.ts' ? -1 : 0;
      const bApp = b.isFile() && b.name === 'app.ts' ? -1 : 0;
      return aApp - bApp;
    });

    const subdirs: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) subdirs.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) continue;
      if (visited++ >= maxFiles) return undefined;
      try {
        const content = fs.readFileSync(full, 'utf-8');
        const match = content.match(PREFIX_CALL);
        if (match) return match[1];
      } catch {
        // Unreadable file — skip.
      }
    }

    for (const sub of subdirs) {
      const found = walk(sub);
      if (found) return found;
    }
    return undefined;
  };

  return walk(path.resolve(srcDir));
}
