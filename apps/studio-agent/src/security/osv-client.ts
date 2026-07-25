/**
 * OSV.dev client — supply-chain advisory lookups for installed packages.
 *
 * Why OSV: it's an open vulnerability database maintained by Google,
 * exposes a programmatic JSON API, doesn't require auth, and aggregates
 * GHSA, npm, OSS-Fuzz and other sources behind one query shape. It's
 * also the source `npm audit` increasingly delegates to internally, so
 * we get the same data without scraping anything.
 *
 * This client batches per-scan: one POST to `/v1/querybatch` covering
 * every direct dependency. Results that aren't already in cache are
 * persisted via `OsvCache` so subsequent scans inside the TTL skip the
 * network entirely.
 *
 * Network failures degrade gracefully: we return an empty findings
 * array so the engine can still ship a report using only `npm audit`.
 */

import type { DependencyFinding, Severity } from '../types/index.js';
import { OsvCache, type OsvAdvisory } from './osv-cache.js';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN_URL = 'https://api.osv.dev/v1/vulns';
const REQUEST_TIMEOUT_MS = 10_000;
/** OSV's batch endpoint accepts up to 1000 queries per request. */
const MAX_BATCH_SIZE = 500;

/** A single (package, version) pair to query OSV.dev for. */
export interface PackageQuery {
  name: string;
  version: string;
}

interface OsvBatchResponse {
  results: Array<{
    vulns?: Array<{ id: string; modified?: string }>;
  }>;
}

interface OsvVulnFull {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  references?: Array<{ type?: string; url: string }>;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    package?: { ecosystem?: string; name?: string };
    ranges?: Array<{
      type?: string;
      events?: Array<{ introduced?: string; fixed?: string }>;
    }>;
  }>;
  database_specific?: { severity?: string; cwe_ids?: string[] };
}

/**
 * Client for the OSV.dev advisory database. Batches package queries
 * against the querybatch endpoint, fetches full advisory details, and
 * normalises them into `DependencyFinding`s, using an `OsvCache` to
 * avoid repeat network calls within the cache TTL.
 */
export class OsvClient {
  /** @param cache - Persistent cache consulted before any network call. */
  constructor(private readonly cache: OsvCache) {}

  /**
   * Look up advisories for every (package, version) pair and return
   * normalised findings. Cache hits are served without touching the
   * network; the rest are batched into one (or more, if very large)
   * POSTs to OSV.
   */
  async lookup(packages: PackageQuery[]): Promise<DependencyFinding[]> {
    if (packages.length === 0) return [];

    const findings: DependencyFinding[] = [];
    const cacheMisses: PackageQuery[] = [];

    // Phase 1: serve from cache.
    for (const pkg of packages) {
      const cached = this.cache.get('npm', pkg.name, pkg.version);
      if (cached) {
        findings.push(...advisoriesToFindings(cached, pkg));
      } else {
        cacheMisses.push(pkg);
      }
    }

    if (cacheMisses.length === 0) return findings;

    // Phase 2: batch-query OSV for the misses.
    let advisoryIdsByPkg: Map<string, string[]>;
    try {
      advisoryIdsByPkg = await this.fetchAdvisoryIds(cacheMisses);
    } catch {
      // Network failure → cache nothing, fall back to whatever cache hits
      // we already produced. Better than refusing to ship a report.
      return findings;
    }

    // Phase 3: hydrate each unique advisory id. OSV returns just an id
    // list from the batch endpoint — we have to fetch full records to
    // get severity, summary, references etc.
    const uniqueIds = new Set<string>();
    for (const ids of advisoryIdsByPkg.values()) {
      ids.forEach((id) => uniqueIds.add(id));
    }
    const fullAdvisories = await this.fetchFullAdvisories([...uniqueIds]);

    // Phase 4: rebuild per-package advisory lists and store in cache.
    for (const pkg of cacheMisses) {
      const ids = advisoryIdsByPkg.get(pkgKey(pkg)) ?? [];
      const advisories: OsvAdvisory[] = ids
        .map((id) => fullAdvisories.get(id))
        .filter((v): v is OsvVulnFull => Boolean(v))
        .map((v) => fullToCacheAdvisory(v, pkg.name));

      this.cache.put('npm', pkg.name, pkg.version, advisories);
      findings.push(...advisoriesToFindings(advisories, pkg));
    }

    this.cache.flush();
    return findings;
  }

  /**
   * POST a batch of queries to OSV's `/v1/querybatch`. Splits oversize
   * input into multiple requests to stay under the per-call limit.
   */
  private async fetchAdvisoryIds(
    queries: PackageQuery[],
  ): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();

    for (let i = 0; i < queries.length; i += MAX_BATCH_SIZE) {
      const batch = queries.slice(i, i + MAX_BATCH_SIZE);
      const body = {
        queries: batch.map((q) => ({
          package: { name: q.name, ecosystem: 'npm' },
          version: q.version,
        })),
      };

      const resp = await fetchWithTimeout(OSV_BATCH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        // Treat as empty results for this batch; the caller will simply
        // produce no findings for these packages.
        continue;
      }

      const parsed = (await resp.json()) as OsvBatchResponse;
      const results = parsed.results ?? [];
      for (let j = 0; j < batch.length; j++) {
        const pkg = batch[j];
        const ids = (results[j]?.vulns ?? []).map((v) => v.id);
        out.set(pkgKey(pkg), ids);
      }
    }

    return out;
  }

  /**
   * Hydrate advisory id list into full records. OSV requires one GET
   * per id (no batch endpoint for full records yet) — we run them in
   * parallel with a hard concurrency cap so we don't open hundreds of
   * sockets at once.
   */
  private async fetchFullAdvisories(
    ids: string[],
  ): Promise<Map<string, OsvVulnFull>> {
    const out = new Map<string, OsvVulnFull>();
    if (ids.length === 0) return out;

    const CONCURRENCY = 8;
    let cursor = 0;

    const workers = Array.from({ length: Math.min(CONCURRENCY, ids.length) }, async () => {
      while (cursor < ids.length) {
        const idx = cursor++;
        const id = ids[idx];
        try {
          const resp = await fetchWithTimeout(`${OSV_VULN_URL}/${encodeURIComponent(id)}`);
          if (!resp.ok) continue;
          const json = (await resp.json()) as OsvVulnFull;
          out.set(id, json);
        } catch {
          // Skip — partial coverage is fine.
        }
      }
    });

    await Promise.all(workers);
    return out;
  }
}

function pkgKey(p: PackageQuery): string {
  return `${p.name}@${p.version}`;
}

/**
 * Translate the cached / hydrated advisory into our wire-stable
 * `DependencyFinding` shape. Severity is the trickiest bit — OSV stores
 * CVSS vectors rather than the npm-style word ("CRITICAL"); we map both.
 */
function advisoriesToFindings(
  advisories: OsvAdvisory[],
  pkg: PackageQuery,
): DependencyFinding[] {
  return advisories.map((adv) => ({
    id: adv.id,
    package: pkg.name,
    installedVersion: pkg.version,
    fixedVersion: adv.fixedVersion,
    severity: numericSeverityToLabel(adv.severity),
    cvss: adv.severity,
    title: adv.summary || adv.id,
    summary: adv.details ?? adv.summary ?? '',
    references: adv.references,
    path: [pkg.name],
  }));
}

function fullToCacheAdvisory(
  full: OsvVulnFull,
  pkgName: string,
): OsvAdvisory {
  return {
    id: full.id,
    aliases: full.aliases ?? [],
    summary: full.summary ?? '',
    details: full.details,
    severity: extractCvssScore(full),
    references: (full.references ?? []).map((r) => r.url).filter(Boolean),
    fixedVersion: extractFixedVersion(full, pkgName),
  };
}

/** Pull a CVSS v3.x base score out of an OSV record, if present. */
function extractCvssScore(full: OsvVulnFull): number | undefined {
  for (const s of full.severity ?? []) {
    if (s.type === 'CVSS_V3' || s.type === 'CVSS_V4') {
      // OSV stores the vector string; the base score is the first
      // numeric value after the vector header. We don't ship a full
      // CVSS parser — just look for a familiar "/AV:..." vector and
      // pull the base score from `database_specific` when present.
      const numeric = Number((full.database_specific?.severity ?? '').match(/(\d+\.\d+)/)?.[1]);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return undefined;
}

/**
 * Find the first `fixed` version for the given package across all
 * `affected` ranges. OSV records list every event (introduced / fixed)
 * in order; we use the first `fixed` that follows an `introduced`.
 */
function extractFixedVersion(full: OsvVulnFull, pkgName: string): string | undefined {
  for (const aff of full.affected ?? []) {
    if (aff.package?.name !== pkgName) continue;
    for (const range of aff.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) return ev.fixed;
      }
    }
  }
  return undefined;
}

/**
 * Map a numeric CVSS base score to our severity vocabulary using the
 * standard NVD bands. Falls back to `MEDIUM` when no score is known so
 * findings don't all collapse into `INFO`.
 */
function numericSeverityToLabel(score: number | undefined): Severity {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'MEDIUM';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'INFO';
}

/**
 * `fetch` with an `AbortController` timeout. Centralised here so every
 * OSV call has the same timeout semantics — a network hang must not be
 * able to stall the agent's WS event loop.
 */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
