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
  // v4 additions
  pino: "pino-http",
  winston: "express-winston",
  shrinkRay: "shrink-ray-current",
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
 * Buffered startup warnings from resolver (for display after banner).
 * @internal
 */
const resolverStartupWarnings: Array<{
  message: string;
  type: "info" | "warn";
}> = [];

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
 * Get buffered resolver startup warnings.
 * @returns Array of warning messages
 * @public API
 */
function getResolverStartupWarnings(): Array<{
  message: string;
  type: "info" | "warn";
}> {
  return [...resolverStartupWarnings];
}

/**
 * Clear buffered resolver startup warnings.
 * @public API
 */
function clearResolverStartupWarnings(): void {
  resolverStartupWarnings.length = 0;
}

/**
 * Buffer a startup warning instead of logging immediately.
 * @internal
 */
function bufferStartupWarning(message: string): void {
  resolverStartupWarnings.push({ message, type: "warn" });
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

    // Handle various module export patterns:
    // 1. CommonJS: module.exports = fn → mod is the function
    // 2. ES Module with default: export default fn → mod.default is the function
    // 3. ES Module transpiled: mod.__esModule with default → mod.default
    let resolved: T;
    if (typeof mod === "function") {
      // Direct function export (most CommonJS modules like morgan, cors, etc.)
      resolved = mod;
    } else if (mod && typeof mod.default === "function") {
      // ES module with default export
      resolved = mod.default;
    } else if (mod && mod.__esModule && mod.default) {
      // Transpiled ES module
      resolved = mod.default;
    } else {
      // Object export (for modules like express-winston that export { logger })
      resolved = mod;
    }

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
    // Buffer warning for display after banner instead of immediate log
    bufferStartupWarning(`${packageName} not installed`);
    return null;
  }

  // Resolve the module (cached)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const middlewareFactory = resolveModule<any>(packageName);

  if (!middlewareFactory) {
    return null;
  }

  // Handle both function exports and objects with default export
  const factory =
    typeof middlewareFactory === "function"
      ? middlewareFactory
      : typeof middlewareFactory.default === "function"
        ? middlewareFactory.default
        : null;

  if (!factory) {
    getLogger().error(
      `Middleware [${middlewareName}] does not export a function. Got: ${typeof middlewareFactory}`,
      "middleware-resolver",
    );
    return null;
  }

  try {
    // Filter out undefined options to avoid passing them to middleware
    const filteredOptions = options.filter((opt) => opt !== undefined);
    return factory(...filteredOptions);
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

/**
 * Check if any npm package is installed (not just registered middleware).
 *
 * @param packageName - The npm package name to check
 * @returns True if the package is installed
 *
 * @public API
 */
function isPackageAvailable(packageName: string): boolean {
  return isPackageInstalled(packageName);
}

/**
 * Resolve any npm module by package name.
 * Used for dynamic logger and compression resolution.
 *
 * @param packageName - The npm package name
 * @returns The resolved module or null
 *
 * @public API
 */
function resolvePackage<T = unknown>(packageName: string): T | null {
  return resolveModule<T>(packageName);
}

export {
  middlewareResolver,
  isMiddlewareAvailable,
  isPackageAvailable,
  resolvePackage,
  getAvailableMiddleware,
  getRegisteredMiddleware,
  clearMiddlewareCache,
  getPackageName,
  getResolverStartupWarnings,
  clearResolverStartupWarnings,
  MIDDLEWARE_REGISTRY,
};
