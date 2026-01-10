/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Application } from "express";
import type {
  RenderConfig,
  RenderOptions,
  StreamOptions,
  RenderMetrics,
  EngineType,
} from "./render-config";

/**
 * Engine Adapter Interface
 *
 * @description Defines the contract for template engine adapters.
 * Each supported engine (EJS, Pug, Handlebars, React, etc.) must implement this interface.
 *
 * @public API
 */
export interface EngineAdapter {
  /** Unique engine identifier */
  readonly name: string;
  /** File extensions this engine handles */
  readonly extensions: Array<string>;
  /** NPM package name for this engine */
  readonly packageName: string;
  /** Whether this engine supports streaming render */
  readonly supportsStreaming: boolean;
  /** Whether this engine supports SSR with hydration */
  readonly supportsSSR: boolean;

  /**
   * Initialize and configure the engine with the Express app.
   * @param app - Express application instance
   * @param options - Engine-specific configuration
   */
  setup(app: Application, options: any): Promise<void>;

  /**
   * Render a view to string.
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  render(view: string, data: any): Promise<string>;

  /**
   * Render a view as a stream (optional).
   * Only available if supportsStreaming is true.
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @returns Readable stream of HTML
   */
  renderStream?(view: string, data: any): NodeJS.ReadableStream;

  // Lifecycle hooks
  /** Called when hot reload is triggered */
  onHotReload?(): void;
  /** Called when cache should be invalidated */
  onCacheInvalidate?(): void;
}

/**
 * Render Service Interface
 *
 * @description Main service for managing view rendering across different engines.
 * Provides a unified API for configuration, rendering, and introspection.
 *
 * @public API
 */
export interface IRenderService {
  // Configuration
  /**
   * Configure the render service with the given options.
   * @param config - Render configuration
   */
  configure(config: RenderConfig): Promise<void>;

  // Engine management
  /**
   * Register a new engine adapter.
   * @param adapter - Engine adapter to register
   */
  registerEngine(adapter: EngineAdapter): void;

  /**
   * Get a registered engine by name.
   * @param name - Engine name
   * @returns Engine adapter or undefined
   */
  getEngine(name: string): EngineAdapter | undefined;

  /**
   * Get the currently active engine.
   * @returns Active engine adapter
   */
  getActiveEngine(): EngineAdapter;

  // Rendering
  /**
   * Render a view to string.
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @param options - Additional render options
   * @returns Rendered HTML string
   */
  render(view: string, data: any, options?: RenderOptions): Promise<string>;

  /**
   * Render a view as a stream.
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @param options - Stream options
   * @returns Readable stream of HTML
   */
  renderStream(
    view: string,
    data: any,
    options?: StreamOptions,
  ): NodeJS.ReadableStream;

  // Features
  /** Enable hot reload for views in development */
  enableHotReload(): void;
  /** Enable TypeScript type generation for views */
  enableTypeGeneration(): void;
  /** Enable debug endpoint at /__views */
  enableViewDebugger(): void;

  // Introspection
  /**
   * Get list of registered engine names.
   * @returns Array of engine names
   */
  getRegisteredEngines(): Array<string>;

  /**
   * Get list of discovered view files.
   * @returns Array of view file paths
   */
  getViewFiles(): Array<string>;

  /**
   * Get current configuration.
   * @returns Render configuration
   */
  getConfig(): RenderConfig;

  /**
   * Get render metrics.
   * @returns Render metrics
   */
  getMetrics(): RenderMetrics;

  /**
   * Check if an engine is available (installed).
   * @param engine - Engine type to check
   * @returns Whether the engine is available
   */
  isEngineAvailable(engine: EngineType): boolean;
}
