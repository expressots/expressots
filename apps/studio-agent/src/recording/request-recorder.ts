/**
 * Request/Response recorder for ExpressoTS Studio
 * Stores request/response pairs for replay functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type {
  RecordedRequest,
  RecordedResponse,
  RecordedExchange,
  TraceInfo,
  HttpMethod,
} from '../types/index.js';

/**
 * Minimal structural types for the slice of `node:sqlite` we use. Declaring
 * them locally (instead of importing from `@types/node`) keeps the recorder
 * independent of the installed `@types/node` version and avoids a hard
 * module-resolution dependency on `node:sqlite` types at build time.
 */
interface SqliteStatement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface SqliteCountRow {
  count: number;
}

interface SqliteAvgRow {
  avg: number | null;
}

interface SqlitePathCountRow {
  path: string;
  count: number;
}

interface SqliteMethodCountRow {
  method: string;
  count: number;
}

interface SqliteRequestRow {
  id: string;
  trace_id: string | null;
  timestamp: number;
  method: string;
  path: string;
  url: string;
  headers: string;
  query: string;
  body: string | null;
  cookies: string | null;
}

interface SqliteResponseRow {
  id: string;
  request_id: string;
  trace_id: string | null;
  timestamp: number;
  status_code: number;
  status_message: string;
  headers: string;
  body: string | null;
  duration: number;
}

interface SqliteTraceRow {
  trace_id: string;
  request_id: string | null;
  data: string;
  timestamp: number;
}

interface SqliteExchangeRow extends SqliteRequestRow {
  res_id: string | null;
  res_timestamp: number | null;
  status_code: number | null;
  status_message: string | null;
  res_headers: string | null;
  res_body: string | null;
  duration: number | null;
  trace_data: string | null;
}
interface NodeSqliteModule {
  DatabaseSync: new (path: string) => SqliteDatabase;
}

/**
 * Lazily load Node's built-in `node:sqlite` (added in Node 22.5, unflagged
 * since 22.13). Returns `null` when unavailable so the caller can disable
 * recording gracefully instead of crashing on older runtimes.
 *
 * On Node 22.x the module emits a one-time `ExperimentalWarning` at load
 * time. Because the agent runs inside the host app's process, we suppress
 * only that single warning for the duration of the import and restore the
 * original `process.emitWarning` immediately after, leaving every other
 * warning untouched. The warning is already gone on Node >=24.15.
 */
async function loadNodeSqlite(): Promise<NodeSqliteModule | null> {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    const name =
      typeof warning === 'string'
        ? (args[0] as string | undefined)
        : warning?.name;
    const text = typeof warning === 'string' ? warning : warning?.message;
    if (name === 'ExperimentalWarning' && /SQLite/i.test(String(text))) {
      return;
    }
    return (original as (...a: unknown[]) => void)(warning, ...args);
  }) as typeof process.emitWarning;

  try {
    // Non-literal specifier so TypeScript treats this as a dynamic import
    // (`Promise<any>`) and does not require `node:sqlite` to be present in
    // the resolved `@types/node`.
    const specifier = 'node:sqlite';
    const mod = (await import(specifier)) as NodeSqliteModule;
    return mod && typeof mod.DatabaseSync === 'function' ? mod : null;
  } catch {
    return null;
  } finally {
    process.emitWarning = original;
  }
}

/**
 * Persists request/response/trace exchanges to a local SQLite database
 * so the Studio UI can browse, search, and replay recorded traffic.
 *
 * Backed by Node's built-in `node:sqlite` (Node >= 22.5). On older
 * runtimes the recorder degrades gracefully: writes become no-ops and
 * reads return empty results, while the rest of Studio keeps working.
 * Storage is bounded; once the exchange count exceeds `maxExchanges`,
 * the oldest entries are deleted.
 *
 * Lifecycle: construct, `await initialize()`, check `isAvailable()`,
 * and `close()` on shutdown.
 */
export class RequestRecorder {
  private db: SqliteDatabase | null = null;
  private dbPath: string;
  private maxExchanges: number;
  private initialized: boolean = false;

  /**
   * Create a recorder.
   *
   * @param dbPath - Path to the SQLite database file. The parent
   *   directory is created on `initialize()`. Default: ".studio/studio.db".
   * @param maxExchanges - Maximum number of recorded requests to keep
   *   before the oldest are evicted. Default: 1000.
   */
  constructor(dbPath: string = '.studio/studio.db', maxExchanges: number = 1000) {
    this.dbPath = dbPath;
    this.maxExchanges = maxExchanges;
  }

  /**
   * Whether the SQLite backend is available and ready. When `false`,
   * recording is a no-op and reads return empty results (e.g. on Node
   * < 22.5 where `node:sqlite` does not exist).
   */
  isAvailable(): boolean {
    return this.db !== null;
  }

  /**
   * Initialize the database. Never throws: if `node:sqlite` is unavailable
   * the recorder stays disabled and the rest of Studio continues to work.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const sqlite = await loadNodeSqlite();
    if (!sqlite) {
      // Node < 22.5 (or a build without node:sqlite). Recording is optional;
      // every other Studio feature works without it.
      return;
    }

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite.DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        trace_id TEXT,
        timestamp INTEGER NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT NOT NULL,
        query TEXT NOT NULL,
        body TEXT,
        cookies TEXT
      );

      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        trace_id TEXT,
        timestamp INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        status_message TEXT NOT NULL,
        headers TEXT NOT NULL,
        body TEXT,
        duration INTEGER NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS traces (
        trace_id TEXT PRIMARY KEY,
        request_id TEXT,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
      CREATE INDEX IF NOT EXISTS idx_requests_trace_id ON requests(trace_id);
      CREATE INDEX IF NOT EXISTS idx_requests_path ON requests(path);
      CREATE INDEX IF NOT EXISTS idx_responses_request_id ON responses(request_id);
    `);
  }

  /**
   * Record an incoming HTTP request.
   *
   * @param method - HTTP method of the request.
   * @param path - Request path (without host), e.g. "/users/1".
   * @param url - Original URL as received by Express.
   * @param headers - Request headers.
   * @param query - Parsed query string parameters.
   * @param body - Parsed request body, when present.
   * @param cookies - Parsed cookies, when present.
   * @param traceId - OpenTelemetry trace id to correlate with spans.
   * @returns The recorded request, including its generated id. When the
   *   SQLite backend is unavailable, the record is returned in-memory
   *   without being persisted.
   */
  recordRequest(
    method: HttpMethod,
    path: string,
    url: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    body?: unknown,
    cookies?: Record<string, string>,
    traceId?: string
  ): RecordedRequest {
    const id = randomUUID();
    const timestamp = Date.now();

    const request: RecordedRequest = {
      id,
      traceId: traceId || '',
      timestamp,
      method,
      path,
      url,
      headers,
      query,
      body,
      cookies,
    };

    // Recording disabled / SQLite unavailable: return the in-memory record
    // without persisting so callers depending on the id still work.
    if (!this.db) return request;

    const stmt = this.db.prepare(`
      INSERT INTO requests (id, trace_id, timestamp, method, path, url, headers, query, body, cookies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      traceId || null,
      timestamp,
      method,
      path,
      url,
      JSON.stringify(headers),
      JSON.stringify(query),
      body ? JSON.stringify(body) : null,
      cookies ? JSON.stringify(cookies) : null
    );

    // Cleanup old entries if needed
    this.cleanup();

    return request;
  }

  /**
   * Record the response paired with a previously recorded request.
   *
   * @param requestId - Id returned by the matching `recordRequest()` call.
   * @param statusCode - HTTP status code.
   * @param statusMessage - HTTP status message.
   * @param headers - Response headers.
   * @param body - Parsed response body, when present.
   * @param duration - Request handling time in milliseconds.
   * @param traceId - OpenTelemetry trace id to correlate with spans.
   * @returns The recorded response, including its generated id. Returned
   *   in-memory without persisting when the SQLite backend is unavailable.
   */
  recordResponse(
    requestId: string,
    statusCode: number,
    statusMessage: string,
    headers: Record<string, string>,
    body?: unknown,
    duration?: number,
    traceId?: string
  ): RecordedResponse {
    const id = randomUUID();
    const timestamp = Date.now();

    const response: RecordedResponse = {
      id,
      requestId,
      traceId: traceId || '',
      timestamp,
      statusCode,
      statusMessage,
      headers,
      body,
      duration: duration || 0,
    };

    if (!this.db) return response;

    const stmt = this.db.prepare(`
      INSERT INTO responses (id, request_id, trace_id, timestamp, status_code, status_message, headers, body, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      requestId,
      traceId || null,
      timestamp,
      statusCode,
      statusMessage,
      JSON.stringify(headers),
      body ? JSON.stringify(body) : null,
      duration || 0
    );

    return response;
  }

  /**
   * Record (or replace) the OpenTelemetry trace for a trace id.
   *
   * @param traceId - Trace id; an existing row with the same id is replaced.
   * @param trace - Complete trace (root span plus children).
   * @param requestId - Optional recorded request to associate the trace with.
   */
  recordTrace(traceId: string, trace: TraceInfo, requestId?: string): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO traces (trace_id, request_id, data, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(traceId, requestId || null, JSON.stringify(trace), Date.now());
  }

  /**
   * Get a single recorded exchange by its request id.
   *
   * @param requestId - Id of the recorded request.
   * @returns The request with its response and trace (when recorded), or
   *   null when the id is unknown or the backend is unavailable. A
   *   placeholder response with status 0 is returned when no response
   *   was recorded for the request.
   */
  getExchange(requestId: string): RecordedExchange | null {
    if (!this.db) return null;

    const requestStmt = this.db.prepare('SELECT * FROM requests WHERE id = ?');
    const requestRow = requestStmt.get(requestId) as SqliteRequestRow | undefined;
    if (!requestRow) return null;

    const responseStmt = this.db.prepare(
      'SELECT * FROM responses WHERE request_id = ?'
    );
    const responseRow = responseStmt.get(requestId) as SqliteResponseRow | undefined;

    const traceStmt = this.db.prepare(
      'SELECT * FROM traces WHERE request_id = ? OR trace_id = ?'
    );
    const traceRow = traceStmt.get(requestId, requestRow.trace_id ?? '') as SqliteTraceRow | undefined;

    return {
      id: requestRow.id,
      request: {
        id: requestRow.id,
        traceId: requestRow.trace_id || '',
        timestamp: requestRow.timestamp,
        method: requestRow.method as HttpMethod,
        path: requestRow.path,
        url: requestRow.url,
        headers: JSON.parse(requestRow.headers),
        query: JSON.parse(requestRow.query),
        body: requestRow.body ? JSON.parse(requestRow.body) : undefined,
        cookies: requestRow.cookies ? JSON.parse(requestRow.cookies) : undefined,
      },
      response: responseRow
        ? {
            id: responseRow.id,
            requestId: responseRow.request_id,
            traceId: responseRow.trace_id || '',
            timestamp: responseRow.timestamp,
            statusCode: responseRow.status_code,
            statusMessage: responseRow.status_message,
            headers: JSON.parse(responseRow.headers),
            body: responseRow.body ? JSON.parse(responseRow.body) : undefined,
            duration: responseRow.duration,
          }
        : {
            id: '',
            requestId: requestRow.id,
            traceId: '',
            timestamp: 0,
            statusCode: 0,
            statusMessage: 'No response recorded',
            headers: {},
            duration: 0,
          },
      trace: traceRow ? JSON.parse(traceRow.data) : undefined,
    };
  }

  /**
   * Get recorded exchanges ordered newest first.
   *
   * @param limit - Maximum number of exchanges to return. Default: 100.
   * @param offset - Number of exchanges to skip (for pagination). Default: 0.
   * @returns The matching exchanges, or an empty array when the backend
   *   is unavailable.
   */
  getRecentExchanges(
    limit: number = 100,
    offset: number = 0
  ): RecordedExchange[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT r.*, 
             res.id as res_id, res.timestamp as res_timestamp, 
             res.status_code, res.status_message, 
             res.headers as res_headers, res.body as res_body, res.duration,
             t.data as trace_data
      FROM requests r
      LEFT JOIN responses res ON r.id = res.request_id
      LEFT JOIN traces t ON r.trace_id = t.trace_id
      ORDER BY r.timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as SqliteExchangeRow[];

    return rows.map((row) => this.mapExchangeRow(row));
  }

  /**
   * Map a joined SQLite row to a recorded exchange, coalescing nullable
   * LEFT JOIN columns from responses/traces.
   */
  private mapExchangeRow(row: SqliteExchangeRow): RecordedExchange {
    return {
      id: row.id,
      request: {
        id: row.id,
        traceId: row.trace_id || '',
        timestamp: row.timestamp,
        method: row.method as HttpMethod,
        path: row.path,
        url: row.url,
        headers: JSON.parse(row.headers),
        query: JSON.parse(row.query),
        body: row.body ? JSON.parse(row.body) : undefined,
        cookies: row.cookies ? JSON.parse(row.cookies) : undefined,
      },
      response: row.res_id
        ? {
            id: row.res_id,
            requestId: row.id,
            traceId: row.trace_id || '',
            timestamp: row.res_timestamp ?? 0,
            statusCode: row.status_code ?? 0,
            statusMessage: row.status_message ?? '',
            headers: JSON.parse(row.res_headers ?? '{}'),
            body: row.res_body ? JSON.parse(row.res_body) : undefined,
            duration: row.duration ?? 0,
          }
        : {
            id: '',
            requestId: row.id,
            traceId: '',
            timestamp: 0,
            statusCode: 0,
            statusMessage: 'No response recorded',
            headers: {},
            duration: 0,
          },
      trace: row.trace_data ? JSON.parse(row.trace_data) : undefined,
    };
  }

  /**
   * Search recorded exchanges by path substring, optionally filtered by
   * method.
   *
   * @param query - Substring matched against the recorded request path.
   * @param method - Optional HTTP method filter.
   * @param limit - Maximum number of results. Default: 100.
   * @returns Matching exchanges ordered newest first, or an empty array
   *   when the backend is unavailable.
   */
  searchExchanges(
    query: string,
    method?: HttpMethod,
    limit: number = 100
  ): RecordedExchange[] {
    if (!this.db) return [];

    let sql = `
      SELECT r.*, 
             res.id as res_id, res.timestamp as res_timestamp, 
             res.status_code, res.status_message, 
             res.headers as res_headers, res.body as res_body, res.duration,
             t.data as trace_data
      FROM requests r
      LEFT JOIN responses res ON r.id = res.request_id
      LEFT JOIN traces t ON r.trace_id = t.trace_id
      WHERE r.path LIKE ?
    `;

    const params: Array<string | number> = [`%${query}%`];

    if (method) {
      sql += ' AND r.method = ?';
      params.push(method);
    }

    sql += ' ORDER BY r.timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as SqliteExchangeRow[];

    return rows.map((row) => this.mapExchangeRow(row));
  }

  /**
   * Get aggregate statistics over all recorded traffic.
   *
   * @returns Total request and error counts, average duration, and
   *   request counts grouped by path (top 20) and by method. All zeros
   *   and empty maps when the backend is unavailable.
   */
  getStats(): {
    totalRequests: number;
    totalErrors: number;
    avgDuration: number;
    requestsByPath: Record<string, number>;
    requestsByMethod: Record<string, number>;
  } {
    if (!this.db) {
      return {
        totalRequests: 0,
        totalErrors: 0,
        avgDuration: 0,
        requestsByPath: {},
        requestsByMethod: {},
      };
    }

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM requests');
    const totalRow = totalStmt.get() as SqliteCountRow;

    const errorStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM responses WHERE status_code >= 400'
    );
    const errorRow = errorStmt.get() as SqliteCountRow;

    const avgStmt = this.db.prepare(
      'SELECT AVG(duration) as avg FROM responses'
    );
    const avgRow = avgStmt.get() as SqliteAvgRow;

    const pathStmt = this.db.prepare(
      'SELECT path, COUNT(*) as count FROM requests GROUP BY path ORDER BY count DESC LIMIT 20'
    );
    const pathRows = pathStmt.all() as SqlitePathCountRow[];

    const methodStmt = this.db.prepare(
      'SELECT method, COUNT(*) as count FROM requests GROUP BY method'
    );
    const methodRows = methodStmt.all() as SqliteMethodCountRow[];

    const requestsByPath: Record<string, number> = {};
    for (const row of pathRows) {
      requestsByPath[row.path] = row.count;
    }

    const requestsByMethod: Record<string, number> = {};
    for (const row of methodRows) {
      requestsByMethod[row.method] = row.count;
    }

    return {
      totalRequests: totalRow.count,
      totalErrors: errorRow.count,
      avgDuration: avgRow.avg || 0,
      requestsByPath,
      requestsByMethod,
    };
  }

  /**
   * Delete a recorded exchange. Associated responses and traces are
   * removed via cascade.
   *
   * @param requestId - Id of the recorded request to delete.
   */
  deleteExchange(requestId: string): void {
    if (!this.db) return;

    const stmt = this.db.prepare('DELETE FROM requests WHERE id = ?');
    stmt.run(requestId);
  }

  /** Delete every recorded request, response, and trace. */
  clearAll(): void {
    if (!this.db) return;

    this.db.exec('DELETE FROM traces');
    this.db.exec('DELETE FROM responses');
    this.db.exec('DELETE FROM requests');
  }

  /** Cleanup old entries if exceeding max */
  private cleanup(): void {
    if (!this.db) return;

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM requests');
    const row = countStmt.get() as SqliteCountRow;

    if (row.count > this.maxExchanges) {
      const deleteCount = row.count - this.maxExchanges;
      const deleteStmt = this.db.prepare(`
        DELETE FROM requests WHERE id IN (
          SELECT id FROM requests ORDER BY timestamp ASC LIMIT ?
        )
      `);
      deleteStmt.run(deleteCount);
    }
  }

  /**
   * Close the database connection. The recorder can be re-initialized
   * afterwards by calling `initialize()` again.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}
