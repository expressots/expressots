/**
 * Standalone (free-function) wrappers around `LazyModule` chain methods.
 *
 * The fluent API (`module.withPreloadHint(...).withLazyConfig(...)`) remains
 * the recommended style. These helpers exist so users can compose lazy
 * configurations with point-free style or apply the same hint to a list of
 * modules:
 *
 * ```ts
 * import { CreateLazyModule, withPreloadHint, withLazyConfig } from "@expressots/core";
 *
 * const Admin = withPreloadHint(
 *   CreateLazyModule([AdminController]),
 *   "low",
 * );
 *
 * const Analytics = withLazyConfig(
 *   CreateLazyModule([AnalyticsController]),
 *   { preloadHint: "medium", prefetchAfterIdle: 5000 },
 * );
 * ```
 *
 * @public API
 */

import type { ILazyModule, LazyModuleConfig, PreloadHint } from "./lazy.interfaces.js";

/**
 * Set a preload hint on the supplied lazy module and return it.
 *
 * Equivalent to `module.withPreloadHint(hint)`. Returned reference is the same
 * instance — no copy is made.
 *
 * @public API
 */
export function withPreloadHint(
  module: ILazyModule,
  hint: PreloadHint,
): ILazyModule {
  return module.withPreloadHint(hint);
}

/**
 * Merge the supplied partial config into the lazy module and return it.
 *
 * Equivalent to `module.withLazyConfig(config)`.
 *
 * @public API
 */
export function withLazyConfig(
  module: ILazyModule,
  config: Partial<LazyModuleConfig>,
): ILazyModule {
  return module.withLazyConfig(config);
}
