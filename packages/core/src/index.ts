/**
 * ExpressoTS Core
 *
 * @packageDocumentation
 */

export * from "./application/index.js";
export * from "./config/index.js";
export * from "./console/index.js";
export * from "./container-module/index.js";
export * from "./decorator/index.js";
export * from "./error/index.js";
export * from "./event/index.js";
export * from "./interceptor/index.js";
export * from "./lazy-loading/index.js";
export * from "./lifecycle/index.js";
export * from "./middleware/index.js";
export * from "./provider/index.js";
export * from "./render/index.js";
export * from "./di/inversify.js";
export * from "./authorization/index.js";
export * from "./testing/index.js";

/**
 * Path resolution utilities (for advanced use cases)
 * Note: Path aliases are automatically resolved at build time by the CLI.
 * These exports are available for manual/advanced scenarios only.
 */
export { initializePathResolution } from "./path-resolver/index.js";
