/**
 * ExpressoTS Render Engine
 *
 * @module render
 * @description Unified render engine system supporting traditional template engines
 * (EJS, Pug, Handlebars) and modern frameworks (React, Vue, Svelte).
 *
 * @example Simple usage
 * ```typescript
 * // In app.ts
 * this.Middleware.render(); // Auto-detects installed engine
 * ```
 *
 * @example With preset
 * ```typescript
 * this.Middleware.render('production');
 * ```
 *
 * @example Full configuration
 * ```typescript
 * this.Middleware.render({
 *   engine: 'react',
 *   viewsDir: 'src/views',
 *   cache: 'auto',
 *   ssr: { hydrate: true, streaming: true },
 *   watch: 'auto'
 * });
 * ```
 *
 * @public API
 */

// Configuration types
export type {
  RenderConfig,
  RenderOptions,
  StreamOptions,
  RenderMetrics,
  ViewInfo,
  EngineType,
  PresetName as RenderPresetName,
  CacheConfig,
  SSRConfig,
  EngineConfig,
  EjsConfig,
  PugConfig,
  HandlebarsConfig,
  ReactConfig,
} from "./render-config.js";

// Interfaces
export type { EngineAdapter, IRenderService } from "./render-interface.js";

// Registry
export { EngineRegistry } from "./render-registry.js";

// Base adapter
export { BaseEngineAdapter } from "./adapters/base-adapter.js";

// Engine adapters
export { EjsAdapter } from "./adapters/ejs-adapter.js";
export { PugAdapter } from "./adapters/pug-adapter.js";
export { HandlebarsAdapter } from "./adapters/handlebars-adapter.js";
export { ReactAdapter } from "./adapters/react-adapter.js";

// Utilities
export {
  PackageResolver,
  PackageNotInstalledError,
  getPackageResolver,
} from "./utils/package-resolver.js";
export { ViewScanner, getViewScanner } from "./utils/view-scanner.js";
export { CacheManager, getCacheManager } from "./utils/cache-manager.js";
export type { CacheStats } from "./utils/cache-manager.js";

// Service
export { RenderService } from "./render-service.js";

// Features
export { AutoDetection } from "./features/auto-detection.js";
export { HotReload } from "./features/hot-reload.js";
export { ViewDebugger } from "./features/view-debugger.js";
export { StreamingRenderer } from "./features/streaming.js";
export { TypeGenerator } from "./features/type-generator.js";

// Presets
export {
  developmentPreset as renderDevelopmentPreset,
  productionPreset as renderProductionPreset,
  ssrPreset as renderSsrPreset,
  getPreset as getRenderPreset,
} from "./presets/index.js";
