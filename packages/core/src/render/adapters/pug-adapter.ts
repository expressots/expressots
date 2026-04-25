/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as fs from "fs";
import type { Application } from "express";
import { BaseEngineAdapter } from "./base-adapter.js";
import type { PugConfig } from "../render-config.js";

/**
 * Default Pug configuration.
 */
const PUG_DEFAULTS: PugConfig = {
  viewEngine: "pug",
  viewsDir: path.join(process.cwd(), "views"),
  options: {
    pretty: process.env.NODE_ENV !== "production",
    compileDebug: process.env.NODE_ENV !== "production",
    debug: false,
  },
};

/**
 * Pug Engine Adapter
 *
 * @description Adapter for the Pug (formerly Jade) template engine.
 * Provides clean, whitespace-sensitive template syntax.
 *
 * @example
 * ```typescript
 * this.Middleware.render({
 *   engine: 'pug',
 *   viewsDir: 'src/views',
 *   pugOptions: {
 *     options: { pretty: true }
 *   }
 * });
 * ```
 *
 * @public API
 */
export class PugAdapter extends BaseEngineAdapter {
  readonly name = "pug";
  readonly extensions = [".pug", ".jade"];
  readonly packageName = "pug";
  readonly supportsStreaming = false;
  readonly supportsSSR = false;

  private pug: any = null;
  private options: PugConfig = PUG_DEFAULTS;

  /**
   * Initialize and configure the Pug engine.
   *
   * @param app - Express application instance
   * @param options - Pug configuration options
   */
  async setup(app: Application, options: PugConfig = {}): Promise<void> {
    // Merge with defaults
    this.options = {
      ...PUG_DEFAULTS,
      ...options,
      options: {
        ...PUG_DEFAULTS.options,
        ...options.options,
      },
    };

    // Resolve Pug package
    this.pug = this.resolvePackage("pug");

    // Configure Express
    app.set("view engine", this.options.viewEngine || "pug");

    const viewsDir = this.options.viewsDir || PUG_DEFAULTS.viewsDir;
    this.setViewsDir(viewsDir!);
    app.set("views", viewsDir);

    this.isInitialized = true;
    this.logger.info("Pug engine initialized", "render-engine");
  }

  /**
   * Render a view to string.
   *
   * @param view - View name or path (without extension)
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  async render(view: string, data: any): Promise<string> {
    if (!this.pug) {
      throw new Error("Pug engine not initialized. Call setup() first.");
    }

    const viewPath = this.resolveViewPath(view);

    // Check cache
    const cacheKey = viewPath;
    const shouldCache = process.env.NODE_ENV === "production";

    if (shouldCache && this.hasCachedView(cacheKey)) {
      const compiled = this.getCachedView(cacheKey);
      return compiled(data);
    }

    // Compile template
    const compiled = this.pug.compileFile(viewPath, {
      filename: viewPath,
      cache: shouldCache,
      ...this.options.options,
    });

    // Cache if in production
    if (shouldCache) {
      this.cacheView(cacheKey, compiled);
    }

    return compiled(data);
  }

  /**
   * Resolve the full path to a view file.
   *
   * @param view - View name or path
   * @returns Full path to the view file
   */
  private resolveViewPath(view: string): string {
    const viewsDir = this.getViewsDir();
    const dir = Array.isArray(viewsDir) ? viewsDir[0] : viewsDir;

    // Try .pug extension first, then .jade
    for (const ext of [".pug", ".jade"]) {
      const viewWithExt = view.endsWith(ext) ? view : `${view}${ext}`;
      const fullPath = path.join(dir, viewWithExt);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return .pug path if not found (for error handling)
    return path.join(dir, `${view}.pug`);
  }

  /**
   * Handle hot reload.
   */
  onHotReload(): void {
    super.onHotReload();
    // Clear Pug's internal cache
    if (this.pug && this.pug.cache) {
      Object.keys(this.pug.cache).forEach((key) => {
        delete this.pug.cache[key];
      });
    }
    this.logger.info("Pug templates reloaded", "render-engine");
  }
}
