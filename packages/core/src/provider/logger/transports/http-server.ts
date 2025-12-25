import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

/**
 * Log buffer for in-memory log storage.
 */
class LogBuffer {
  private buffer: Array<LogEntry> = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  add(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift(); // Remove oldest entry
    }
  }

  query(options: LogQueryOptions): Array<LogEntry> {
    let results = [...this.buffer];

    // Filter by level
    if (options.level) {
      results = results.filter((entry) => entry.level === options.level);
    }

    // Filter by context
    if (options.context) {
      results = results.filter((entry) => entry.context === options.context);
    }

    // Filter by time range
    if (options.startTime) {
      results = results.filter(
        (entry) => entry.timestamp.getTime() >= options.startTime!,
      );
    }
    if (options.endTime) {
      results = results.filter(
        (entry) => entry.timestamp.getTime() <= options.endTime!,
      );
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(
        (entry) =>
          entry.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.data || {})
            .toLowerCase()
            .includes(searchLower),
      );
    }

    // Sort (newest first by default)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  clear(): void {
    this.buffer = [];
  }

  getStats(): LogStats {
    const levels: Record<string, number> = {};
    const contexts: Record<string, number> = {};

    for (const entry of this.buffer) {
      levels[entry.level] = (levels[entry.level] || 0) + 1;
      if (entry.context) {
        contexts[entry.context] = (contexts[entry.context] || 0) + 1;
      }
    }

    return {
      total: this.buffer.length,
      byLevel: levels,
      byContext: contexts,
      oldest:
        this.buffer.length > 0 ? this.buffer[0].timestamp.getTime() : null,
      newest:
        this.buffer.length > 0
          ? this.buffer[this.buffer.length - 1].timestamp.getTime()
          : null,
    };
  }
}

/**
 * Log query options.
 * @public API
 */
export interface LogQueryOptions {
  /** Filter by log level */
  level?: LogLevel;
  /** Filter by context */
  context?: string;
  /** Start time (timestamp) */
  startTime?: number;
  /** End time (timestamp) */
  endTime?: number;
  /** Search term (searches message and data) */
  search?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Log statistics.
 * @public API
 */
export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byContext: Record<string, number>;
  oldest: number | null;
  newest: number | null;
}

/**
 * HTTP server configuration for log querying and streaming.
 * @public API
 */
export interface HttpServerConfig {
  /** Port to run the server on (default: 3001) */
  port?: number;
  /** Maximum number of logs to keep in memory (default: 1000) */
  maxLogs?: number;
  /** Enable WebSocket streaming (default: true) */
  enableWebSocket?: boolean;
  /** Enable REST API (default: true) */
  enableRestApi?: boolean;
  /** API path prefix (default: /api/logs) */
  apiPath?: string;
}

/**
 * HTTP server for log querying and streaming.
 * This is a basic implementation that can be extended.
 * @public API
 */
export class HttpLogServer {
  private buffer: LogBuffer;
  private config: Required<HttpServerConfig>;
  private server: unknown; // Express-like server (would need to be implemented)

  constructor(config?: HttpServerConfig) {
    this.config = {
      port: config?.port ?? 3001,
      maxLogs: config?.maxLogs ?? 1000,
      enableWebSocket: config?.enableWebSocket ?? true,
      enableRestApi: config?.enableRestApi ?? true,
      apiPath: config?.apiPath ?? "/api/logs",
    };
    this.buffer = new LogBuffer(this.config.maxLogs);
  }

  /**
   * Add a log entry to the buffer.
   * @param entry - Log entry to add
   */
  addLog(entry: LogEntry): void {
    this.buffer.add(entry);
  }

  /**
   * Query logs.
   * @param options - Query options
   * @returns Array of log entries
   */
  queryLogs(options: LogQueryOptions): Array<LogEntry> {
    return this.buffer.query(options);
  }

  /**
   * Get log statistics.
   * @returns Log statistics
   */
  getStats(): LogStats {
    return this.buffer.getStats();
  }

  /**
   * Clear all logs.
   */
  clearLogs(): void {
    this.buffer.clear();
  }

  /**
   * Start the HTTP server.
   * Note: This is a placeholder - actual server implementation would require Express or similar.
   */
  async start(): Promise<void> {
    // Placeholder for server implementation
    // In a real implementation, this would:
    // 1. Set up Express server
    // 2. Add REST API routes for querying logs
    // 3. Set up WebSocket server for real-time streaming
    // 4. Add endpoints for stats, export, etc.
    console.log(
      `[HttpLogServer] Server would start on port ${this.config.port}`,
    );
    console.log(
      `[HttpLogServer] REST API would be available at ${this.config.apiPath}`,
    );
    console.log(
      `[HttpLogServer] WebSocket streaming would be available at ws://localhost:${this.config.port}/ws`,
    );
  }

  /**
   * Stop the HTTP server.
   */
  async stop(): Promise<void> {
    // Placeholder for server shutdown
    console.log("[HttpLogServer] Server stopped");
  }
}
