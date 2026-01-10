/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Render Engine Configuration Types
 *
 * @module render/config
 * @description Configuration types for the unified render engine system.
 * @public API
 */

/**
 * Supported template engine types.
 * @public API
 */
export type EngineType = "ejs" | "pug" | "hbs" | "react" | "vue" | "svelte";

/**
 * Preset names for common configurations.
 * @public API
 */
export type PresetName = "development" | "production" | "ssr" | "edge";

/**
 * Cache configuration options.
 * @public API
 */
export interface CacheConfig {
  /** Enable/disable caching */
  enabled: boolean;
  /** Cache strategy: memory, file, or redis */
  strategy?: "memory" | "file" | "redis";
  /** Time-to-live in seconds */
  ttl?: number;
  /** Maximum cache size */
  maxSize?: number;
}

/**
 * SSR (Server-Side Rendering) configuration.
 * @public API
 */
export interface SSRConfig {
  /** Enable client-side hydration */
  hydrate?: boolean;
  /** Enable streaming render */
  streaming?: boolean;
  /** Preload data before render */
  preload?: boolean;
  /** Enable progressive rendering */
  progressive?: boolean;
}

/**
 * Engine-specific configuration.
 * @public API
 */
export interface EngineConfig {
  /** Views directory for this engine */
  viewsDir?: string | Array<string>;
  /** Additional engine-specific options */
  options?: Record<string, any>;
  /** Routes this engine handles (for multi-engine setup) */
  routes?: Array<string>;
}

/**
 * Main render configuration interface.
 * @public API
 */
export interface RenderConfig {
  // Engine selection
  /** Template engine to use, or 'auto' for auto-detection */
  engine?: EngineType | "auto";
  /** Multiple engine configurations for hybrid setups */
  engines?: Record<string, EngineConfig>;

  // Directories
  /** Path(s) to view templates */
  viewsDir?: string | Array<string>;
  /** Path to layout templates */
  layoutsDir?: string;
  /** Path to partial templates */
  partialsDir?: string;

  // Performance
  /** Enable view caching */
  cache?: boolean | "auto" | CacheConfig;
  /** Enable streaming render */
  streaming?: boolean;

  // Development
  /** Enable hot reload for views */
  watch?: boolean | "auto";
  /** Enable debug mode and /__views endpoint */
  debug?: boolean;

  // SSR configuration
  /** Server-side rendering options */
  ssr?: SSRConfig;

  // Advanced
  /** Directory for client-side bundles (React/Vue/Svelte) */
  clientBundleDir?: string;
  /** Apply a preset configuration */
  preset?: PresetName;

  // Engine-specific options
  /** EJS-specific options */
  ejsOptions?: EjsConfig;
  /** Pug-specific options */
  pugOptions?: PugConfig;
  /** Handlebars-specific options */
  hbsOptions?: HandlebarsConfig;
  /** React-specific options */
  reactOptions?: ReactConfig;
}

/**
 * EJS engine configuration.
 * @public API
 */
export interface EjsConfig {
  /** View engine name */
  viewEngine?: string;
  /** Views directory */
  viewsDir?: string | Array<string>;
  /** EJS server options */
  serverOptions?: {
    cache?: boolean;
    compileDebug?: boolean;
    debug?: boolean;
    delimiter?: string;
    strict?: boolean;
  };
}

/**
 * Pug engine configuration.
 * @public API
 */
export interface PugConfig {
  /** View engine name */
  viewEngine?: string;
  /** Views directory */
  viewsDir?: string;
  /** Pug-specific options */
  options?: {
    pretty?: boolean;
    compileDebug?: boolean;
    debug?: boolean;
  };
}

/**
 * Handlebars engine configuration.
 * @public API
 */
export interface HandlebarsConfig {
  /** View engine name */
  viewEngine?: string;
  /** Views directory */
  viewsDir?: string;
  /** Partials directory */
  partialsDir?: string;
  /** Helpers to register */
  helpers?: Record<string, (...args: Array<any>) => any>;
}

/**
 * React SSR configuration.
 * @public API
 */
export interface ReactConfig {
  /** Views directory containing React components */
  viewsDir?: string;
  /** Directory for client-side bundles */
  clientBundleDir?: string;
  /** SSR configuration */
  ssr?: SSRConfig;
  /** Enable streaming render */
  streaming?: boolean;
}

/**
 * Render options for individual render calls.
 * @public API
 */
export interface RenderOptions {
  /** Override default layout */
  layout?: string | false;
  /** Additional locals to pass to template */
  locals?: Record<string, any>;
  /** Enable streaming for this render */
  streaming?: boolean;
}

/**
 * Stream options for streaming render.
 * @public API
 */
export interface StreamOptions extends RenderOptions {
  /** Callback when shell is ready (React) */
  onShellReady?: () => void;
  /** Callback when all content is ready */
  onAllReady?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Render metrics for monitoring.
 * @public API
 */
export interface RenderMetrics {
  /** Total renders performed */
  totalRenders: number;
  /** Cache hit count */
  cacheHits: number;
  /** Cache miss count */
  cacheMisses: number;
  /** Average render time in ms */
  avgRenderTime: number;
  /** Renders by engine */
  rendersByEngine: Record<string, number>;
}

/**
 * View information for introspection.
 * @public API
 */
export interface ViewInfo {
  /** View name/path */
  name: string;
  /** Full file path */
  path: string;
  /** File extension */
  extension: string;
  /** Associated engine */
  engine: EngineType;
  /** Props type (for type generation) */
  propsType?: string;
}
