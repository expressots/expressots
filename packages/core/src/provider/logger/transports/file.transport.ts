import { ILogTransport } from "./transport.interface";
import { LogEntry } from "../utils/log-entry";
import { LogLevel, shouldLog } from "../utils/log-levels";
import { formatProd } from "../logger.formatter";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * File transport options.
 * @public API
 */
export interface FileTransportOptions {
  /** Directory to store log files */
  directory?: string;
  /** Filename pattern (supports %DATE% placeholder) */
  filename?: string;
  /** Minimum log level */
  level?: LogLevel;
  /** Whether transport is enabled */
  enabled?: boolean;
}

/**
 * File transport for logging to files with daily rotation.
 * @public API
 */
export class FileTransport implements ILogTransport {
  readonly name = "File";
  level: LogLevel; // Mutable to allow dynamic level updates
  enabled: boolean;
  private readonly directory: string;
  private readonly filenamePattern: string;
  private currentFilename: string | null = null;

  constructor(options?: FileTransportOptions) {
    this.level = options?.level ?? LogLevel.INFO;
    this.enabled = options?.enabled ?? true;
    this.directory = options?.directory ?? "logs";
    this.filenamePattern = options?.filename ?? "app-%DATE%.log";
  }

  /**
   * Create a file transport with daily rotation.
   * @param options - Transport options
   * @returns FileTransport configured for daily rotation
   * @public API
   */
  static daily(
    options?: Omit<FileTransportOptions, "filename">,
  ): FileTransport {
    return new FileTransport({
      ...options,
      filename: "app-%DATE%.log",
    });
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !shouldLog(entry.level, this.level)) {
      return;
    }

    const filename = this.getFilename();
    if (filename !== this.currentFilename) {
      this.currentFilename = filename;
    }

    await this.ensureDirectory();
    const filePath = join(this.directory, this.currentFilename);
    const formatted = formatProd(entry) + "\n";

    try {
      await fs.appendFile(filePath, formatted, "utf8");
    } catch (error) {
      // Silently fail to avoid log loops
      console.error(`[FileTransport] Failed to write log:`, error);
    }
  }

  async flush(): Promise<void> {
    // File writes are synchronous, no flush needed
    return Promise.resolve();
  }

  async close(): Promise<void> {
    this.currentFilename = null;
  }

  private getFilename(): string {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    return this.filenamePattern.replace("%DATE%", dateStr);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.directory);
    } catch {
      await fs.mkdir(this.directory, { recursive: true });
    }
  }
}
