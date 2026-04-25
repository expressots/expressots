/**
 * Render Engine Presets
 *
 * @module render/presets
 * @description Pre-configured render configurations for common scenarios.
 * @public API
 */

import type { RenderConfig, PresetName } from "../render-config.js";

/**
 * Development Preset
 *
 * Optimized for development with:
 * - No caching (see changes immediately)
 * - Hot reload enabled
 * - Debug mode with /__views endpoint
 * - Streaming disabled for easier debugging
 *
 * @public API
 */
export const developmentPreset: RenderConfig = {
  cache: false,
  watch: true,
  debug: true,
  streaming: false,
  ssr: {
    hydrate: true,
    streaming: false,
    preload: false,
  },
};

/**
 * Production Preset
 *
 * Optimized for production with:
 * - View caching enabled
 * - No hot reload
 * - Debug mode disabled
 * - Streaming enabled for performance
 *
 * @public API
 */
export const productionPreset: RenderConfig = {
  cache: true,
  watch: false,
  debug: false,
  streaming: true,
  ssr: {
    hydrate: true,
    streaming: true,
    preload: true,
  },
};

/**
 * SSR Preset
 *
 * Optimized for server-side rendering with:
 * - Caching enabled
 * - Streaming enabled
 * - Full hydration support
 * - Progressive rendering
 *
 * @public API
 */
export const ssrPreset: RenderConfig = {
  cache: true,
  streaming: true,
  watch: false,
  debug: false,
  ssr: {
    hydrate: true,
    streaming: true,
    preload: true,
    progressive: true,
  },
};

/**
 * Edge Preset
 *
 * Optimized for edge computing environments with:
 * - Memory-only caching
 * - Streaming enabled
 * - Minimal runtime overhead
 *
 * @public API
 */
export const edgePreset: RenderConfig = {
  cache: true,
  streaming: true,
  watch: false,
  debug: false,
  ssr: {
    hydrate: true,
    streaming: true,
    preload: false,
  },
};

/**
 * API Preset
 *
 * Optimized for API-first applications with:
 * - Minimal view configuration
 * - Caching based on environment
 *
 * @public API
 */
export const apiPreset: RenderConfig = {
  cache: "auto",
  watch: "auto",
  debug: false,
  streaming: false,
};

/**
 * All available presets
 */
const presets: Record<PresetName | string, RenderConfig> = {
  development: developmentPreset,
  production: productionPreset,
  ssr: ssrPreset,
  edge: edgePreset,
  api: apiPreset,
};

/**
 * Get a preset by name.
 *
 * @param name - Preset name
 * @returns Preset configuration
 * @throws Error if preset not found
 *
 * @public API
 */
export function getPreset(name: PresetName | string): RenderConfig {
  const preset = presets[name];

  if (!preset) {
    throw new Error(
      `Unknown render preset: '${name}'. Available presets: ${Object.keys(presets).join(", ")}`,
    );
  }

  // Return a copy to prevent mutations
  return { ...preset, ssr: preset.ssr ? { ...preset.ssr } : undefined };
}

/**
 * Get all available preset names.
 *
 * @returns Array of preset names
 *
 * @public API
 */
export function getPresetNames(): Array<string> {
  return Object.keys(presets);
}

/**
 * Check if a preset exists.
 *
 * @param name - Preset name
 * @returns Whether the preset exists
 *
 * @public API
 */
export function hasPreset(name: string): boolean {
  return name in presets;
}

/**
 * Register a custom preset.
 *
 * @param name - Preset name
 * @param config - Preset configuration
 *
 * @public API
 */
export function registerPreset(name: string, config: RenderConfig): void {
  presets[name] = config;
}

/**
 * Merge multiple presets.
 *
 * @param basePreset - Base preset name
 * @param overrides - Configuration overrides
 * @returns Merged configuration
 *
 * @public API
 */
export function mergePreset(
  basePreset: PresetName | string,
  overrides: Partial<RenderConfig>,
): RenderConfig {
  const base = getPreset(basePreset);

  return {
    ...base,
    ...overrides,
    ssr: {
      ...base.ssr,
      ...overrides.ssr,
    },
  };
}

/**
 * Auto-select preset based on environment.
 *
 * @returns Appropriate preset for current environment
 *
 * @public API
 */
export function autoSelectPreset(): RenderConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return getPreset("production");
    case "test":
      return getPreset("development");
    default:
      return getPreset("development");
  }
}
