import { ILogTransport } from "./transport.interface.js";
import { LogEntry } from "../utils/log-entry.js";
import { LogLevel, shouldLog } from "../utils/log-levels.js";
import { formatProd } from "../logger.formatter.js";

/**
 * HTTP transport options.
 * @public API
 */
export interface HttpTransportOptions {
  /** HTTP endpoint URL to send logs to */
  endpoint: string;
  /** Minimum log level */
  level?: LogLevel;
  /** Whether transport is enabled */
  enabled?: boolean;
  /** Number of logs to batch before sending (default: 10) */
  batchSize?: number;
  /** Maximum time to wait before flushing batch in milliseconds (default: 5000) */
  flushInterval?: number;
  /** Maximum number of retries on failure (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** HTTP method to use (default: POST) */
  method?: "POST" | "PUT" | "PATCH";
  /** Timeout for HTTP requests in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * HTTP transport for sending logs to remote endpoints with batching and retry.
 * @public API
 */
export class HttpTransport implements ILogTransport {
  readonly name = "Http";
  level: LogLevel;
  enabled: boolean;
  private readonly endpoint: string;
  private readonly batchSize: number;
  private readonly flushInterval: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly headers: Record<string, string>;
  private readonly method: "POST" | "PUT" | "PATCH";
  private readonly timeout: number;
  private buffer: Array<LogEntry> = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;

  constructor(options: HttpTransportOptions) {
    if (!options.endpoint) {
      throw new Error("HttpTransport requires an endpoint URL");
    }

    this.endpoint = options.endpoint;
    this.level = options?.level ?? LogLevel.INFO;
    this.enabled = options?.enabled ?? true;
    this.batchSize = options?.batchSize ?? 10;
    this.flushInterval = options?.flushInterval ?? 5000;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryDelay = options?.retryDelay ?? 1000;
    this.headers = {
      "Content-Type": "application/json",
      ...options?.headers,
    };
    this.method = options?.method ?? "POST";
    this.timeout = options?.timeout ?? 10000;
  }

  /**
   * Create an HTTP transport with default settings.
   * @param endpoint - HTTP endpoint URL
   * @param options - Additional options
   * @returns HttpTransport instance
   * @public API
   */
  static create(
    endpoint: string,
    options?: Omit<HttpTransportOptions, "endpoint">,
  ): HttpTransport {
    return new HttpTransport({ endpoint, ...options });
  }

  /**
   * Create an HTTP transport with batching enabled.
   * @param endpoint - HTTP endpoint URL
   * @param batchSize - Number of logs per batch
   * @param options - Additional options
   * @returns HttpTransport instance
   * @public API
   */
  static withBatching(
    endpoint: string,
    batchSize: number = 10,
    options?: Omit<HttpTransportOptions, "endpoint" | "batchSize">,
  ): HttpTransport {
    return new HttpTransport({ endpoint, batchSize, ...options });
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !shouldLog(entry.level, this.level)) {
      return;
    }

    this.buffer.push(entry);

    // Flush if buffer reaches batch size
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush();
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    this.cancelFlushTimer();

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendBatch(entries);
    } catch (error) {
      // On failure, put entries back in buffer for retry
      this.buffer.unshift(...entries);
      console.error(`[HttpTransport] Failed to send logs:`, error);
    } finally {
      this.isFlushing = false;
    }
  }

  async close(): Promise<void> {
    this.cancelFlushTimer();
    // Flush remaining logs
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return; // Already scheduled
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch((error) => {
        console.error(`[HttpTransport] Scheduled flush failed:`, error);
      });
    }, this.flushInterval);
  }

  private cancelFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async sendBatch(entries: Array<LogEntry>): Promise<void> {
    const payload = entries.map((entry) => formatProd(entry));
    const body = JSON.stringify({ logs: payload });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.endpoint, {
          method: this.method,
          headers: this.headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success - return
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // All retries failed
    throw lastError || new Error("Failed to send logs after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
