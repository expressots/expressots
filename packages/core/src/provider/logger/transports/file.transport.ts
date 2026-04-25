import { ILogTransport } from "./transport.interface.js";
import { LogEntry } from "../utils/log-entry.js";
import { LogLevel, shouldLog } from "../utils/log-levels.js";
import { formatProd } from "../logger.formatter.js";
import { promises as fs } from "fs";
import { join } from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";

/**
 * File transport options with advanced features.
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
  /** Enable gzip compression for rotated files */
  compress?: boolean;
  /** Maximum file size in bytes before rotation (default: unlimited) */
  maxSize?: number;
  /** Maximum file age in milliseconds before deletion (default: unlimited) */
  maxAge?: number;
  /** Maximum number of files to keep (default: unlimited) */
  maxFiles?: number;
}

/**
 * File transport for logging to files with daily rotation and advanced features.
 * @public API
 */
export class FileTransport implements ILogTransport {
  readonly name = "File";
  level: LogLevel; // Mutable to allow dynamic level updates
  enabled: boolean;
  private readonly directory: string;
  private readonly filenamePattern: string;
  private readonly compress: boolean;
  private readonly maxSize: number;
  private readonly maxAge: number;
  private readonly maxFiles: number;
  private currentFilename: string | null = null;
  private currentFileSize: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options?: FileTransportOptions) {
    this.level = options?.level ?? LogLevel.INFO;
    this.enabled = options?.enabled ?? true;
    this.directory = options?.directory ?? "logs";
    this.filenamePattern = options?.filename ?? "app-%DATE%.log";
    this.compress = options?.compress ?? false;
    this.maxSize = options?.maxSize ?? 0; // 0 = unlimited
    this.maxAge = options?.maxAge ?? 0; // 0 = unlimited
    this.maxFiles = options?.maxFiles ?? 0; // 0 = unlimited

    // Start cleanup interval if maxAge or maxFiles is set
    if (this.maxAge > 0 || this.maxFiles > 0) {
      this.startCleanupInterval();
    }
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

  /**
   * Create a file transport with compression enabled.
   * @param options - Transport options
   * @returns FileTransport with compression enabled
   * @public API
   */
  static withCompression(
    options?: Omit<FileTransportOptions, "compress">,
  ): FileTransport {
    return new FileTransport({
      ...options,
      compress: true,
    });
  }

  /**
   * Create a file transport with size-based rotation.
   * @param maxSize - Maximum file size in bytes
   * @param options - Transport options
   * @returns FileTransport with size-based rotation
   * @public API
   */
  static withMaxSize(
    maxSize: number,
    options?: Omit<FileTransportOptions, "maxSize">,
  ): FileTransport {
    return new FileTransport({
      ...options,
      maxSize,
    });
  }

  /**
   * Create a file transport with retention policy.
   * @param maxAge - Maximum file age in milliseconds
   * @param maxFiles - Maximum number of files to keep
   * @param options - Transport options
   * @returns FileTransport with retention policy
   * @public API
   */
  static withRetention(
    maxAge: number,
    maxFiles?: number,
    options?: Omit<FileTransportOptions, "maxAge" | "maxFiles">,
  ): FileTransport {
    return new FileTransport({
      ...options,
      maxAge,
      maxFiles,
    });
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !shouldLog(entry.level, this.level)) {
      return;
    }

    const filename = this.getFilename();
    const shouldRotate = this.shouldRotate(filename);

    if (shouldRotate) {
      await this.rotateFile(filename);
    }

    if (filename !== this.currentFilename) {
      this.currentFilename = filename;
      this.currentFileSize = await this.getFileSize(filename);
    }

    await this.ensureDirectory();
    const filePath = join(this.directory, this.currentFilename);
    const formatted = formatProd(entry) + "\n";
    const entrySize = Buffer.byteLength(formatted, "utf8");

    try {
      await fs.appendFile(filePath, formatted, "utf8");
      this.currentFileSize += entrySize;

      // Check if we need to rotate after this write
      if (this.maxSize > 0 && this.currentFileSize >= this.maxSize) {
        await this.rotateFile(this.currentFilename);
      }
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
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.currentFilename = null;
    this.currentFileSize = 0;
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

  private async getFileSize(filename: string): Promise<number> {
    try {
      const filePath = join(this.directory, filename);
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private shouldRotate(filename: string): boolean {
    // Rotate if filename changed (daily rotation)
    if (filename !== this.currentFilename) {
      return true;
    }

    // Rotate if size limit exceeded
    if (this.maxSize > 0 && this.currentFileSize >= this.maxSize) {
      return true;
    }

    return false;
  }

  private async rotateFile(filename?: string): Promise<void> {
    const fileToRotate = filename || this.currentFilename;
    if (!fileToRotate) {
      return;
    }

    const oldFilePath = join(this.directory, fileToRotate);
    const newFilename = this.getRotatedFilename(fileToRotate);
    const newFilePath = join(this.directory, newFilename);

    try {
      // Check if old file exists
      try {
        await fs.access(oldFilePath);
      } catch {
        // File doesn't exist, nothing to rotate
        this.currentFileSize = 0;
        return;
      }

      // Rename old file to rotated filename
      await fs.rename(oldFilePath, newFilePath);

      // Compress if enabled
      if (this.compress && !newFilename.endsWith(".gz")) {
        await this.compressFile(newFilePath);
      }

      // Reset current file size
      this.currentFileSize = 0;
    } catch (error) {
      // Only log error if it's not a "file not found" error (ENOENT)
      // This can happen if file was deleted between access check and rename
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") {
        console.error(`[FileTransport] Failed to rotate file:`, error);
      }
      // Reset file size on any error to prevent stuck state
      this.currentFileSize = 0;
    }
  }

  private getRotatedFilename(filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = filename.replace(".log", "");
    return `${baseName}-${timestamp}.log`;
  }

  private async compressFile(filePath: string): Promise<void> {
    try {
      const gzipPath = `${filePath}.gz`;
      const source = createReadStream(filePath);
      const destination = createWriteStream(gzipPath);
      const gzip = createGzip({ level: 6 }); // Default compression level

      await pipeline(source, gzip, destination);

      // Delete original file after successful compression
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`[FileTransport] Failed to compress file:`, error);
    }
  }

  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldFiles().catch((error) => {
          console.error(`[FileTransport] Cleanup failed:`, error);
        });
      },
      60 * 60 * 1000,
    ); // 1 hour

    // Run initial cleanup
    this.cleanupOldFiles().catch((error) => {
      console.error(`[FileTransport] Initial cleanup failed:`, error);
    });
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.directory);
      const now = Date.now();
      const logFiles: Array<{ name: string; path: string; mtime: number }> = [];

      // Collect all log files with their metadata
      for (const file of files) {
        if (file.includes(this.filenamePattern.replace("%DATE%", ""))) {
          const filePath = join(this.directory, file);
          try {
            const stats = await fs.stat(filePath);
            logFiles.push({
              name: file,
              path: filePath,
              mtime: stats.mtimeMs,
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }

      // Sort by modification time (oldest first)
      logFiles.sort((a, b) => a.mtime - b.mtime);

      // Delete files that exceed maxAge
      if (this.maxAge > 0) {
        for (const file of logFiles) {
          const age = now - file.mtime;
          if (age > this.maxAge) {
            try {
              await fs.unlink(file.path);
            } catch (error) {
              console.error(
                `[FileTransport] Failed to delete old file:`,
                error,
              );
            }
          }
        }
      }

      // Delete files that exceed maxFiles (keep newest)
      if (this.maxFiles > 0 && logFiles.length > this.maxFiles) {
        const filesToDelete = logFiles.slice(
          0,
          logFiles.length - this.maxFiles,
        );
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.error(
              `[FileTransport] Failed to delete excess file:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error(`[FileTransport] Cleanup error:`, error);
    }
  }
}
