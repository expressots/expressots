/**
 * ExpressoTS v4 Upload Configuration Registry
 *
 * Singleton registry for global upload configuration.
 * Used by @FileUpload decorator to get default settings.
 *
 * @module upload-registry
 * @public API
 */

import type { UploadConfig } from "./middleware-config.js";

/**
 * Global upload configuration storage.
 * @internal
 */
let globalUploadConfig: UploadConfig | null = null;

/**
 * Set the global upload configuration.
 * Called by Middleware.upload() when configuring uploads globally.
 *
 * @param config - Upload configuration
 * @public API
 */
export function setGlobalUploadConfig(config: UploadConfig): void {
  globalUploadConfig = config;
}

/**
 * Get the global upload configuration.
 * Used by @FileUpload decorator to get default settings.
 *
 * @returns The global upload config or null if not set
 * @public API
 */
export function getGlobalUploadConfig(): UploadConfig | null {
  return globalUploadConfig;
}

/**
 * Check if global upload configuration is set.
 *
 * @returns True if global config exists
 * @public API
 */
export function hasGlobalUploadConfig(): boolean {
  return globalUploadConfig !== null;
}

/**
 * Clear the global upload configuration.
 * Mainly for testing purposes.
 *
 * @internal
 */
export function clearGlobalUploadConfig(): void {
  globalUploadConfig = null;
}

/**
 * Merge upload configurations.
 * Local config takes precedence over global config.
 *
 * @param global - Global configuration (defaults)
 * @param local - Local configuration (overrides)
 * @returns Merged configuration
 * @public API
 */
export function mergeUploadConfigs(
  global: UploadConfig | null,
  local?: Partial<UploadConfig>,
): UploadConfig {
  if (!global && !local) {
    return {};
  }

  if (!global) {
    return local as UploadConfig;
  }

  if (!local) {
    return global;
  }

  // Deep merge limits
  const mergedLimits =
    global.limits || local.limits
      ? {
          ...global.limits,
          ...local.limits,
        }
      : undefined;

  return {
    ...global,
    ...local,
    limits: mergedLimits,
  };
}
