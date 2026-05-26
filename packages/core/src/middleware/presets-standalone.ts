/**
 * Standalone (free-function) wrappers around the v4 middleware preset system.
 *
 * These exist alongside the `Middleware.definePreset` / `Middleware.applyPreset`
 * instance methods so user code that doesn't have DI access to the `Middleware`
 * provider — for example, declarative config files outside of the request
 * lifecycle — can still register and apply presets.
 *
 * Usage:
 * ```ts
 * import { definePreset, applyPreset } from "@expressots/core";
 *
 * definePreset("my-api", {
 *   parse: { json: { limit: "1mb" } },
 *   security: { cors: { origin: "https://app.example.com" } },
 * });
 *
 * // ...later, inside configureServices(), with the Middleware DI provider:
 * applyPreset(this.services.middleware, "my-api");
 * ```
 *
 * @public API
 */

import type { Middleware } from "./middleware-service.js";
import type { MiddlewareConfig } from "./middleware-config.js";

/** Module-level registry of presets defined via the standalone helper. */
const standalonePresets = new Map<string, MiddlewareConfig>();

/**
 * Register a custom middleware preset under the given name.
 *
 * The preset is stored in a module-level registry so it can be referenced
 * later by `applyPreset(middleware, name)`. Calling `definePreset` with an
 * existing name overwrites the previous definition.
 *
 * @param name   unique identifier for the preset
 * @param config v4 middleware config object describing the preset
 *
 * @public API
 */
export function definePreset(name: string, config: MiddlewareConfig): void {
  standalonePresets.set(name, config);
}

/**
 * Apply a previously defined preset (built-in or registered via
 * `definePreset`) to the supplied `Middleware` instance.
 *
 * Resolution order:
 *  1. Built-in v4 presets (`api`, `web`, `spa`, `microservice`, `graphql`,
 *     `minimal`, `development`, `production`) are matched by the
 *     `Middleware` instance itself.
 *  2. Custom presets previously registered via `Middleware.definePreset`
 *     on the same instance.
 *  3. Custom presets registered via the standalone `definePreset` here —
 *     these are forwarded to the instance on demand.
 *
 * @param middleware the active `Middleware` provider (typically resolved from
 *                   the DI container inside `configureServices()`)
 * @param name       preset to apply
 * @param overrides  optional partial config that is merged on top of the
 *                   preset before application
 *
 * @public API
 */
export function applyPreset(
  middleware: Middleware,
  name: string,
  overrides?: Partial<MiddlewareConfig>,
): void {
  const standalone = standalonePresets.get(name);
  if (standalone !== undefined) {
    middleware.definePreset(name, standalone);
  }
  middleware.applyPreset(name, overrides);
}

/**
 * Returns the names of every preset registered through the standalone
 * `definePreset` helper. Built-in presets and per-instance custom presets
 * are NOT included — those live on the `Middleware` instance.
 *
 * @public API
 */
export function getStandalonePresetNames(): Array<string> {
  return Array.from(standalonePresets.keys());
}

/**
 * Remove every preset registered through the standalone `definePreset`
 * helper. Useful in tests; rarely needed at runtime.
 *
 * @public API
 */
export function clearStandalonePresets(): void {
  standalonePresets.clear();
}
