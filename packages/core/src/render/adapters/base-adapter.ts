/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../../provider/logger/logger.provider";
import type { EngineAdapter } from "../render-interface";
import type { Application } from "express";

/**
 * Base Engine Adapter
 *
 * @description Abstract base class for template engine adapters.
 * Provides common functionality like logging, caching, and package resolution.
 *
 * @public API
 */
export abstract class BaseEngineAdapter implements EngineAdapter {
  abstract readonly name: string;
  abstract readonly extensions: Array<string>;
  abstract readonly packageName: string;

  readonly supportsStreaming: boolean = false;
  readonly supportsSSR: boolean = false;

  protected logger: Logger;
  protected cache: Map<string, any> = new Map();
  protected viewsDir: string | Array<string> = "views";
  protected isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Initialize and configure the engine.
   * Must be implemented by subclasses.
   */
  abstract setup(app: Application, options: any): Promise<void>;

  /**
   * Render a view to string.
   * Must be implemented by subclasses.
   */
  abstract render(view: string, data: any): Promise<string>;

  /**
   * Resolve and require a package from the user's project.
   * Provides helpful error messages if the package is not installed.
   *
   * @param packageName - Package name to resolve
   * @param options - Options to pass to the package if it's a function
   * @returns The resolved package module
   */
  protected resolvePackage(packageName: string, ...options: Array<any>): any {
    try {
      const hasPackage = require.resolve(packageName, {
        paths: [process.cwd()],
      });

      if (hasPackage) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const packageResolved = require(hasPackage);

        if (typeof packageResolved === "function") {
          return packageResolved(...options);
        }

        if (
          packageResolved.default &&
          typeof packageResolved.default === "function"
        ) {
          return packageResolved.default(...options);
        }
        return packageResolved;
      }
    } catch (error) {
      this.logger.warn(
        `Package [${packageName}] not installed. Install it with: npm install ${packageName}`,
        "render-engine",
      );
      throw new Error(
        `Template engine package '${packageName}' is not installed. ` +
          `Run: npm install ${packageName}`,
      );
    }
  }

  /**
   * Check if a package is installed without throwing.
   *
   * @param packageName - Package name to check
   * @returns Whether the package is installed
   */
  protected isPackageInstalled(packageName: string): boolean {
    try {
      require.resolve(packageName, { paths: [process.cwd()] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cache a compiled template.
   *
   * @param key - Cache key (usually view path)
   * @param compiled - Compiled template
   */
  protected cacheView(key: string, compiled: any): void {
    this.cache.set(key, compiled);
  }

  /**
   * Get a cached template.
   *
   * @param key - Cache key
   * @returns Cached template or undefined
   */
  protected getCachedView(key: string): any {
    return this.cache.get(key);
  }

  /**
   * Check if a template is cached.
   *
   * @param key - Cache key
   * @returns Whether the template is cached
   */
  protected hasCachedView(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear the template cache.
   */
  protected clearCache(): void {
    this.cache.clear();
  }

  /**
   * Called when hot reload is triggered.
   * Clears the cache by default.
   */
  onHotReload(): void {
    this.clearCache();
    this.logger.info(`Cache cleared for engine: ${this.name}`, "render-engine");
  }

  /**
   * Called when cache should be invalidated.
   */
  onCacheInvalidate(): void {
    this.clearCache();
  }

  /**
   * Set the views directory.
   *
   * @param viewsDir - Views directory path(s)
   */
  protected setViewsDir(viewsDir: string | Array<string>): void {
    this.viewsDir = viewsDir;
  }

  /**
   * Get the views directory.
   *
   * @returns Views directory path(s)
   */
  protected getViewsDir(): string | Array<string> {
    return this.viewsDir;
  }
}
