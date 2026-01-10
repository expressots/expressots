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
} from "./render-config";

// Interfaces
export type { EngineAdapter, IRenderService } from "./render-interface";

// Registry
export { EngineRegistry } from "./render-registry";

// Base adapter
export { BaseEngineAdapter } from "./adapters/base-adapter";

// Engine adapters
export { EjsAdapter } from "./adapters/ejs-adapter";
export { PugAdapter } from "./adapters/pug-adapter";
export { HandlebarsAdapter } from "./adapters/handlebars-adapter";
export { ReactAdapter } from "./adapters/react-adapter";

// Utilities
export {
  PackageResolver,
  PackageNotInstalledError,
  getPackageResolver,
} from "./utils/package-resolver";
export { ViewScanner, getViewScanner } from "./utils/view-scanner";
export { CacheManager, getCacheManager } from "./utils/cache-manager";
export type { CacheStats } from "./utils/cache-manager";

// Service (will be added in Phase 4)
export { RenderService } from "./render-service";

// Features (will be added in Phase 5)
export { AutoDetection } from "./features/auto-detection";
export { HotReload } from "./features/hot-reload";
export { ViewDebugger } from "./features/view-debugger";
export { StreamingRenderer } from "./features/streaming";
export { TypeGenerator } from "./features/type-generator";

// Presets (will be added in Phase 6)
export {
  developmentPreset as renderDevelopmentPreset,
  productionPreset as renderProductionPreset,
  ssrPreset as renderSsrPreset,
  getPreset as getRenderPreset,
} from "./presets";
