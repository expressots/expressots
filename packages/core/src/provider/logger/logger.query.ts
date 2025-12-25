import { LogEntry } from "./utils/log-entry";
import { LogLevel } from "./utils/log-levels";

/**
 * Configuration for log query and export features.
 * @public API
 */
export interface QueryConfig {
  /** Enable in-memory log buffer (default: true in dev, false in prod) */
  enabled?: boolean;
  /** Maximum number of logs to keep in buffer (default: 1000) */
  bufferSize?: number;
  /** Enable markdown export (default: true) */
  enableExport?: boolean;
}

/**
 * Log query options for filtering logs.
 * @public API
 */
export interface LogQueryOptions {
  /** Filter by log level */
  level?: LogLevel | Array<LogLevel>;
  /** Filter by context (exact match or regex) */
  context?: string | RegExp;
  /** Start time (timestamp or Date) */
  startTime?: number | Date;
  /** End time (timestamp or Date) */
  endTime?: number | Date;
  /** Search term (searches message and data) */
  search?: string;
  /** Regex pattern for message matching */
  messageRegex?: RegExp | string;
  /** Maximum number of results */
  limit?: number;
  /** Sort order: 'asc' (oldest first) or 'desc' (newest first, default) */
  sort?: "asc" | "desc";
}

/**
 * Log query builder for chainable queries.
 * @public API
 */
export class LogQuery {
  private entries: Array<LogEntry>;
  private results: Array<LogEntry>;

  constructor(entries: Array<LogEntry>) {
    this.entries = entries;
    this.results = entries;
  }

  /**
   * Filter by log level(s).
   * @param level - Single level or array of levels
   * @returns Query builder instance
   * @public API
   */
  level(level: LogLevel | Array<LogLevel>): LogQuery {
    const levels = Array.isArray(level) ? level : [level];
    this.results = this.results.filter((entry) => levels.includes(entry.level));
    return this;
  }

  /**
   * Filter by context (exact match or regex).
   * @param context - Context string or regex pattern
   * @returns Query builder instance
   * @public API
   */
  context(context: string | RegExp): LogQuery {
    if (context instanceof RegExp) {
      this.results = this.results.filter(
        (entry) => entry.context && context.test(entry.context),
      );
    } else {
      this.results = this.results.filter((entry) => entry.context === context);
    }
    return this;
  }

  /**
   * Filter by time range.
   * @param start - Start time (timestamp or Date)
   * @param end - End time (timestamp or Date)
   * @returns Query builder instance
   * @public API
   */
  timeRange(start?: number | Date, end?: number | Date): LogQuery {
    if (start !== undefined) {
      const startTime = start instanceof Date ? start.getTime() : start;
      this.results = this.results.filter(
        (entry) => entry.timestamp.getTime() >= startTime,
      );
    }
    if (end !== undefined) {
      const endTime = end instanceof Date ? end.getTime() : end;
      this.results = this.results.filter(
        (entry) => entry.timestamp.getTime() <= endTime,
      );
    }
    return this;
  }

  /**
   * Search in message and data fields.
   * @param term - Search term (case-insensitive)
   * @returns Query builder instance
   * @public API
   */
  search(term: string): LogQuery {
    const searchLower = term.toLowerCase();
    this.results = this.results.filter(
      (entry) =>
        entry.message.toLowerCase().includes(searchLower) ||
        (entry.data &&
          JSON.stringify(entry.data).toLowerCase().includes(searchLower)) ||
        (entry.context && entry.context.toLowerCase().includes(searchLower)),
    );
    return this;
  }

  /**
   * Filter by regex pattern on message.
   * @param pattern - Regex pattern (string or RegExp)
   * @returns Query builder instance
   * @public API
   */
  messageRegex(pattern: RegExp | string): LogQuery {
    const regex =
      typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
    this.results = this.results.filter((entry) => regex.test(entry.message));
    return this;
  }

  /**
   * Limit the number of results.
   * @param limit - Maximum number of results
   * @returns Query builder instance
   * @public API
   */
  limit(limit: number): LogQuery {
    this.results = this.results.slice(0, limit);
    return this;
  }

  /**
   * Sort results by timestamp.
   * @param order - Sort order: 'asc' (oldest first) or 'desc' (newest first)
   * @returns Query builder instance
   * @public API
   */
  sort(order: "asc" | "desc" = "desc"): LogQuery {
    this.results.sort((a, b) => {
      const diff = a.timestamp.getTime() - b.timestamp.getTime();
      return order === "asc" ? diff : -diff;
    });
    return this;
  }

  /**
   * Execute the query and return results.
   * @returns Array of log entries matching the query
   * @public API
   */
  execute(): Array<LogEntry> {
    return [...this.results];
  }

  /**
   * Get the count of matching results.
   * @returns Number of matching entries
   * @public API
   */
  count(): number {
    return this.results.length;
  }

  /**
   * Get statistics about the query results.
   * @returns Query statistics
   * @public API
   */
  stats(): QueryStats {
    const levels: Record<string, number> = {};
    const contexts: Record<string, number> = {};

    for (const entry of this.results) {
      const levelName = LogLevel[entry.level] || String(entry.level);
      levels[levelName] = (levels[levelName] || 0) + 1;
      if (entry.context) {
        contexts[entry.context] = (contexts[entry.context] || 0) + 1;
      }
    }

    return {
      total: this.results.length,
      byLevel: levels,
      byContext: contexts,
      oldest:
        this.results.length > 0 ? this.results[0].timestamp.getTime() : null,
      newest:
        this.results.length > 0
          ? this.results[this.results.length - 1].timestamp.getTime()
          : null,
    };
  }
}

/**
 * Query statistics.
 * @public API
 */
export interface QueryStats {
  total: number;
  byLevel: Record<string, number>;
  byContext: Record<string, number>;
  oldest: number | null;
  newest: number | null;
}

/**
 * Circular buffer for storing log entries in memory.
 * Thread-safe for single-threaded Node.js (no concurrent access needed).
 * @public API
 */
export class LogBuffer {
  private buffer: Array<LogEntry> = [];
  private maxSize: number;
  private writeIndex: number = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add a log entry to the buffer.
   * Uses circular buffer logic for efficient memory usage.
   * @param entry - Log entry to add
   */
  add(entry: LogEntry): void {
    if (this.buffer.length < this.maxSize) {
      // Buffer not full yet, just append
      this.buffer.push(entry);
    } else {
      // Buffer is full, overwrite oldest entry (circular)
      this.buffer[this.writeIndex] = entry;
      this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    }
  }

  /**
   * Query logs with options.
   * @param options - Query options
   * @returns Array of matching log entries
   */
  query(options: LogQueryOptions = {}): Array<LogEntry> {
    const query = new LogQuery(this.getAll());

    // Apply filters
    if (options.level) {
      query.level(options.level);
    }
    if (options.context) {
      query.context(options.context);
    }
    if (options.startTime || options.endTime) {
      query.timeRange(options.startTime, options.endTime);
    }
    if (options.search) {
      query.search(options.search);
    }
    if (options.messageRegex) {
      query.messageRegex(options.messageRegex);
    }

    // Apply sorting
    query.sort(options.sort || "desc");

    // Apply limit
    if (options.limit) {
      query.limit(options.limit);
    }

    return query.execute();
  }

  /**
   * Create a chainable query builder.
   * @returns LogQuery instance
   */
  createQuery(): LogQuery {
    return new LogQuery(this.getAll());
  }

  /**
   * Get all logs in the buffer.
   * @returns Array of all log entries in chronological order (oldest first)
   */
  getAll(): Array<LogEntry> {
    if (this.buffer.length < this.maxSize) {
      // Buffer not full yet, already in correct order
      return [...this.buffer];
    }
    // Buffer is full, need to reorder circular buffer
    // writeIndex points to the next position to write (oldest entry)
    const ordered: Array<LogEntry> = [];
    for (let i = 0; i < this.maxSize; i++) {
      const index = (this.writeIndex + i) % this.maxSize;
      ordered.push(this.buffer[index]);
    }
    return ordered;
  }

  /**
   * Clear all logs from the buffer.
   */
  clear(): void {
    this.buffer = [];
    this.writeIndex = 0;
  }

  /**
   * Get statistics about the buffer.
   * @returns Buffer statistics
   */
  getStats(): QueryStats {
    const allEntries = this.getAll();
    const levels: Record<string, number> = {};
    const contexts: Record<string, number> = {};

    for (const entry of allEntries) {
      const levelName = LogLevel[entry.level] || String(entry.level);
      levels[levelName] = (levels[levelName] || 0) + 1;
      if (entry.context) {
        contexts[entry.context] = (contexts[entry.context] || 0) + 1;
      }
    }

    return {
      total: allEntries.length,
      byLevel: levels,
      byContext: contexts,
      oldest: allEntries.length > 0 ? allEntries[0].timestamp.getTime() : null,
      newest:
        allEntries.length > 0
          ? allEntries[allEntries.length - 1].timestamp.getTime()
          : null,
    };
  }

  /**
   * Get the current buffer size.
   * @returns Number of entries in buffer
   */
  size(): number {
    return this.buffer.length;
  }
}

/**
 * Log query manager for managing in-memory log buffer and queries.
 * @public API
 */
export class LogQueryManager {
  private buffer: LogBuffer | null = null;
  private config: QueryConfig;

  constructor(config?: Partial<QueryConfig>) {
    const isDevelopment = process.env.NODE_ENV !== "production";
    this.config = {
      enabled: config?.enabled ?? isDevelopment,
      bufferSize: config?.bufferSize ?? 1000,
      enableExport: config?.enableExport ?? true,
    };

    if (this.config.enabled) {
      this.buffer = new LogBuffer(this.config.bufferSize);
    }
  }

  /**
   * Add a log entry to the buffer (if enabled).
   * @param entry - Log entry to add
   */
  addEntry(entry: LogEntry): void {
    if (this.buffer && this.config.enabled) {
      this.buffer.add(entry);
    }
  }

  /**
   * Query logs with options.
   * @param options - Query options
   * @returns Array of matching log entries
   */
  query(options: LogQueryOptions = {}): Array<LogEntry> {
    if (!this.buffer) {
      return [];
    }
    return this.buffer.query(options);
  }

  /**
   * Create a chainable query builder.
   * @returns LogQuery instance
   */
  createQuery(): LogQuery {
    if (!this.buffer) {
      return new LogQuery([]);
    }
    return this.buffer.createQuery();
  }

  /**
   * Get all logs in the buffer.
   * @returns Array of all log entries
   */
  getAll(): Array<LogEntry> {
    if (!this.buffer) {
      return [];
    }
    return this.buffer.getAll();
  }

  /**
   * Clear all logs from the buffer.
   */
  clear(): void {
    if (this.buffer) {
      this.buffer.clear();
    }
  }

  /**
   * Get statistics about the buffer.
   * @returns Buffer statistics
   */
  getStats(): QueryStats {
    if (!this.buffer) {
      return {
        total: 0,
        byLevel: {},
        byContext: {},
        oldest: null,
        newest: null,
      };
    }
    return this.buffer.getStats();
  }

  /**
   * Check if query features are enabled.
   * @returns True if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled === true && this.buffer !== null;
  }

  /**
   * Configure the query manager.
   * @param config - Partial configuration
   */
  configure(config: Partial<QueryConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !this.buffer) {
      this.buffer = new LogBuffer(this.config.bufferSize);
    } else if (!this.config.enabled && this.buffer) {
      this.buffer.clear();
      this.buffer = null;
    } else if (this.buffer && config.bufferSize) {
      // Resize buffer (would need to implement resize logic)
      // For now, just update maxSize for future entries
    }
  }
}

/**
 * Format a log entry as markdown.
 * @param entry - Log entry
 * @returns Markdown string
 */
function formatLogEntryAsMarkdown(entry: LogEntry): string {
  const levelName = LogLevel[entry.level] || String(entry.level);
  const timestamp = entry.timestamp.toISOString();
  const context = entry.context ? `[${entry.context}]` : "";

  let markdown = `### ${levelName} ${context}\n\n`;
  markdown += `**Time**: ${timestamp}\n\n`;
  markdown += `**Message**: ${entry.message}\n\n`;

  if (entry.data) {
    markdown += `**Data**:\n\`\`\`json\n${JSON.stringify(entry.data, null, 2)}\n\`\`\`\n\n`;
  }

  if (entry.error) {
    markdown += `**Error**:\n\`\`\`\n`;
    if (entry.error instanceof Error) {
      markdown += `${entry.error.name}: ${entry.error.message}\n`;
      if (entry.error.stack) {
        markdown += entry.error.stack;
      }
    } else {
      markdown += String(entry.error);
    }
    markdown += `\n\`\`\`\n\n`;
  }

  if (entry.trace) {
    markdown += `**Trace**:\n\`\`\`json\n${JSON.stringify(entry.trace, null, 2)}\n\`\`\`\n\n`;
  }

  if (entry.performance) {
    markdown += `**Performance**:\n`;
    if (entry.performance.duration) {
      markdown += `- Duration: ${entry.performance.duration}ms\n`;
    }
    if (entry.performance.memoryDelta) {
      markdown += `- Memory Delta: ${(entry.performance.memoryDelta / 1024).toFixed(2)} KB\n`;
    }
    if (entry.performance.cpuUsage) {
      markdown += `- CPU Usage: ${entry.performance.cpuUsage.toFixed(2)}%\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  return markdown;
}

/**
 * Export logs to markdown format.
 * @param entries - Log entries to export
 * @param options - Export options
 * @returns Markdown string
 * @public API
 */
export function exportToMarkdown(
  entries: Array<LogEntry>,
  options: {
    title?: string;
    includeStats?: boolean;
    groupBy?: "level" | "context" | "none";
  } = {},
): string {
  const {
    title = "Log Export",
    includeStats = true,
    groupBy = "none",
  } = options;

  let markdown = `# ${title}\n\n`;
  markdown += `**Generated**: ${new Date().toISOString()}\n\n`;

  // Calculate statistics
  const stats: QueryStats = {
    total: entries.length,
    byLevel: {},
    byContext: {},
    oldest: entries.length > 0 ? entries[0].timestamp.getTime() : null,
    newest:
      entries.length > 0
        ? entries[entries.length - 1].timestamp.getTime()
        : null,
  };

  for (const entry of entries) {
    const levelName = LogLevel[entry.level] || String(entry.level);
    stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
    if (entry.context) {
      stats.byContext[entry.context] =
        (stats.byContext[entry.context] || 0) + 1;
    }
  }

  // Include statistics section
  if (includeStats) {
    markdown += `## Summary Statistics\n\n`;
    markdown += `- **Total Logs**: ${stats.total}\n`;
    markdown += `- **Oldest Entry**: ${
      stats.oldest ? new Date(stats.oldest).toISOString() : "N/A"
    }\n`;
    markdown += `- **Newest Entry**: ${
      stats.newest ? new Date(stats.newest).toISOString() : "N/A"
    }\n\n`;

    if (Object.keys(stats.byLevel).length > 0) {
      markdown += `### By Level\n\n`;
      for (const [level, count] of Object.entries(stats.byLevel)) {
        markdown += `- **${level}**: ${count}\n`;
      }
      markdown += `\n`;
    }

    if (Object.keys(stats.byContext).length > 0) {
      markdown += `### By Context\n\n`;
      for (const [context, count] of Object.entries(stats.byContext)) {
        markdown += `- **${context}**: ${count}\n`;
      }
      markdown += `\n`;
    }
  }

  // Group entries if requested
  let groupedEntries: Array<{ key: string; entries: Array<LogEntry> }> = [];

  if (groupBy === "level") {
    const groups: Record<string, Array<LogEntry>> = {};
    for (const entry of entries) {
      const levelName = LogLevel[entry.level] || String(entry.level);
      if (!groups[levelName]) {
        groups[levelName] = [];
      }
      groups[levelName].push(entry);
    }
    groupedEntries = Object.entries(groups).map(([key, entries]) => ({
      key,
      entries,
    }));
  } else if (groupBy === "context") {
    const groups: Record<string, Array<LogEntry>> = {};
    for (const entry of entries) {
      const context = entry.context || "Unknown";
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(entry);
    }
    groupedEntries = Object.entries(groups).map(([key, entries]) => ({
      key,
      entries,
    }));
  } else {
    groupedEntries = [{ key: "All Logs", entries }];
  }

  // Export entries
  markdown += `## Log Entries\n\n`;

  for (const group of groupedEntries) {
    if (groupBy !== "none") {
      markdown += `### ${group.key}\n\n`;
    }

    for (const entry of group.entries) {
      markdown += formatLogEntryAsMarkdown(entry);
    }
  }

  return markdown;
}
