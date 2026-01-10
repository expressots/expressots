/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as fs from "fs";
import type { Application } from "express";
import { BaseEngineAdapter } from "./base-adapter";
import type { EjsConfig } from "../render-config";

/**
 * Default EJS configuration.
 */
const EJS_DEFAULTS: EjsConfig = {
  viewEngine: "ejs",
  viewsDir: path.join(process.cwd(), "views"),
  serverOptions: {
    cache: process.env.NODE_ENV === "production",
    compileDebug: process.env.NODE_ENV !== "production",
    debug: false,
    delimiter: "%",
    strict: false,
  },
};

/**
 * EJS Engine Adapter
 *
 * @description Adapter for the EJS (Embedded JavaScript) template engine.
 * Provides server-side rendering with JavaScript embedded in HTML.
 *
 * @example
 * ```typescript
 * this.Middleware.render({
 *   engine: 'ejs',
 *   viewsDir: 'src/views',
 *   ejsOptions: {
 *     serverOptions: { cache: true }
 *   }
 * });
 * ```
 *
 * @public API
 */
export class EjsAdapter extends BaseEngineAdapter {
  readonly name = "ejs";
  readonly extensions = [".ejs"];
  readonly packageName = "ejs";
  readonly supportsStreaming = false;
  readonly supportsSSR = false;

  private ejs: any = null;
  private options: EjsConfig = EJS_DEFAULTS;

  /**
   * Initialize and configure the EJS engine.
   *
   * @param app - Express application instance
   * @param options - EJS configuration options
   */
  async setup(app: Application, options: EjsConfig = {}): Promise<void> {
    // Merge with defaults
    this.options = {
      ...EJS_DEFAULTS,
      ...options,
      serverOptions: {
        ...EJS_DEFAULTS.serverOptions,
        ...options.serverOptions,
      },
    };

    // Resolve EJS package
    this.ejs = this.resolvePackage("ejs");

    // Configure Express
    app.set("view engine", this.options.viewEngine || "ejs");

    const viewsDir = this.options.viewsDir || EJS_DEFAULTS.viewsDir;
    this.setViewsDir(viewsDir!);

    if (Array.isArray(viewsDir)) {
      app.set("views", viewsDir);
    } else {
      app.set("views", viewsDir);
    }

    // Apply server options to app.locals
    if (this.options.serverOptions) {
      app.locals = {
        ...app.locals,
        ...this.options.serverOptions,
      };
    }

    this.isInitialized = true;
    this.logger.info("EJS engine initialized", "render-engine");
  }

  /**
   * Render a view to string.
   *
   * @param view - View name or path (without extension)
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  async render(view: string, data: any): Promise<string> {
    if (!this.ejs) {
      throw new Error("EJS engine not initialized. Call setup() first.");
    }

    const viewPath = this.resolveViewPath(view);

    // Check cache
    const cacheKey = viewPath;
    if (this.options.serverOptions?.cache && this.hasCachedView(cacheKey)) {
      const compiled = this.getCachedView(cacheKey);
      return compiled(data);
    }

    // Read template
    const template = await fs.promises.readFile(viewPath, "utf-8");

    // Compile template
    const compiled = this.ejs.compile(template, {
      filename: viewPath,
      ...this.options.serverOptions,
    });

    // Cache if enabled
    if (this.options.serverOptions?.cache) {
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
    const dirs = Array.isArray(viewsDir) ? viewsDir : [viewsDir];

    // Add extension if not present
    const viewWithExt = view.endsWith(".ejs") ? view : `${view}.ejs`;

    for (const dir of dirs) {
      const fullPath = path.join(dir, viewWithExt);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return first possible path if not found (for error handling)
    return path.join(dirs[0], viewWithExt);
  }

  /**
   * Handle hot reload.
   */
  onHotReload(): void {
    super.onHotReload();
    this.logger.info("EJS templates reloaded", "render-engine");
  }
}
