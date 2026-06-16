import { LogEntry } from "../utils/log-entry.js";
import { LogLevel } from "../utils/log-levels.js";

/**
 * Log transport interface for pluggable log destinations.
 * @public API
 */
export interface ILogTransport {
  /** Transport name for identification */
  readonly name: string;
  /** Minimum log level this transport accepts */
  level: LogLevel; // Mutable to allow dynamic level updates
  /** Whether this transport is enabled */
  enabled: boolean;

  /**
   * Log an entry.
   * @param entry - The log entry to transport
   * @returns Promise if async, void if sync
   */
  log(entry: LogEntry): void | Promise<void>;

  /**
   * Flush any buffered logs (optional).
   * Useful for transports that batch logs.
   * @returns Promise that resolves when flush is complete
   */
  flush?(): Promise<void>;

  /**
   * Close the transport and cleanup resources (optional).
   * @returns Promise that resolves when close is complete
   */
  close?(): Promise<void>;
}
