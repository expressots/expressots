/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../../provider/logger/logger.provider";

/**
 * Hot Reload
 *
 * @description Watches view files for changes and triggers reloads in development.
 *
 * @public API
 */
export class HotReload {
  private watcher: any = null;
  private viewsDir: string | Array<string>;
  private logger: Logger;
  private isRunning: boolean = false;
  private onChange: (() => void) | null = null;

  constructor(viewsDir: string | Array<string>) {
    this.viewsDir = viewsDir;
    this.logger = new Logger();
  }

  /**
   * Set the change handler.
   *
   * @param handler - Function to call when files change
   */
  setOnChange(handler: () => void): void {
    this.onChange = handler;
  }

  /**
   * Start watching for file changes.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    try {
      // Try to use chokidar if available
      const chokidar = this.resolveChokidar();

      if (!chokidar) {
        this.logger.warn(
          "Hot reload disabled: chokidar not installed. Run: npm install -D chokidar",
          "hot-reload",
        );
        return;
      }

      this.watcher = chokidar.watch(this.viewsDir, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      this.watcher.on("change", (filePath: string) => {
        this.onFileChange(filePath);
      });

      this.watcher.on("add", (filePath: string) => {
        this.onFileAdd(filePath);
      });

      this.watcher.on("unlink", (filePath: string) => {
        this.onFileDelete(filePath);
      });

      this.watcher.on("error", (error: Error) => {
        this.logger.error(`Watcher error: ${error.message}`, "hot-reload");
      });

      this.isRunning = true;
      this.logger.info("Hot reload enabled for views", "hot-reload");
    } catch (error: any) {
      this.logger.warn(
        `Failed to start hot reload: ${error.message}`,
        "hot-reload",
      );
    }
  }

  /**
   * Stop watching for file changes.
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isRunning = false;
      this.logger.info("Hot reload stopped", "hot-reload");
    }
  }

  /**
   * Check if hot reload is running.
   *
   * @returns Whether hot reload is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Handle file change event.
   *
   * @param filePath - Path to changed file
   */
  private onFileChange(filePath: string): void {
    this.logger.info(`View updated: ${filePath}`, "hot-reload");

    // Clear Node's require cache for the file
    this.clearRequireCache(filePath);

    // Notify listeners
    if (this.onChange) {
      this.onChange();
    }
  }

  /**
   * Handle file add event.
   *
   * @param filePath - Path to added file
   */
  private onFileAdd(filePath: string): void {
    this.logger.info(`View added: ${filePath}`, "hot-reload");

    if (this.onChange) {
      this.onChange();
    }
  }

  /**
   * Handle file delete event.
   *
   * @param filePath - Path to deleted file
   */
  private onFileDelete(filePath: string): void {
    this.logger.info(`View deleted: ${filePath}`, "hot-reload");

    // Clear from require cache
    this.clearRequireCache(filePath);

    if (this.onChange) {
      this.onChange();
    }
  }

  /**
   * Clear a file from Node's require cache.
   *
   * @param filePath - Path to clear
   */
  private clearRequireCache(filePath: string): void {
    try {
      const resolved = require.resolve(filePath);
      delete require.cache[resolved];
    } catch {
      // File might not be in cache
    }
  }

  /**
   * Try to resolve chokidar package.
   *
   * @returns Chokidar module or null
   */
  private resolveChokidar(): any {
    try {
      const chokidarPath = require.resolve("chokidar", {
        paths: [process.cwd()],
      });
      return require(chokidarPath);
    } catch {
      return null;
    }
  }
}
