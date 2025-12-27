/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../provider/logger/logger.provider";
import type { ExpressHandler } from "./middleware-service";

/**
 * Registry mapping middleware names to their npm package names.
 * @internal
 */
const MIDDLEWARE_REGISTRY = {
  cors: "cors",
  compression: "compression",
  cookieParser: "cookie-parser",
  cookieSession: "cookie-session",
  serveFavicon: "serve-favicon",
  morgan: "morgan",
  helmet: "helmet",
  rateLimit: "express-rate-limit",
  multer: "multer",
  session: "express-session",
} as const;

/**
 * Type for registered middleware names.
 * @public API
 */
export type RegisteredMiddlewareName = keyof typeof MIDDLEWARE_REGISTRY;

/**
 * Cached resolved modules for O(1) subsequent access.
 * @internal
 */
const moduleCache = new Map<string, unknown>();

/**
 * Cached package installation status to avoid repeated filesystem checks.
 * @internal
 */
const installStatusCache = new Map<string, boolean>();

/**
 * Singleton logger instance - lazily initialized.
 * @internal
 */
let loggerInstance: Logger | null = null;

/**
 * Get the singleton logger instance.
 * @returns Logger instance
 * @internal
 */
function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

/**
 * Check if a package is installed in the project.
 * Results are cached for performance.
 *
 * @param packageName - The npm package name to check
 * @returns True if the package is installed
 * @internal
 */
function isPackageInstalled(packageName: string): boolean {
  const cached = installStatusCache.get(packageName);
  if (cached !== undefined) {
    return cached;
  }

  try {
    require.resolve(packageName, { paths: [process.cwd()] });
    installStatusCache.set(packageName, true);
    return true;
  } catch {
    installStatusCache.set(packageName, false);
    return false;
  }
}

/**
 * Resolve and cache a middleware module.
 *
 * @param packageName - The npm package name to resolve
 * @returns The resolved module or null if not installed/failed
 * @internal
 */
function resolveModule<T = unknown>(packageName: string): T | null {
  const cached = moduleCache.get(packageName);
  if (cached !== undefined) {
    return cached as T;
  }

  if (!isPackageInstalled(packageName)) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(packageName);
    const resolved = mod.default ?? mod;
    moduleCache.set(packageName, resolved);
    return resolved as T;
  } catch (error) {
    getLogger().error(
      `Failed to load middleware [${packageName}]: ${error}`,
      "middleware-resolver",
    );
    return null;
  }
}

/**
 * Resolve a middleware by name and configure it with the provided options.
 *
 * @layer public
 * @audience application-developers
 * @concept middleware-resolution
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Resolve and configure middleware packages automatically.
 *
 * @example
 * ```typescript
 * const corsMiddleware = middlewareResolver("cors", { origin: true });
 * const helmetMiddleware = middlewareResolver("helmet");
 *
 * if (corsMiddleware) {
 *   app.use(corsMiddleware);
 * }
 * ```
 *
 * **Features:**
 * - Auto-discovers installed middleware packages
 * - Caches resolved modules for performance
 * - Returns null if middleware not installed
 * - Supports all registered middleware types
 *
 * @param middlewareName - The name of the middleware (e.g., "cors", "helmet")
 * @param options - Configuration options to pass to the middleware factory
 * @returns The configured middleware handler or null if not available
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Checks package installation status (cached)
 * - Resolves module using require.resolve (cached)
 * - Calls middleware factory with options
 * - Returns null on failure (logs error)
 *
 * @see {@link MIDDLEWARE_REGISTRY} for registered middleware
 * @see {@link isMiddlewareAvailable} for availability check
 *
 * @public API
 */
function middlewareResolver(
  middlewareName: RegisteredMiddlewareName | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...options: Array<any>
): ExpressHandler | null {
  const packageName =
    MIDDLEWARE_REGISTRY[middlewareName as RegisteredMiddlewareName];

  if (!packageName) {
    getLogger().error(
      `Unknown middleware: ${middlewareName}. Available: ${Object.keys(MIDDLEWARE_REGISTRY).join(", ")}`,
      "middleware-resolver",
    );
    return null;
  }

  // Check installation status first (cached)
  if (!isPackageInstalled(packageName)) {
    getLogger().warn(
      `Middleware [${packageName}] not installed. Please install it using your package manager.`,
      "middleware-resolver",
    );
    return null;
  }

  // Resolve the module (cached)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const middlewareFactory =
    resolveModule<(...args: Array<any>) => ExpressHandler>(packageName);

  if (!middlewareFactory) {
    return null;
  }

  try {
    return middlewareFactory(...options);
  } catch (error) {
    getLogger().error(
      `Failed to initialize middleware [${middlewareName}]: ${error}`,
      "middleware-resolver",
    );
    return null;
  }
}

/**
 * Check if a middleware package is available without logging warnings.
 * Useful for conditional middleware loading.
 *
 * @param middlewareName - The middleware name to check
 * @returns True if the middleware is installed and available
 *
 * @example
 * ```typescript
 * if (isMiddlewareAvailable("helmet")) {
 *   middleware.addHelmet();
 * }
 * ```
 *
 * @public API
 */
function isMiddlewareAvailable(
  middlewareName: RegisteredMiddlewareName | string,
): boolean {
  const packageName =
    MIDDLEWARE_REGISTRY[middlewareName as RegisteredMiddlewareName];
  return packageName ? isPackageInstalled(packageName) : false;
}

/**
 * Get a list of all installed middleware from the registry.
 *
 * @returns Array of installed middleware names
 *
 * @example
 * ```typescript
 * const available = getAvailableMiddleware();
 * console.log("Installed middleware:", available);
 * // Output: ["cors", "helmet", "compression"]
 * ```
 *
 * @public API
 */
function getAvailableMiddleware(): Array<RegisteredMiddlewareName> {
  return (
    Object.keys(MIDDLEWARE_REGISTRY) as Array<RegisteredMiddlewareName>
  ).filter((name) => isMiddlewareAvailable(name));
}

/**
 * Get all registered middleware names (whether installed or not).
 *
 * @returns Array of all registered middleware names
 * @public API
 */
function getRegisteredMiddleware(): Array<RegisteredMiddlewareName> {
  return Object.keys(MIDDLEWARE_REGISTRY) as Array<RegisteredMiddlewareName>;
}

/**
 * Clear all middleware caches.
 * Useful for testing or when packages are installed at runtime.
 *
 * @public API
 */
function clearMiddlewareCache(): void {
  moduleCache.clear();
  installStatusCache.clear();
}

/**
 * Get the npm package name for a registered middleware.
 *
 * @param middlewareName - The middleware name
 * @returns The npm package name or undefined if not registered
 * @public API
 */
function getPackageName(
  middlewareName: RegisteredMiddlewareName | string,
): string | undefined {
  return MIDDLEWARE_REGISTRY[middlewareName as RegisteredMiddlewareName];
}

export {
  middlewareResolver,
  isMiddlewareAvailable,
  getAvailableMiddleware,
  getRegisteredMiddleware,
  clearMiddlewareCache,
  getPackageName,
  MIDDLEWARE_REGISTRY,
};
