/**
 * On-disk cache for OSV.dev advisory lookups.
 *
 * The OSV batch endpoint is generous but not infinite — repeating a
 * scan in a project with 500+ deps every few minutes would burn quota
 * fast. We cache results in `.studio/security-cache.json` keyed by
 * `(ecosystem, package, version)` with a 6h TTL, so subsequent scans
 * inside the TTL do zero network work for stable deps.
 *
 * The cache is best-effort: any I/O / parse error degrades to a
 * cache-miss rather than failing the scan.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_VERSION = 1;

interface CacheEntry {
  /** Wall-clock ms when this entry was stored. */
  storedAt: number;
  /**
   * Whatever OSV returned for this package@version. We persist the
   * already-normalised set of advisory ids/severities instead of the
   * raw OSV payload so cache hits don't have to re-parse it.
   */
  advisories: OsvAdvisory[];
}

/** A normalised OSV advisory as stored in (and served from) the cache. */
export interface OsvAdvisory {
  id: string;
  aliases: string[];
  summary: string;
  details?: string;
  severity?: number;
  references: string[];
  fixedVersion?: string;
}

interface CacheFile {
  version: number;
  entries: Record<string, CacheEntry>;
}

function cacheKey(ecosystem: string, name: string, version: string): string {
  return `${ecosystem}|${name}|${version}`;
}

/**
 * Best-effort on-disk cache of normalised OSV advisories, keyed by
 * `(ecosystem, package, version)` with a 6 hour TTL. Lives next to the
 * agent database (`.studio/security-cache.json`). Writes are coalesced;
 * call `flush()` at the end of a scan to persist.
 */
export class OsvCache {
  private readonly filePath: string;
  private data: CacheFile = { version: CACHE_VERSION, entries: {} };
  private loaded = false;
  private dirty = false;
  /**
   * Throttle disk writes — many cache puts inside one scan would
   * otherwise produce many sequential writes. We coalesce into a
   * single fsync at the end of a scan via `flush()`.
   */

  constructor(dbPath: string) {
    // Co-locate with the studio db file so users only need to gitignore
    // one folder (`.studio/`) to opt out of committing tooling state.
    this.filePath = path.join(path.dirname(dbPath), 'security-cache.json');
  }

  /** Load cache from disk; safe to call repeatedly. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed?.version === CACHE_VERSION && parsed.entries) {
        this.data = parsed;
      }
    } catch {
      // Missing file or corrupt JSON — start fresh, don't crash the scan.
    }
  }

  /**
   * Look up advisories for a package@version. Returns null on miss /
   * expired entry; callers should then fall back to a network query.
   */
  get(ecosystem: string, name: string, version: string): OsvAdvisory[] | null {
    this.load();
    const entry = this.data.entries[cacheKey(ecosystem, name, version)];
    if (!entry) return null;
    if (Date.now() - entry.storedAt > TTL_MS) return null;
    return entry.advisories;
  }

  /** Store advisories for a package@version. Flush() persists to disk. */
  put(
    ecosystem: string,
    name: string,
    version: string,
    advisories: OsvAdvisory[],
  ): void {
    this.load();
    this.data.entries[cacheKey(ecosystem, name, version)] = {
      storedAt: Date.now(),
      advisories,
    };
    this.dirty = true;
  }

  /**
   * Persist any pending writes. Safe to call when there's nothing to
   * flush. Failures are swallowed because the cache is an optimisation
   * — losing it just means the next scan pays one more OSV roundtrip.
   */
  flush(): void {
    if (!this.dirty) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data));
      this.dirty = false;
    } catch {
      // best-effort
    }
  }

  /** Drop everything. Exposed for tests / future "clear cache" UI. */
  clear(): void {
    this.data = { version: CACHE_VERSION, entries: {} };
    this.dirty = true;
  }
}
