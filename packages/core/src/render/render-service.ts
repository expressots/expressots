/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as fs from "fs";
import type { Application } from "express";
import { Logger } from "../provider/logger/logger.provider";
import { EngineRegistry } from "./render-registry";
import type { EngineAdapter, IRenderService } from "./render-interface";
import type {
  RenderConfig,
  RenderOptions,
  StreamOptions,
  RenderMetrics,
  EngineType,
  PresetName,
} from "./render-config";
import { EjsAdapter } from "./adapters/ejs-adapter";
import { PugAdapter } from "./adapters/pug-adapter";
import { HandlebarsAdapter } from "./adapters/handlebars-adapter";
import { ReactAdapter } from "./adapters/react-adapter";
import { getPackageResolver } from "./utils/package-resolver";

/**
 * Render Service
 *
 * @description Main service for managing view rendering across different engines.
 * Provides a unified API for configuration, rendering, and introspection.
 *
 * @example
 * ```typescript
 * const renderService = new RenderService(app);
 * await renderService.configure({
 *   engine: 'react',
 *   viewsDir: 'src/views',
 *   ssr: { hydrate: true }
 * });
 * const html = await renderService.render('Home', { title: 'Welcome' });
 * ```
 *
 * @public API
 */
export class RenderService implements IRenderService {
  private registry: EngineRegistry;
  private config: RenderConfig = {};
  private app: Application;
  private logger: Logger;
  private activeEngine: EngineAdapter | null = null;
  private metrics: RenderMetrics = {
    totalRenders: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgRenderTime: 0,
    rendersByEngine: {},
  };
  private renderTimes: Array<number> = [];
  private isConfigured: boolean = false;

  // Features (lazy initialized)
  private hotReloader: any = null;
  private viewDebugger: any = null;
  private typeGenerator: any = null;

  constructor(app: Application) {
    this.app = app;
    this.logger = new Logger();
    this.registry = new EngineRegistry();

    // Register built-in adapters
    this.registerBuiltInAdapters();
  }

  /**
   * Configure the render service.
   *
   * @param config - Render configuration or preset name
   */
  async configure(config: RenderConfig | PresetName = {}): Promise<void> {
    // Handle preset names
    if (typeof config === "string") {
      const { getPreset } = await import("./presets");
      config = getPreset(config);
    }

    // Apply smart defaults
    config = this.applyDefaults(config);

    // Auto-detect engine if needed
    if (config.engine === "auto" || !config.engine) {
      const { AutoDetection } = await import("./features/auto-detection");
      const autoDetector = new AutoDetection();
      config.engine = await autoDetector.detectEngine();
      this.logger.info(
        `Auto-detected render engine: ${config.engine}`,
        "render-service",
      );
    }

    this.config = config;

    // Get and configure the engine adapter
    const adapter = this.registry.get(config.engine as string);
    if (!adapter) {
      throw new Error(
        `Render engine '${config.engine}' not found or not registered`,
      );
    }

    // Build engine-specific options
    const engineOptions = this.buildEngineOptions(config);

    await adapter.setup(this.app, engineOptions);
    this.activeEngine = adapter;

    // Enable features based on config
    if (
      config.watch === true ||
      (config.watch === "auto" && this.isDevelopment())
    ) {
      await this.enableHotReload();
    }

    if (
      config.debug === true ||
      (config.debug === undefined && this.isDevelopment())
    ) {
      await this.enableViewDebugger();
    }

    this.isConfigured = true;
    this.logConfiguration();
  }

  /**
   * Register a custom engine adapter.
   *
   * @param adapter - Engine adapter to register
   */
  registerEngine(adapter: EngineAdapter): void {
    this.registry.register(adapter);
  }

  /**
   * Get an engine by name.
   *
   * @param name - Engine name
   * @returns Engine adapter or undefined
   */
  getEngine(name: string): EngineAdapter | undefined {
    return this.registry.get(name);
  }

  /**
   * Get the currently active engine.
   *
   * @returns Active engine adapter
   */
  getActiveEngine(): EngineAdapter {
    if (!this.activeEngine) {
      throw new Error("No render engine configured. Call configure() first.");
    }
    return this.activeEngine;
  }

  /**
   * Render a view to string.
   *
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @param options - Additional render options
   * @returns Rendered HTML string
   */
  async render(
    view: string,
    data: any = {},
    options?: RenderOptions,
  ): Promise<string> {
    const adapter = this.getActiveEngine();
    const startTime = Date.now();

    try {
      const html = await adapter.render(view, { ...data, ...options?.locals });

      // Update metrics
      this.updateMetrics(adapter.name, Date.now() - startTime);

      return html;
    } catch (error: any) {
      this.logger.error(
        `Render failed for view '${view}': ${error.message}`,
        "render-service",
      );
      throw error;
    }
  }

  /**
   * Render a view as a stream.
   *
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @param options - Stream options
   * @returns Readable stream of HTML
   */
  renderStream(
    view: string,
    data: any = {},
    options?: StreamOptions,
  ): NodeJS.ReadableStream {
    const adapter = this.getActiveEngine();

    if (!adapter.supportsStreaming || !adapter.renderStream) {
      throw new Error(
        `Engine '${adapter.name}' does not support streaming. Use render() instead.`,
      );
    }

    return adapter.renderStream(view, { ...data, ...options?.locals });
  }

  /**
   * Enable hot reload for views.
   */
  async enableHotReload(): Promise<void> {
    if (this.hotReloader) return;

    const { HotReload } = await import("./features/hot-reload");
    this.hotReloader = new HotReload(this.config.viewsDir || "views");
    this.hotReloader.setOnChange(() => {
      // Notify active engine
      this.activeEngine?.onHotReload?.();
    });
    this.hotReloader.start();
  }

  /**
   * Enable view type generation.
   */
  async enableTypeGeneration(): Promise<void> {
    if (this.typeGenerator) return;

    const { TypeGenerator } = await import("./features/type-generator");
    this.typeGenerator = new TypeGenerator();

    const viewsDir = this.config.viewsDir;
    if (viewsDir) {
      const dir = Array.isArray(viewsDir) ? viewsDir[0] : viewsDir;
      await this.typeGenerator.generateViewTypes(dir);
    }
  }

  /**
   * Enable the view debugger endpoint.
   */
  async enableViewDebugger(): Promise<void> {
    if (this.viewDebugger) return;

    const { ViewDebugger } = await import("./features/view-debugger");
    this.viewDebugger = new ViewDebugger(this);
    this.viewDebugger.registerRoutes(this.app);
  }

  /**
   * Get list of registered engine names.
   *
   * @returns Array of engine names
   */
  getRegisteredEngines(): Array<string> {
    return this.registry.getNames();
  }

  /**
   * Get list of discovered view files.
   *
   * @returns Array of view file paths
   */
  getViewFiles(): Array<string> {
    const viewsDir = this.config.viewsDir || "views";
    const dir = Array.isArray(viewsDir) ? viewsDir[0] : viewsDir;

    // Return synchronously cached result or empty array
    // Full scan is sync for immediate return
    try {
      const files: Array<string> = [];

      const scanDir = (dirPath: string): void => {
        if (!fs.existsSync(dirPath)) return;

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      };

      scanDir(dir);
      return files;
    } catch {
      return [];
    }
  }

  /**
   * Get current configuration.
   *
   * @returns Render configuration
   */
  getConfig(): RenderConfig {
    return { ...this.config };
  }

  /**
   * Get render metrics.
   *
   * @returns Render metrics
   */
  getMetrics(): RenderMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if an engine is available (installed).
   *
   * @param engine - Engine type to check
   * @returns Whether the engine is available
   */
  isEngineAvailable(engine: EngineType): boolean {
    const adapter = this.registry.get(engine);
    if (!adapter) return false;

    const resolver = getPackageResolver();
    return resolver.isInstalled(adapter.packageName);
  }

  /**
   * Register built-in engine adapters.
   */
  private registerBuiltInAdapters(): void {
    this.registry.register(new EjsAdapter());
    this.registry.register(new PugAdapter());
    this.registry.register(new HandlebarsAdapter());
    this.registry.register(new ReactAdapter());
  }

  /**
   * Apply default configuration values.
   *
   * @param config - User configuration
   * @returns Configuration with defaults applied
   */
  private applyDefaults(config: RenderConfig): RenderConfig {
    const isDev = this.isDevelopment();

    return {
      engine: "auto",
      viewsDir: config.viewsDir || path.join(process.cwd(), "views"),
      cache: config.cache === "auto" ? !isDev : (config.cache ?? !isDev),
      watch: config.watch === "auto" ? isDev : (config.watch ?? isDev),
      debug: config.debug ?? isDev,
      streaming: config.streaming ?? true,
      ...config,
    };
  }

  /**
   * Build engine-specific options from config.
   *
   * @param config - Render configuration
   * @returns Engine options
   */
  private buildEngineOptions(config: RenderConfig): any {
    const engine = config.engine as EngineType;

    const baseOptions = {
      viewsDir: config.viewsDir,
      cache: config.cache === true,
    };

    switch (engine) {
      case "ejs":
        return {
          ...baseOptions,
          ...config.ejsOptions,
          serverOptions: {
            cache: config.cache === true,
            ...config.ejsOptions?.serverOptions,
          },
        };
      case "pug":
        return {
          ...baseOptions,
          ...config.pugOptions,
        };
      case "hbs":
        return {
          ...baseOptions,
          partialsDir: config.partialsDir,
          ...config.hbsOptions,
        };
      case "react":
        return {
          ...baseOptions,
          clientBundleDir: config.clientBundleDir,
          ssr: config.ssr,
          streaming: config.streaming,
          ...config.reactOptions,
        };
      default:
        return baseOptions;
    }
  }

  /**
   * Update render metrics.
   *
   * @param engineName - Engine that performed the render
   * @param renderTime - Time taken to render in ms
   */
  private updateMetrics(engineName: string, renderTime: number): void {
    this.metrics.totalRenders++;
    this.renderTimes.push(renderTime);

    // Keep only last 100 render times for average
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }

    // Calculate average
    this.metrics.avgRenderTime =
      this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;

    // Track by engine
    this.metrics.rendersByEngine[engineName] =
      (this.metrics.rendersByEngine[engineName] || 0) + 1;
  }

  /**
   * Check if running in development mode.
   *
   * @returns Whether in development mode
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV !== "production";
  }

  /**
   * Log the current configuration.
   */
  private logConfiguration(): void {
    const engine = this.activeEngine?.name || "unknown";
    const viewsDir = this.config.viewsDir || "views";
    const features: Array<string> = [];

    if (this.config.watch) features.push("hot-reload");
    if (this.config.debug) features.push("debug");
    if (this.config.streaming) features.push("streaming");
    if (this.config.ssr?.hydrate) features.push("ssr");

    this.logger.info(
      `Render engine: ${engine} | Views: ${viewsDir} | Features: ${features.join(", ") || "none"}`,
      "render-service",
    );
  }
}
