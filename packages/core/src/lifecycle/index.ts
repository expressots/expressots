/**
 * Lifecycle Module for ExpressoTS
 *
 * Provides auto-discovery lifecycle hooks for providers.
 *
 * @module lifecycle
 */

export {
  IBootstrap,
  IShutdown,
  isBootstrap,
  isShutdown,
} from "./lifecycle.interface.js";
export { LifecycleRegistry } from "./lifecycle-registry.js";
