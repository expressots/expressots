/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as fs from "fs";
import type { Application } from "express";
import { BaseEngineAdapter } from "./base-adapter";
import type { HandlebarsConfig } from "../render-config";

/**
 * Default Handlebars configuration.
 */
const HBS_DEFAULTS: HandlebarsConfig = {
  viewEngine: "hbs",
  viewsDir: path.join(process.cwd(), "views"),
  partialsDir: path.join(process.cwd(), "views", "partials"),
};

/**
 * Handlebars Engine Adapter
 *
 * @description Adapter for the Handlebars template engine.
 * Provides logic-less templates with partials and helpers support.
 *
 * @example
 * ```typescript
 * this.Middleware.render({
 *   engine: 'hbs',
 *   viewsDir: 'src/views',
 *   hbsOptions: {
 *     partialsDir: 'src/views/partials',
 *     helpers: {
 *       formatDate: (date) => date.toLocaleDateString()
 *     }
 *   }
 * });
 * ```
 *
 * @public API
 */
export class HandlebarsAdapter extends BaseEngineAdapter {
  readonly name = "hbs";
  readonly extensions = [".hbs", ".handlebars"];
  readonly packageName = "hbs";
  readonly supportsStreaming = false;
  readonly supportsSSR = false;

  private hbs: any = null;
  private options: HandlebarsConfig = HBS_DEFAULTS;

  /**
   * Initialize and configure the Handlebars engine.
   *
   * @param app - Express application instance
   * @param options - Handlebars configuration options
   */
  async setup(app: Application, options: HandlebarsConfig = {}): Promise<void> {
    // Merge with defaults
    this.options = {
      ...HBS_DEFAULTS,
      ...options,
    };

    // Resolve HBS package
    this.hbs = this.resolvePackage("hbs");

    // Register partials directory
    const partialsDir = this.options.partialsDir || HBS_DEFAULTS.partialsDir;
    if (partialsDir && fs.existsSync(partialsDir)) {
      this.hbs.registerPartials(partialsDir);
    }

    // Register custom helpers
    if (this.options.helpers) {
      for (const [name, fn] of Object.entries(this.options.helpers)) {
        this.hbs.registerHelper(name, fn);
      }
    }

    // Configure Express
    app.set("view engine", this.options.viewEngine || "hbs");

    const viewsDir = this.options.viewsDir || HBS_DEFAULTS.viewsDir;
    this.setViewsDir(viewsDir!);
    app.set("views", viewsDir);

    this.isInitialized = true;
    this.logger.info("Handlebars engine initialized", "render-engine");
  }

  /**
   * Render a view to string.
   *
   * @param view - View name or path (without extension)
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  async render(view: string, data: any): Promise<string> {
    if (!this.hbs) {
      throw new Error(
        "Handlebars engine not initialized. Call setup() first.",
      );
    }

    const viewPath = this.resolveViewPath(view);

    // Check cache
    const cacheKey = viewPath;
    const shouldCache = process.env.NODE_ENV === "production";

    if (shouldCache && this.hasCachedView(cacheKey)) {
      const compiled = this.getCachedView(cacheKey);
      return compiled(data);
    }

    // Read template
    const template = await fs.promises.readFile(viewPath, "utf-8");

    // Compile template using handlebars
    const handlebars = this.hbs.handlebars || this.hbs;
    const compiled = handlebars.compile(template);

    // Cache if in production
    if (shouldCache) {
      this.cacheView(cacheKey, compiled);
    }

    return compiled(data);
  }

  /**
   * Register a helper function.
   *
   * @param name - Helper name
   * @param fn - Helper function
   */
  registerHelper(name: string, fn: (...args: Array<any>) => any): void {
    if (this.hbs) {
      this.hbs.registerHelper(name, fn);
    }
  }

  /**
   * Register a partial template.
   *
   * @param name - Partial name
   * @param template - Partial template string
   */
  registerPartial(name: string, template: string): void {
    if (this.hbs) {
      const handlebars = this.hbs.handlebars || this.hbs;
      handlebars.registerPartial(name, template);
    }
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

    // Try .hbs extension first, then .handlebars
    for (const ext of [".hbs", ".handlebars"]) {
      const viewWithExt = view.endsWith(ext) ? view : `${view}${ext}`;
      const fullPath = path.join(dir, viewWithExt);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return .hbs path if not found (for error handling)
    return path.join(dir, `${view}.hbs`);
  }

  /**
   * Handle hot reload.
   */
  onHotReload(): void {
    super.onHotReload();

    // Re-register partials
    const partialsDir = this.options.partialsDir;
    if (partialsDir && fs.existsSync(partialsDir) && this.hbs) {
      this.hbs.registerPartials(partialsDir);
    }

    this.logger.info("Handlebars templates reloaded", "render-engine");
  }
}
