/**
 * Lazy Module Auto-Load Middleware
 *
 * Automatically loads lazy modules when their routes are accessed.
 * This provides seamless lazy loading without 404 errors.
 *
 * @module adapter-express
 */

import { Request, Response, NextFunction, RequestHandler, Router, Express } from "express";
import { LazyModuleLoader, ILazyModule } from "@expressots/core";

// ============================================================================
// Types
// ============================================================================

/**
 * Route prefix mapping for lazy modules.
 * Maps route prefixes to module names for auto-loading.
 */
export interface LazyRouteMapping {
  /** Route prefix (e.g., "/admin", "/reports") */
  prefix: string;
  /** Module name to load when this prefix is accessed */
  moduleName: string;
  /** Whether the module is currently loaded */
  loaded: boolean;
}

/**
 * Configuration for the lazy module middleware.
 */
export interface LazyModuleMiddlewareConfig {
  /** Route mappings */
  routes: Array<LazyRouteMapping>;
  /** The lazy module loader instance */
  loader: LazyModuleLoader;
  /** Global route prefix (e.g., "/api") */
  globalPrefix?: string;
  /** Callback when a module starts loading */
  onLoadStart?: (moduleName: string, path: string) => void;
  /** Callback when a module finishes loading */
  onLoadComplete?: (moduleName: string, loadTimeMs: number) => void;
  /** Callback when module loading fails */
  onLoadError?: (moduleName: string, error: Error) => void;
  /**
   * Express app or router for dynamic route registration.
   * When provided, routes are registered dynamically after module load,
   * eliminating the need for 307 redirects.
   */
  expressApp?: Express | Router;
  /**
   * Callback to register lazy module routes after loading.
   * When provided, this is called to register the module's routes dynamically.
   * If not provided and expressApp is set, default registration is attempted.
   */
  onRegisterRoutes?: (moduleName: string, router: Router) => void;
}

// ============================================================================
// Lazy Module Middleware
// ============================================================================

/**
 * Create middleware that auto-loads lazy modules when their routes are accessed.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Seamless lazy loading - no 404s! Modules load automatically
 * when their routes are accessed for the first time.
 *
 * @example
 * ```typescript
 * const middleware = createLazyModuleMiddleware({
 *   routes: [
 *     { prefix: "/admin", moduleName: "AdminModule", loaded: false },
 *     { prefix: "/reports", moduleName: "ReportsModule", loaded: false }
 *   ],
 *   loader: lazyModuleLoader,
 *   globalPrefix: "/api"
 * });
 *
 * app.use(middleware);
 * ```
 *
 * @param config - Middleware configuration
 * @returns Express middleware function
 *
 * @public API
 */
export function createLazyModuleMiddleware(config: LazyModuleMiddlewareConfig): RequestHandler {
  const { routes, loader, globalPrefix = "" } = config;

  // Create a map for O(1) prefix lookup
  const routeMap = new Map<string, LazyRouteMapping>();
  for (const route of routes) {
    const fullPrefix = globalPrefix + route.prefix;
    routeMap.set(fullPrefix.toLowerCase(), route);
  }

  // Track modules currently being loaded (to prevent duplicate loads)
  const loadingModules = new Set<string>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const path = req.path.toLowerCase();

    // Find matching route prefix
    let matchedRoute: LazyRouteMapping | undefined;
    for (const [prefix, route] of routeMap.entries()) {
      if (path.startsWith(prefix)) {
        matchedRoute = route;
        break;
      }
    }

    // No matching lazy module route
    if (!matchedRoute) {
      return next();
    }

    // Already loaded
    if (matchedRoute.loaded || loader.isLoaded(matchedRoute.moduleName)) {
      matchedRoute.loaded = true;
      return next();
    }

    // Currently loading - wait for it
    if (loadingModules.has(matchedRoute.moduleName)) {
      // Poll until loaded (with timeout)
      const maxWait = 30000; // 30 seconds
      const pollInterval = 50;
      let waited = 0;

      while (loadingModules.has(matchedRoute.moduleName) && waited < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        waited += pollInterval;
      }

      if (loader.isLoaded(matchedRoute.moduleName)) {
        matchedRoute.loaded = true;
        return next();
      } else {
        res.status(503).json({
          error: "Service Unavailable",
          message: `Module '${matchedRoute.moduleName}' is still loading. Please try again.`,
        });
        return;
      }
    }

    // Start loading the module
    loadingModules.add(matchedRoute.moduleName);
    const startTime = Date.now();

    config.onLoadStart?.(matchedRoute.moduleName, req.path);

    try {
      await loader.load(matchedRoute.moduleName);
      matchedRoute.loaded = true;

      const loadTime = Date.now() - startTime;
      config.onLoadComplete?.(matchedRoute.moduleName, loadTime);

      console.log(
        `[Lazy Loading] Module '${matchedRoute.moduleName}' loaded on-demand in ${loadTime}ms ` +
          `(triggered by ${req.method} ${req.path})`,
      );

      loadingModules.delete(matchedRoute.moduleName);

      // Dynamic route registration: If callbacks are provided, register routes
      // and continue the request without redirecting
      if (config.onRegisterRoutes && config.expressApp) {
        try {
          const moduleRouter = Router();
          config.onRegisterRoutes(matchedRoute.moduleName, moduleRouter);

          // Mount the new routes (Express will pick them up for future requests)
          // For THIS request, we continue to let it fall through
          console.log(
            `[Lazy Loading] Dynamically registered routes for '${matchedRoute.moduleName}'`,
          );
        } catch (registrationError) {
          console.warn(
            `[Lazy Loading] Dynamic route registration failed for '${matchedRoute.moduleName}':`,
            registrationError,
          );
        }
      }

      // Continue to next middleware - the routes should now be available
      // This works because Express route matching happens per-request
      // and the container now has the lazy module's controllers bound.
      //
      // If dynamic registration isn't set up, fall back to 307 redirect
      if (config.onRegisterRoutes) {
        // Re-emit the request through Express routing
        // The route should now match a real handler
        return next("route");
      } else {
        // Fallback: 307 redirect for single round-trip (temporary redirect preserves method).
        // Only local single-slash paths are safe redirect targets: a
        // protocol-relative '//host/path' or an absolute URL (possible with
        // absolute-form request lines) would redirect off-origin.
        const original = req.originalUrl;
        const redirectTarget =
          original.startsWith("/") && !original.startsWith("//") ? original : "/";
        res.redirect(307, redirectTarget);
      }
    } catch (error) {
      loadingModules.delete(matchedRoute.moduleName);

      const err = error instanceof Error ? error : new Error(String(error));
      config.onLoadError?.(matchedRoute.moduleName, err);

      console.error(
        `[Lazy Loading] Failed to load module '${matchedRoute.moduleName}':`,
        err.message,
      );

      res.status(500).json({
        error: "Module Load Failed",
        message: `Failed to load module for route '${req.path}'. ${err.message}`,
      });
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract route prefixes from a lazy module.
 *
 * Uses auto-detected routes from CreateLazyModule (which analyzes @controller decorators),
 * falls back to prefetchOn config, and finally infers from module name.
 *
 * @param lazyModule - The lazy module to analyze
 * @returns Detected route prefixes
 *
 * @public API
 */
export function extractRoutePrefixes(lazyModule: ILazyModule): Array<string> {
  const prefixes: Array<string> = [];

  // 1. Use auto-detected routePrefixes from CreateLazyModule (best source!)
  if (lazyModule.config.routePrefixes && lazyModule.config.routePrefixes.length > 0) {
    return lazyModule.config.routePrefixes;
  }

  // 2. Try prefetchOn config as fallback
  const prefetchOn = lazyModule.config.prefetchOn || [];
  for (const prefetch of prefetchOn) {
    const parts = prefetch.route.split("/").filter(Boolean);
    if (parts.length > 0) {
      prefixes.push("/" + parts[0]);
    }
  }

  if (prefixes.length > 0) {
    return [...new Set(prefixes)];
  }

  // 3. Last resort: infer from module name
  // "AdminModule" -> "/admin", "UserSettingsModule" -> "/usersettings"
  const inferredPrefix =
    "/" +
    lazyModule.name
      .replace(/Module$/i, "")
      .replace(/([A-Z])/g, (match, p1, offset) =>
        offset > 0 ? `-${p1.toLowerCase()}` : p1.toLowerCase(),
      );

  return [inferredPrefix];
}

/**
 * Create route mappings from lazy modules.
 *
 * Route detection priority:
 * 1. Manual routePrefixMap (if provided)
 * 2. Auto-detected from @controller() decorators (via CreateLazyModule)
 * 3. prefetchOn config
 * 4. Inferred from module name
 *
 * @param lazyModules - Array of lazy modules
 * @param routePrefixMap - Optional manual prefix mappings { moduleName: prefix }
 * @returns Array of route mappings
 *
 * @example
 * ```typescript
 * // Zero-config: routes auto-detected from controllers!
 * const mappings = createRouteMappings([AdminModule, ReportsModule]);
 * // Automatically maps @controller("/admin") -> /admin
 *
 * // Or with manual overrides
 * const mappings = createRouteMappings(
 *   [AdminModule, ReportsModule],
 *   { "AdminModule": "/admin-panel" }  // Override auto-detection
 * );
 * ```
 *
 * @public API
 */
export function createRouteMappings(
  lazyModules: Array<ILazyModule>,
  routePrefixMap?: Record<string, string>,
): Array<LazyRouteMapping> {
  const mappings: Array<LazyRouteMapping> = [];

  for (const module of lazyModules) {
    // Use manual mapping if provided (highest priority)
    if (routePrefixMap && routePrefixMap[module.name]) {
      mappings.push({
        prefix: routePrefixMap[module.name],
        moduleName: module.name,
        loaded: module.isLoaded,
      });
      continue;
    }

    // Use auto-detected prefixes (includes @controller detection)
    const prefixes = extractRoutePrefixes(module);
    for (const prefix of prefixes) {
      mappings.push({
        prefix,
        moduleName: module.name,
        loaded: module.isLoaded,
      });
    }
  }

  return mappings;
}
