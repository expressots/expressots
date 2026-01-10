/**
 * ExpressoTS Core
 *
 * @packageDocumentation
 */

export * from "./application";
export * from "./config";
export * from "./console";
export * from "./container-module";
export * from "./decorator";
export * from "./error";
export * from "./event";
export * from "./interceptor";
export * from "./lazy-loading";
export * from "./lifecycle";
export * from "./middleware";
export * from "./provider";
export * from "./render";
export * from "./di/inversify";
export * from "./authorization";
export * from "./testing";

/**
 * Path resolution utilities (for advanced use cases)
 * Note: Path aliases are automatically resolved at build time by the CLI.
 * These exports are available for manual/advanced scenarios only.
 */
export { initializePathResolution } from "./path-resolver";
