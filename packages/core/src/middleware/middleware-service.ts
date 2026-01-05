import {
  ErrorRequestHandler,
  static as expressStatic,
  json,
  NextFunction,
  Request,
  RequestHandler,
  RequestParamHandler,
  Response,
  urlencoded,
} from "express";

import { injectable } from "../di/inversify";
import defaultErrorHandler from "../error/error-handler-middleware";
import { ErrorHandlerOptions, IMiddleware } from "./middleware-interface";
import { ExceptionHandlerMiddleware } from "../error/exception-handler-middleware";
import { Logger } from "../provider/logger/logger.provider";
import { multer } from "./interfaces/multer.interface";
import { ServeStaticOptions } from "./interfaces/serve-static.interface";
import {
  middlewareResolver,
  isMiddlewareAvailable,
  isPackageAvailable,
  resolvePackage,
  getResolverStartupWarnings,
  clearResolverStartupWarnings,
} from "./middleware-resolver";
import {
  getMiddlewareRegistry,
  MiddlewareEntry as RegistryEntry,
} from "./middleware-registry";
import { setGlobalUploadConfig } from "./upload-registry";
import type {
  ParseOptions,
  MiddlewareLoggerConfig,
  LoggerImplementation,
  SecurityConfig,
  SecurityPreset,
  CompressConfig,
  SessionConfig as V4SessionConfig,
  UploadConfig,
  UploadHandler,
  StaticConfig,
  MiddlewareConfig as V4MiddlewareConfig,
  OptimizationConfig,
  PipelineAnalysis,
  Recommendation,
} from "./middleware-config";
import { ContentNegotiationService } from "./content-negotiation/content-negotiation-service";
import { ContentNegotiationOptions } from "./interfaces/content-negotiation.interface";
import type { ValidationConfig } from "../provider/validation/validation.interface";
import {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler";

/**
 * ExpressHandler Type
 *
 * The ExpressHandler type is a union type that represents various types of Express middleware functions.
 * It can be one of the following types:
 * - express.ErrorRequestHandler: Handles errors in the middleware pipeline.
 * - express.RequestParamHandler: Handles parameters in the middleware pipeline.
 * - express.RequestHandler: General request handler.
 * - undefined: Represents the absence of a handler.
 */
export type ExpressHandler =
  | ErrorRequestHandler
  | RequestParamHandler
  | RequestHandler
  | undefined;

/**
 * Expresso middleware interface.
 */
interface IExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Abstract class for creating custom Expresso middleware.
 *
 * @layer public
 * @audience application-developers
 * @concept custom-middleware
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Create custom middleware classes by extending this abstract class.
 *
 * @example
 * ```typescript
 * class AuthMiddleware extends ExpressoMiddleware {
 *   use(req: Request, res: Response, next: NextFunction): void {
 *     const token = req.headers.authorization;
 *     if (!token) {
 *       return res.status(401).json({ error: "Unauthorized" });
 *     }
 *     next();
 *   }
 * }
 *
 * // Use in application
 * services.Middleware.addMiddleware(new AuthMiddleware());
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Provides `name` getter (returns constructor name)
 * - Abstract `use()` method must be implemented
 * - Compatible with Express middleware signature
 *
 * @see {@link IMiddleware.addMiddleware} for adding middleware
 *
 * @public API
 */
@injectable()
export abstract class ExpressoMiddleware implements IExpressoMiddleware {
  get name(): string {
    return this.constructor.name;
  }

  abstract use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> | void;
}

/**
 * MiddlewareOptions Type
 *
 * The MiddlewareOptions type represents arguments that can be passed to a middleware function.
 * It can either be a expressjs request handler function, a middleware configuration object that is composed by a route and an expressjs handler or
 */
export type MiddlewareOptions =
  | ExpressHandler
  | MiddlewareConfig
  | IExpressoMiddleware;

/**
 * MiddlewareConfig Interface
 *
 * The MiddlewareConfig interface specifies the structure for middleware configuration objects.
 * - path: Optional. The route path for which the middleware is configured.
 * - middlewares: An array of ExpressHandler types that make up the middleware pipeline for the route specified by 'path'.
 */
type MiddlewareConfig = {
  path?: string;
  middlewares: Array<ExpressHandler | IExpressoMiddleware>;
};

/**
 * Middleware category for banner display and organization.
 * @public API
 */
export type MiddlewareCategory =
  | "parser"
  | "security"
  | "logging"
  | "validation"
  | "error"
  | "session"
  | "static"
  | "other";

/**
 * Enhanced middleware entry with metadata for introspection.
 * @public API
 */
export interface MiddlewareEntry {
  /** Display name of the middleware */
  name: string;
  /** Whether this is a built-in or custom middleware */
  type: "built-in" | "custom";
  /** Category for organization */
  category: MiddlewareCategory;
  /** Order in the pipeline (0-based) */
  order: number;
  /** Route path (or "Global" for global middleware) */
  path: string;
  /** The actual middleware */
  middleware: ExpressHandler | MiddlewareConfig | IExpressoMiddleware;
}

/**
 * MiddlewarePipeline Interface
 *
 * The MiddlewarePipeline interface represents the metadata and actual middleware to be executed in a middleware pipeline.
 * - order: The insertion order of the middleware (for stable sorting).
 * - middleware: Can be either an ExpressHandler function or a MiddlewareConfig object defining a more complex middleware setup.
 */
interface MiddlewarePipeline {
  /** Insertion order for stable sorting */
  order: number;
  /** The middleware handler or config */
  middleware: ExpressHandler | MiddlewareConfig | IExpressoMiddleware;
  /** Middleware name for lookup */
  name?: string;
  /** Middleware category */
  category?: MiddlewareCategory;
  /** Whether this is built-in */
  isBuiltIn?: boolean;
  /** Condition function for conditional middleware */
  condition?: (req: Request) => boolean;
}

/**
 * Middleware pipeline info for banner display.
 * @public API
 */
export interface MiddlewarePipelineInfo {
  /** Total middleware count */
  total: number;
  /** Middleware entries */
  entries: Array<MiddlewareEntry>;
  /** Middleware count by category */
  byCategory: Record<MiddlewareCategory, number>;
}

/**
 * MiddlewareType Enum
 *
 * The MiddlewareType enum represents the various types of middleware that can be added to the middleware collection.
 * - Config: Middleware configuration object.
 * - ExpressHandler: Express request handler function.
 * - IExpressoMiddleware: Custom Expresso middleware.
 */
enum MiddlewareType {
  Config,
  ExpressHandler,
  IExpressoMiddleware,
}

/**
 * Mapping of known middleware names to categories.
 */
const MIDDLEWARE_CATEGORIES: Record<string, MiddlewareCategory> = {
  // Parsers
  jsonParser: "parser",
  urlencodedParser: "parser",
  bodyParser: "parser",
  cookieParser: "parser",
  // Security
  cors: "security",
  helmet: "security",
  rateLimit: "security",
  // Session
  session: "session",
  cookieSession: "session",
  // Logging
  morgan: "logging",
  RequestLoggingMiddleware: "logging",
  // Static
  serveStatic: "static",
  serveFavicon: "static",
  // Compression/Other
  compression: "other",
  multer: "other",
};

/**
 * Conditional middleware configuration.
 * @public API
 */
export interface ConditionalMiddlewareConfig {
  /** The middleware handler */
  middleware: ExpressHandler;
  /** Condition function - middleware runs only if this returns true */
  condition: (req: Request) => boolean;
  /** Optional name for the middleware */
  name?: string;
  /** Optional category */
  category?: MiddlewareCategory;
}

/**
 * Category icons for visual pipeline display.
 */
const CATEGORY_ICONS: Record<MiddlewareCategory, string> = {
  parser: "📦",
  security: "🔒",
  logging: "📝",
  validation: "✅",
  error: "⚠️",
  session: "🔑",
  static: "📁",
  other: "⚙️",
};

/**
 * Middleware service for managing Express middleware pipeline.
 *
 * @layer public
 * @audience application-developers
 * @concept middleware-management
 * @difficulty beginner
 *
 * @summary Quick Start
 * Configure and manage middleware for your ExpressoTS application.
 *
 * @example
 * ```typescript
 * @provide(App)
 * export class App extends AppFactory {
 *   configureServices(services: IService): void {
 *     // Add built-in middleware
 *     services.Middleware.addCors();
 *     services.Middleware.addBodyParser();
 *     services.Middleware.addHelmet();
 *
 *     // Add custom middleware
 *     services.Middleware.addMiddleware((req, res, next) => {
 *       // Custom logic
 *       next();
 *     });
 *   }
 * }
 * ```
 *
 * **Features:**
 * - Built-in middleware helpers (CORS, Helmet, Body Parser, etc.)
 * - Custom middleware support
 * - Middleware presets for common configurations
 * - Conditional middleware execution
 * - Content negotiation
 * - Request validation
 * - Performance profiling
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Middleware service:
 * - Maintains ordered pipeline array
 * - Uses Map for O(1) middleware lookup
 * - Caches sorted pipeline for performance
 * - Supports conditional middleware execution
 * - Integrates with middleware resolver for auto-discovery
 *
 * **Design Decisions**
 * - Singleton pattern (one instance per app)
 * - Ordered pipeline (insertion order preserved)
 * - Cached sorting (invalidated on changes)
 * - Built-in middleware auto-discovery
 *
 * @see {@link IMiddleware} for interface definition
 * @see {@link middlewareResolver} for middleware resolution
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Conditional middleware:
 * ```typescript
 * services.Middleware.addConditional({
 *   middleware: rateLimiter,
 *   condition: (req) => !req.headers["x-internal-service"],
 *   name: "conditional-rate-limit"
 * });
 * ```
 *
 * Middleware presets:
 * ```typescript
 * services.Middleware.usePreset("api", {
 *   overrides: {
 *     Cors: { origin: "https://myapp.com" }
 *   }
 * });
 * ```
 *
 * @public API
 */
export class Middleware implements IMiddleware {
  // O(1) lookup map for middleware by name
  private middlewareMap = new Map<string, MiddlewarePipeline>();
  // Ordered pipeline array
  private middlewarePipeline: Array<MiddlewarePipeline> = [];
  // Insertion order counter for stable sorting
  private insertionOrder = 0;
  // Cached sorted pipeline
  private sortedPipelineCache: Array<MiddlewarePipeline> | null = null;
  // Error handler
  private errorHandler: ExpressHandler | undefined;
  // Singleton logger (renamed to avoid conflict with logger() method)
  private _logger: Logger;
  // Content negotiation service
  private contentNegotiationService: ContentNegotiationService | undefined;
  // Profiler instance
  private profiler: MiddlewareProfiler | null = null;
  // Profiling enabled flag
  private profilingEnabled = false;
  // v4: Custom presets storage
  private customPresets = new Map<string, V4MiddlewareConfig>();
  // v4: Middleware registry reference
  private registry = getMiddlewareRegistry();
  // v4: Buffered startup logs (displayed after banner)
  private startupLogs: Array<{ message: string; type: "info" | "warn" }> = [];
  // v4: Track registered middleware names for summary
  private registeredMiddlewareNames: Array<string> = [];

  constructor() {
    this._logger = new Logger();
  }

  /**
   * Buffer a startup log message to be displayed after the banner.
   * Only buffers in development mode.
   * @param message - The message to buffer
   * @param type - Log type: "info" or "warn"
   */
  private bufferStartupLog(
    message: string,
    type: "info" | "warn" = "info",
  ): void {
    this.startupLogs.push({ message, type });
  }

  /**
   * Get all buffered startup logs for display after the banner.
   * Includes warnings from the middleware resolver (e.g., missing packages).
   * @returns Array of startup log entries
   */
  public getStartupLogs(): Array<{ message: string; type: "info" | "warn" }> {
    // Combine service logs with resolver warnings
    const logs = [...this.startupLogs, ...getResolverStartupWarnings()];

    // Add registered middleware summary at the end if any were registered
    if (this.registeredMiddlewareNames.length > 0) {
      logs.push({
        message: `Registered: ${this.registeredMiddlewareNames.join(", ")}`,
        type: "info",
      });
    }
    return logs;
  }

  /**
   * Clear all buffered startup logs.
   */
  public clearStartupLogs(): void {
    this.startupLogs = [];
    this.registeredMiddlewareNames = [];
    clearResolverStartupWarnings();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves the type of the middleware.
   *
   * @param middleware - The middleware to be checked.
   * @returns The type of the middleware.
   */
  private getMiddlewareType(middleware: MiddlewareOptions): MiddlewareType {
    if (middleware && typeof middleware === "object" && "path" in middleware) {
      return MiddlewareType.Config;
    }
    if (typeof middleware === "function") {
      return MiddlewareType.ExpressHandler;
    }
    return MiddlewareType.IExpressoMiddleware;
  }

  /**
   * Checks if a middleware with the given name exists in the middleware collection.
   * Uses O(1) Map lookup instead of O(n) array scan.
   *
   * @param middlewareName - The name of the middleware to be checked.
   * @returns A boolean value indicating whether the middleware exists or not.
   */
  private middlewareExists(middlewareName: string): boolean {
    return this.middlewareMap.has(middlewareName);
  }

  /**
   * Invalidate the sorted pipeline cache.
   */
  private invalidateCache(): void {
    this.sortedPipelineCache = null;
  }

  /**
   * Generic method to add built-in middleware with consistent pattern.
   *
   * @param name - Middleware name for lookup
   * @param category - Middleware category
   * @param middlewareFactory - Factory function that creates the middleware
   * @returns True if middleware was added, false if skipped
   */
  private addBuiltInMiddleware(
    name: string,
    category: MiddlewareCategory,
    middlewareFactory: () => ExpressHandler | null,
  ): boolean {
    if (this.middlewareExists(name)) {
      this._logger.warn(
        `[${name}] already exists. Skipping...`,
        "middleware-service",
      );
      return false;
    }

    const middleware = middlewareFactory();
    if (!middleware) {
      return false;
    }

    const entry: MiddlewarePipeline = {
      order: this.insertionOrder++,
      middleware,
      name,
      category,
      isBuiltIn: true,
    };

    this.middlewarePipeline.push(entry);
    this.middlewareMap.set(name, entry);
    this.invalidateCache();

    return true;
  }

  /**
   * Get middleware name from a pipeline entry.
   */
  private getMiddlewareName(m: MiddlewarePipeline): string {
    if (m.name) {
      return m.name;
    }

    const middlewareType = this.getMiddlewareType(m.middleware);

    if (middlewareType === MiddlewareType.Config) {
      const config = m.middleware as MiddlewareConfig;
      return config.path || "ConfigMiddleware";
    } else if (middlewareType === MiddlewareType.IExpressoMiddleware) {
      return (m.middleware as IExpressoMiddleware).constructor.name;
    } else {
      return (m.middleware as ExpressHandler)?.name || "Anonymous";
    }
  }

  /**
   * Get the category of a middleware.
   */
  private getMiddlewareCategory(
    name: string,
    // Parameter reserved for future use (built-in middleware differentiation)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isBuiltIn?: boolean,
  ): MiddlewareCategory {
    // Check known categories
    if (MIDDLEWARE_CATEGORIES[name]) {
      return MIDDLEWARE_CATEGORIES[name];
    }

    // Try to infer from name
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("parser") ||
      lowerName.includes("body") ||
      lowerName.includes("json")
    ) {
      return "parser";
    }
    if (
      lowerName.includes("cors") ||
      lowerName.includes("helmet") ||
      lowerName.includes("auth") ||
      lowerName.includes("security")
    ) {
      return "security";
    }
    if (
      lowerName.includes("log") ||
      lowerName.includes("morgan") ||
      lowerName.includes("request")
    ) {
      return "logging";
    }
    if (lowerName.includes("valid")) {
      return "validation";
    }
    if (lowerName.includes("error") || lowerName.includes("handler")) {
      return "error";
    }
    if (lowerName.includes("session") || lowerName.includes("cookie")) {
      return "session";
    }
    if (lowerName.includes("static") || lowerName.includes("favicon")) {
      return "static";
    }

    return "other";
  }

  /**
   * Get the path for a middleware.
   */
  private getMiddlewarePath(m: MiddlewarePipeline): string {
    const middlewareType = this.getMiddlewareType(m.middleware);
    if (middlewareType === MiddlewareType.Config) {
      return (m.middleware as MiddlewareConfig).path || "Global";
    }
    return "Global";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL MIDDLEWARE HELPERS (used by v4 unified methods)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Internal: Sets up Multer middleware for handling multipart/form-data.
   * Used by upload() method.
   * @internal
   */
  private setupMulter(options?: multer.Options): multer.Multer {
    const multerMiddleware = middlewareResolver("multer", options);

    if (multerMiddleware) {
      return multerMiddleware as unknown as multer.Multer;
    }

    return null as unknown as multer.Multer;
  }

  /**
   * Internal: Adds a middleware to serve static files.
   * Used by static() method.
   * @internal
   */
  private serveStatic(root: string, options?: ServeStaticOptions): void {
    this.addBuiltInMiddleware("serveStatic", "static", () =>
      expressStatic(root, options),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM MIDDLEWARE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Helper method to add middleware configuration objects.
   */
  private addConfigMiddleware(middleware: MiddlewareConfig): void {
    const config = middleware as MiddlewareConfig;

    if (config.middlewares.length === 0) {
      this._logger.warn(
        `No middlewares in the route [${config.path}]. Skipping...`,
        "middleware-service",
      );
      return;
    }

    const configKey = config.path || `config_${this.insertionOrder}`;

    if (this.middlewareExists(configKey)) {
      this._logger.warn(
        `[${config.path}] route already exists. Skipping...`,
        "middleware-service",
      );
      return;
    }

    const entry: MiddlewarePipeline = {
      order: this.insertionOrder++,
      middleware: config,
      name: configKey,
      category: "other",
      isBuiltIn: false,
    };

    this.middlewarePipeline.push(entry);
    this.middlewareMap.set(configKey, entry);
    this.invalidateCache();
  }

  /**
   * Helper method to add express request handler functions.
   */
  private addExpressHandlerMiddleware(middleware: ExpressHandler): void {
    const middlewareName =
      middleware?.name || `anonymous_${this.insertionOrder}`;

    if (this.middlewareExists(middlewareName) && middleware?.name) {
      this._logger.warn(
        `[${middlewareName}] already exists. Skipping...`,
        "middleware-service",
      );
      return;
    }

    const entry: MiddlewarePipeline = {
      order: this.insertionOrder++,
      middleware,
      name: middlewareName,
      category: this.getMiddlewareCategory(middlewareName),
      isBuiltIn: false,
    };

    this.middlewarePipeline.push(entry);
    this.middlewareMap.set(middlewareName, entry);
    this.invalidateCache();
  }

  /**
   * Helper method to add custom Expresso middleware.
   */
  private addIExpressoMiddleware(middleware: IExpressoMiddleware): void {
    const middlewareName = middleware.constructor.name;

    if (this.middlewareExists(middlewareName)) {
      this._logger.warn(
        `[${middlewareName}] already exists. Skipping...`,
        "middleware-service",
      );
      return;
    }

    const entry: MiddlewarePipeline = {
      order: this.insertionOrder++,
      middleware,
      name: middlewareName,
      category: this.getMiddlewareCategory(middlewareName),
      isBuiltIn: false,
    };

    this.middlewarePipeline.push(entry);
    this.middlewareMap.set(middlewareName, entry);
    this.invalidateCache();
  }

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param options - The Express request handler function, middleware configuration object,
   * or a custom Expresso middleware.
   *
   * @example Express Handler
   * ```typescript
   * const middleware = (req, res, next) => {
   *   // Your middleware logic here
   *   next();
   * }
   * ```
   *
   * @example Middleware Configuration Object
   * ```typescript
   * const middleware = {
   *   path: "/",
   *   middlewares: [] // Array of Express Handlers
   * }
   * ```
   *
   * @example Expresso Middleware
   * ```typescript
   * class CustomMiddleware implements IExpressoMiddleware {
   *   use(req: Request, res: Response, next: NextFunction): Promise<void> | void {
   *     // Your middleware logic here
   *     next();
   *   }
   * }
   * ```
   */
  addMiddleware(options: MiddlewareOptions): void {
    switch (this.getMiddlewareType(options)) {
      case MiddlewareType.Config:
        this.addConfigMiddleware(options as MiddlewareConfig);
        break;
      case MiddlewareType.ExpressHandler:
        this.addExpressHandlerMiddleware(options as ExpressHandler);
        break;
      case MiddlewareType.IExpressoMiddleware:
        this.addIExpressoMiddleware(options as IExpressoMiddleware);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONAL MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add middleware that only executes when a condition is met.
   *
   * @param config - Conditional middleware configuration
   *
   * @example
   * ```typescript
   * // Only apply rate limiting for non-internal requests
   * middleware.addConditional({
   *   middleware: rateLimiter,
   *   condition: (req) => !req.headers["x-internal-service"],
   *   name: "conditional-rate-limit"
   * });
   *
   * // Only apply auth for non-public routes
   * middleware.addConditional({
   *   middleware: authMiddleware,
   *   condition: (req) => !req.path.startsWith("/public"),
   *   name: "conditional-auth"
   * });
   * ```
   *
   * @public API
   */
  addConditional(config: ConditionalMiddlewareConfig): void {
    const name = config.name || `conditional_${this.insertionOrder}`;

    if (this.middlewareExists(name)) {
      this._logger.warn(
        `[${name}] already exists. Skipping...`,
        "middleware-service",
      );
      return;
    }

    // Wrap the middleware with the condition check
    const wrappedMiddleware: RequestHandler = (req, res, next) => {
      if (config.condition(req)) {
        return (config.middleware as RequestHandler)(req, res, next);
      }
      next();
    };

    const entry: MiddlewarePipeline = {
      order: this.insertionOrder++,
      middleware: wrappedMiddleware,
      name,
      category: config.category || "other",
      isBuiltIn: false,
      condition: config.condition,
    };

    this.middlewarePipeline.push(entry);
    this.middlewareMap.set(name, entry);
    this.invalidateCache();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configures the error handling middleware for the application.
   *
   * @param options - The object containing the configuration options for the error handler middleware.
   */
  setErrorHandler(options: ErrorHandlerOptions = {}): void {
    const {
      errorHandler: errorHandling,
      showStackTrace,
      enableExceptionFilters = false,
      container,
    } = options;

    // Custom error handler takes precedence (backward compatibility)
    if (errorHandling) {
      this.errorHandler = errorHandling;
      if (enableExceptionFilters) {
        this._logger.warn(
          "Custom errorHandler provided - exception filters are disabled. Remove errorHandler to use exception filters.",
          "middleware-service",
        );
      }
      return;
    }

    // If exception filters are enabled, wrap the error handler with ExceptionHandlerMiddleware
    if (enableExceptionFilters && container) {
      try {
        const exceptionHandler = new ExceptionHandlerMiddleware(
          container,
          undefined,
          showStackTrace ?? false,
        );
        this.errorHandler = exceptionHandler.handle;
      } catch (error) {
        this._logger.warn(
          `Failed to enable exception filters: ${error}. Falling back to default error handler.`,
          "middleware-service",
        );
        // Fall back to default handler
        this.errorHandler = (error, req, res, next): void => {
          defaultErrorHandler(error, res, next, showStackTrace);
        };
      }
    } else {
      // Default error handler
      this.errorHandler = (error, req, res, next): void => {
        defaultErrorHandler(error, res, next, showStackTrace);
      };
    }

    // Warn if enableExceptionFilters is true but container is not provided
    if (enableExceptionFilters && !container) {
      this._logger.warn(
        "enableExceptionFilters is true but container is not provided. Exception filters will not be enabled.",
        "middleware-service",
      );
    }
  }

  /**
   * Gets the configured error handler middleware.
   *
   * @returns The error handler middleware.
   */
  public getErrorHandler(): ExpressHandler {
    return this.errorHandler;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT NEGOTIATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configures content negotiation middleware for automatic response format selection.
   *
   * @param options - Configuration options for content negotiation
   * @public API
   */
  public addContentNegotiation(options?: ContentNegotiationOptions): void {
    if (!this.contentNegotiationService) {
      this.contentNegotiationService = new ContentNegotiationService();
    }

    this.contentNegotiationService.configure(options || {});
  }

  /**
   * Gets the content negotiation service instance.
   * @returns Content negotiation service or undefined if not configured
   * @internal
   */
  public getContentNegotiationService(): ContentNegotiationService | undefined {
    return this.contentNegotiationService;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Validation Service - will be set by adapter-express
  private validationServiceFactory?: () => unknown;

  /**
   * Configures validation for automatic request parameter validation.
   *
   * @param options - Configuration options for validation
   * @public API
   */
  public addValidation(options?: ValidationConfig): void {
    (
      this as unknown as { _validationConfig: ValidationConfig }
    )._validationConfig = options || {};
  }

  /**
   * Gets the validation configuration.
   * @internal
   */
  public getValidationConfig(): ValidationConfig | undefined {
    return (this as unknown as { _validationConfig?: ValidationConfig })
      ._validationConfig;
  }

  /**
   * Sets the validation service factory (called by adapter-express).
   * @internal
   */
  public setValidationServiceFactory(factory: () => unknown): void {
    this.validationServiceFactory = factory;
  }

  /**
   * Gets the validation service instance.
   * @internal
   */
  public getValidationService(): unknown {
    return this.validationServiceFactory?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable middleware profiling to track execution times.
   *
   * @param options - Profiler options
   * @returns The profiler instance
   *
   * @example
   * ```typescript
   * const profiler = middleware.enableProfiling();
   *
   * // Later, get metrics
   * const stats = profiler.getStats();
   * console.log(stats.metrics);
   * ```
   *
   * @public API
   */
  enableProfiling(options?: { maxSamples?: number }): MiddlewareProfiler {
    if (!this.profiler) {
      this.profiler = new MiddlewareProfiler(options);
    }
    this.profilingEnabled = true;
    return this.profiler;
  }

  /**
   * Disable middleware profiling.
   * @public API
   */
  disableProfiling(): void {
    this.profilingEnabled = false;
    if (this.profiler) {
      this.profiler.setEnabled(false);
    }
  }

  /**
   * Get the profiler instance.
   * @returns The profiler or null if not enabled
   * @public API
   */
  getProfiler(): MiddlewareProfiler | null {
    return this.profiler;
  }

  /**
   * Get profiling metrics for all middleware.
   *
   * @returns Array of middleware metrics or empty array if profiling is disabled
   * @public API
   */
  getProfilingMetrics(): Array<MiddlewareMetrics> {
    return this.profiler?.getAllMetrics() ?? [];
  }

  /**
   * Get profiling statistics.
   *
   * @returns Profiler statistics or null if profiling is disabled
   * @public API
   */
  getProfilingStats(): ProfilerStats | null {
    return this.profiler?.getStats() ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a health check endpoint that reports middleware status.
   *
   * @param options - Health check options
   *
   * @example
   * ```typescript
   * middleware.addHealthCheck({
   *   path: "/health/middleware",
   *   includeMetrics: true
   * });
   * ```
   *
   * @public API
   */
  addHealthCheck(options?: {
    path?: string;
    includeMetrics?: boolean;
    detailed?: boolean;
  }): void {
    const path = options?.path ?? "/health/middleware";

    const healthHandler: RequestHandler = (req, res) => {
      const info = this.getPipelineInfo();
      const response: Record<string, unknown> = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        middleware: {
          total: info.total,
          byCategory: info.byCategory,
        },
      };

      if (options?.detailed) {
        response.middleware = {
          ...(response.middleware as object),
          entries: info.entries.map((e) => ({
            name: e.name,
            type: e.type,
            category: e.category,
            path: e.path,
          })),
        };
      }

      if (options?.includeMetrics && this.profiler) {
        response.metrics = this.profiler.getStats();
      }

      res.json(response);
    };

    this.addMiddleware({ path, middlewares: [healthHandler] });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves middleware pipeline in the order they were added.
   * Uses cached sorting for performance.
   *
   * @returns An array of middleware pipeline entries.
   */
  public getMiddlewarePipeline(): Array<MiddlewarePipeline> {
    if (this.sortedPipelineCache) {
      return this.sortedPipelineCache;
    }

    this.sortedPipelineCache = [...this.middlewarePipeline].sort(
      (a, b) => a.order - b.order,
    );

    return this.sortedPipelineCache;
  }

  /**
   * View middleware pipeline formatted as a table.
   */
  public viewMiddlewarePipeline(): void {
    const sortedMiddlewarePipeline = this.getMiddlewarePipeline();

    const formattedPipeline = sortedMiddlewarePipeline.map((m) => {
      const middlewareType = this.getMiddlewareType(m.middleware);

      if (middlewareType === MiddlewareType.Config) {
        const middlewareNames = (
          m.middleware as MiddlewareConfig
        ).middlewares.map((mw) => (mw as ExpressHandler)?.name || "Anonymous");

        return {
          order: m.order,
          path: (m.middleware as MiddlewareConfig).path,
          middleware: `[${middlewareNames.join(", ")}]`,
        };
      } else if (middlewareType === MiddlewareType.IExpressoMiddleware) {
        return {
          order: m.order,
          path: (m.middleware as MiddlewareConfig).path ?? "Global",
          middleware: (m.middleware as IExpressoMiddleware).constructor.name,
        };
      } else {
        return {
          order: m.order,
          path: "Global",
          middleware: (m.middleware as ExpressHandler)?.name,
        };
      }
    });

    console.table(formattedPipeline);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a visual ASCII representation of the middleware pipeline.
   *
   * @returns ASCII art diagram of the pipeline
   *
   * @example
   * ```typescript
   * console.log(middleware.visualizePipeline());
   * // ╔══════════════════════════════════════════════════════════════╗
   * // ║                  MIDDLEWARE PIPELINE                        ║
   * // ╠══════════════════════════════════════════════════════════════╣
   * // ║ 📦 jsonParser                              [parser]         ║
   * // ║     ↓                                                       ║
   * // ║ 🔒 cors                                    [security]       ║
   * // ║     ↓                                                       ║
   * // ║ 🔒 helmet                                  [security]       ║
   * // ╚══════════════════════════════════════════════════════════════╝
   * ```
   *
   * @public API
   */
  visualizePipeline(): string {
    const pipeline = this.getMiddlewarePipeline();
    const width = 64;

    const lines: Array<string> = [
      "╔" + "═".repeat(width) + "╗",
      "║" +
        "MIDDLEWARE PIPELINE".padStart((width + 19) / 2).padEnd(width) +
        "║",
      "╠" + "═".repeat(width) + "╣",
    ];

    if (pipeline.length === 0) {
      lines.push("║" + "(empty)".padStart((width + 7) / 2).padEnd(width) + "║");
    } else {
      for (let i = 0; i < pipeline.length; i++) {
        const m = pipeline[i];
        const name = this.getMiddlewareName(m);
        const category = m.category ?? this.getMiddlewareCategory(name);
        const icon = CATEGORY_ICONS[category];
        const categoryLabel = `[${category}]`;

        const content = `${icon} ${name}`;
        const contentWithCategory =
          content.padEnd(width - categoryLabel.length - 2) + categoryLabel;
        lines.push("║ " + contentWithCategory.padEnd(width - 1) + "║");

        if (i < pipeline.length - 1) {
          lines.push("║" + "    ↓".padEnd(width) + "║");
        }
      }
    }

    lines.push("╚" + "═".repeat(width) + "╝");

    return lines.join("\n");
  }

  /**
   * Get a compact summary of the middleware pipeline.
   *
   * @returns Single-line summary
   * @public API
   */
  getPipelineSummary(): string {
    const info = this.getPipelineInfo();
    const categories = Object.entries(info.byCategory)
      .filter(([, count]) => count > 0)
      .map(
        ([cat, count]) =>
          `${CATEGORY_ICONS[cat as MiddlewareCategory]}${count}`,
      )
      .join(" ");

    return `Middleware: ${info.total} total | ${categories}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTROSPECTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get structured pipeline info for banner display and introspection.
   * @returns Middleware pipeline information
   * @public API
   */
  public getPipelineInfo(): MiddlewarePipelineInfo {
    const sorted = this.getMiddlewarePipeline();
    const entries: Array<MiddlewareEntry> = [];
    const byCategory: Record<MiddlewareCategory, number> = {
      parser: 0,
      security: 0,
      logging: 0,
      validation: 0,
      error: 0,
      session: 0,
      static: 0,
      other: 0,
    };

    sorted.forEach((m, index) => {
      const name = this.getMiddlewareName(m);
      const category =
        m.category || this.getMiddlewareCategory(name, m.isBuiltIn);
      const path = this.getMiddlewarePath(m);
      const isBuiltIn = m.isBuiltIn ?? !name.includes("Middleware");

      entries.push({
        name,
        type: isBuiltIn ? "built-in" : "custom",
        category,
        order: index,
        path,
        middleware: m.middleware,
      });

      byCategory[category]++;
    });

    return {
      total: entries.length,
      entries,
      byCategory,
    };
  }

  /**
   * Get a formatted view for banner display.
   * @param maxDisplay - Maximum number of middleware to show
   * @returns Formatted middleware view
   * @public API
   */
  public getFormattedView(maxDisplay: number = 6): {
    entries: Array<{
      name: string;
      category: MiddlewareCategory;
      type: "built-in" | "custom";
    }>;
    total: number;
    remaining: number;
  } {
    const info = this.getPipelineInfo();
    const entries = info.entries.slice(0, maxDisplay).map((e) => ({
      name: e.name,
      category: e.category,
      type: e.type,
    }));

    return {
      entries,
      total: info.total,
      remaining: Math.max(0, info.total - maxDisplay),
    };
  }

  /**
   * Get middleware count by category.
   * @returns Record of category to count
   * @public API
   */
  public getCountByCategory(): Record<MiddlewareCategory, number> {
    return this.getPipelineInfo().byCategory;
  }

  /**
   * Get middleware by name.
   * @param name - The middleware name
   * @returns The middleware entry or undefined
   * @public API
   */
  public getByName(name: string): MiddlewareEntry | undefined {
    return this.getPipelineInfo().entries.find((e) => e.name === name);
  }

  /**
   * Remove a middleware from the pipeline by name.
   *
   * @param name - The middleware name to remove
   * @returns True if removed, false if not found
   * @public API
   */
  public remove(name: string): boolean {
    if (!this.middlewareMap.has(name)) {
      return false;
    }

    this.middlewareMap.delete(name);
    const index = this.middlewarePipeline.findIndex((m) => m.name === name);
    if (index >= 0) {
      this.middlewarePipeline.splice(index, 1);
    }
    this.invalidateCache();

    return true;
  }

  /**
   * Clear all middleware from the pipeline.
   * @public API
   */
  public clear(): void {
    this.middlewarePipeline = [];
    this.middlewareMap.clear();
    this.insertionOrder = 0;
    this.invalidateCache();
  }

  /**
   * Get the total number of middleware in the pipeline.
   * @returns Number of middleware
   * @public API
   */
  public count(): number {
    return this.middlewarePipeline.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 UNIFIED METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configure request parsing (unified method).
   * Replaces: addBodyParser, addUrlEncodedParser, addCookieParser
   */
  public parse(options?: ParseOptions): void {
    const opts = options || {};

    // JSON parsing (default: enabled)
    if (opts.json !== false) {
      const jsonOpts =
        typeof opts.json === "object" ? opts.json : { limit: "100kb" };
      this.addBuiltInMiddleware("jsonParser", "parser", () => json(jsonOpts));
    }

    // URL-encoded parsing (default: enabled)
    if (opts.urlencoded !== false) {
      const urlencodedOpts =
        typeof opts.urlencoded === "object"
          ? opts.urlencoded
          : { extended: true };
      this.addBuiltInMiddleware("urlencodedParser", "parser", () =>
        urlencoded(urlencodedOpts),
      );
    }

    // Cookie parsing (default: disabled, requires package)
    if (opts.cookies) {
      const cookieOpts = typeof opts.cookies === "object" ? opts.cookies : {};
      this.addBuiltInMiddleware("cookieParser", "parser", () =>
        middlewareResolver(
          "cookieParser",
          cookieOpts.secret,
          cookieOpts.options,
        ),
      );
    }

    this.bufferStartupLog("Request parsing configured");
  }

  /**
   * Configure logging with any implementation.
   * Replaces: addMorgan
   */
  public logger(config?: MiddlewareLoggerConfig): void {
    // Skip in test if configured
    if (config?.disableInTest !== false && process.env.NODE_ENV === "test") {
      return;
    }

    // Custom logger takes precedence
    if (config?.custom) {
      const customHandler = config.custom;
      this.addBuiltInMiddleware(
        "customLogger",
        "logging",
        () => customHandler as ExpressHandler,
      );
      this.bufferStartupLog("Using custom logger");
      return;
    }

    const implementation = config?.implementation || "auto";
    const handler = this.resolveLoggerImplementation(
      implementation,
      config?.options,
      config?.skip,
    );

    if (handler) {
      const implName =
        implementation === "auto" ? this.detectBestLogger() : implementation;
      this.addBuiltInMiddleware(`logger-${implName}`, "logging", () => handler);
      this.bufferStartupLog(
        `Using ${implName} logger${implementation === "auto" ? " (auto-detected)" : ""}`,
      );
    }
  }

  // Internal logger getter
  private get loggerInstance(): Logger {
    return this._logger;
  }

  /**
   * Detect the best available logger.
   */
  private detectBestLogger(): LoggerImplementation {
    if (isPackageAvailable("pino-http")) return "pino";
    if (isPackageAvailable("express-winston")) return "winston";
    if (isMiddlewareAvailable("morgan")) return "morgan";
    return "console";
  }

  /**
   * Resolve logger implementation.
   */
  private resolveLoggerImplementation(
    implementation: LoggerImplementation,
    options?: unknown,
    skip?: (req: Request) => boolean,
  ): ExpressHandler | null {
    const impl =
      implementation === "auto" ? this.detectBestLogger() : implementation;

    switch (impl) {
      case "morgan": {
        const morganOpts = options as { format?: string } | undefined;
        const format = morganOpts?.format || "combined";
        // Only pass options object if skip is defined to avoid passing undefined
        if (skip) {
          return middlewareResolver("morgan", format, { skip });
        }
        return middlewareResolver("morgan", format);
      }

      case "pino": {
        const pino =
          resolvePackage<(opts?: unknown) => ExpressHandler>("pino-http");
        if (pino) {
          return pino(options);
        }
        this.bufferStartupLog(
          "pino-http not installed, falling back to morgan",
          "warn",
        );
        return this.resolveLoggerImplementation("morgan", options, skip);
      }

      case "winston": {
        const winston = resolvePackage<{
          logger: (opts?: unknown) => ExpressHandler;
        }>("express-winston");
        if (winston?.logger) {
          return winston.logger(options);
        }
        this.bufferStartupLog(
          "express-winston not installed, falling back to morgan",
          "warn",
        );
        return this.resolveLoggerImplementation("morgan", options, skip);
      }

      case "console": {
        // Simple console logger
        const handler: RequestHandler = (req, _res, next) => {
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
          next();
        };
        return handler;
      }

      default:
        return null;
    }
  }

  /**
   * Unified security configuration.
   * Replaces: addHelmet, addCors, addRateLimiter
   */
  public security(config?: SecurityConfig | SecurityPreset): void {
    // Handle preset strings
    const secConfig: SecurityConfig =
      typeof config === "string"
        ? this.getSecurityPreset(config)
        : config || this.getSecurityPreset("standard");

    // Helmet/security headers
    if (secConfig.headers !== false) {
      const helmetOpts =
        typeof secConfig.headers === "object" ? secConfig.headers : {};
      this.addBuiltInMiddleware("helmet", "security", () =>
        middlewareResolver("helmet", helmetOpts),
      );
    }

    // CORS
    if (secConfig.cors !== false) {
      const corsOpts =
        typeof secConfig.cors === "object" ? secConfig.cors : { origin: true };
      this.addBuiltInMiddleware("cors", "security", () =>
        middlewareResolver("cors", corsOpts),
      );
    }

    // Rate limiting
    if (secConfig.rateLimit) {
      const rateLimitOpts =
        typeof secConfig.rateLimit === "object"
          ? secConfig.rateLimit
          : { windowMs: 60000, max: 100 };
      this.addBuiltInMiddleware("rateLimit", "security", () =>
        middlewareResolver("rateLimit", rateLimitOpts),
      );
    }

    // Custom security middleware
    if (secConfig.custom) {
      for (const middleware of secConfig.custom) {
        this.addMiddleware(middleware);
      }
    }

    this.bufferStartupLog("Security configured");
  }

  /**
   * Get security preset configuration.
   */
  private getSecurityPreset(preset: SecurityPreset): SecurityConfig {
    const presets: Record<SecurityPreset, SecurityConfig> = {
      standard: {
        headers: "helmet",
        cors: true,
        rateLimit: false,
      },
      strict: {
        headers: "helmet",
        cors: { origin: false, credentials: true },
        rateLimit: { windowMs: 60000, max: 60 },
      },
      api: {
        headers: "helmet",
        cors: {
          origin: true,
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        },
        rateLimit: { windowMs: 60000, max: 100 },
      },
      minimal: {
        headers: false,
        cors: true,
        rateLimit: false,
      },
      relaxed: {
        headers: false,
        cors: { origin: true },
        rateLimit: false,
      },
    };
    return presets[preset] || presets.standard;
  }

  /**
   * Configure compression.
   * Replaces: addCompression
   */
  public compress(config?: CompressConfig): void {
    const impl = config?.implementation || "auto";
    let handler: ExpressHandler | null = null;

    if (impl === "auto") {
      // Try shrink-ray first, then compression
      if (isPackageAvailable("shrink-ray-current")) {
        const shrinkRay =
          resolvePackage<(opts?: unknown) => ExpressHandler>(
            "shrink-ray-current",
          );
        if (shrinkRay) {
          handler = shrinkRay(config);
          this.bufferStartupLog("Using shrink-ray compression (auto-detected)");
        }
      }

      if (!handler) {
        handler = middlewareResolver("compression", config);
        if (handler) {
          this.bufferStartupLog("Using compression (auto-detected)");
        }
      }
    } else if (impl === "shrink-ray") {
      const shrinkRay =
        resolvePackage<(opts?: unknown) => ExpressHandler>(
          "shrink-ray-current",
        );
      if (shrinkRay) {
        handler = shrinkRay(config);
      }
    } else {
      handler = middlewareResolver("compression", config);
    }

    if (handler) {
      this.addBuiltInMiddleware("compression", "other", () => handler);
    }
  }

  /**
   * Unified session management.
   * Replaces: addSession, addCookieSession
   */
  public session(config: V4SessionConfig): void {
    switch (config.type) {
      case "cookie": {
        // Use cookie-session
        const cookieSessionOpts = {
          name: config.name || "session",
          secret: config.secret,
          keys: config.keys || [
            typeof config.secret === "string"
              ? config.secret
              : config.secret[0],
          ],
          ...config.cookie,
        };
        this.addBuiltInMiddleware("cookieSession", "session", () =>
          middlewareResolver("cookieSession", cookieSessionOpts),
        );
        break;
      }

      case "store": {
        // Use express-session
        const sessionOpts = {
          secret: config.secret,
          name: config.name,
          store: config.store,
          resave: config.resave ?? false,
          saveUninitialized: config.saveUninitialized ?? false,
          rolling: config.rolling,
          cookie: config.cookie,
        };
        this.addBuiltInMiddleware("session", "session", () =>
          middlewareResolver("session", sessionOpts),
        );
        break;
      }

      case "jwt": {
        // JWT session - minimal implementation
        this.bufferStartupLog(
          "JWT sessions require custom implementation. Use Middleware.add() with your JWT middleware.",
          "warn",
        );
        break;
      }
    }
  }

  /**
   * Enhanced file upload handling.
   * Configures global upload settings and returns upload handlers.
   *
   * When called, this stores the configuration globally so that
   * @FileUpload decorators can use these settings as defaults.
   *
   * @param config - Upload configuration
   * @returns Upload handler with single, array, fields, any, none methods
   *
   * @example
   * ```typescript
   * // In app.ts - configure globally
   * this.Middleware.upload({
   *   destination: './uploads',
   *   limits: { fileSize: 10 * 1024 * 1024 }
   * });
   *
   * // In controller - @FileUpload uses global config
   * @FileUpload({ fieldName: 'avatar' })
   * uploadAvatar(req: Request) { }
   * ```
   *
   * @public API
   */
  public upload(config?: UploadConfig): UploadHandler {
    // Store configuration globally for @FileUpload decorator
    if (config) {
      setGlobalUploadConfig(config);
      this.bufferStartupLog("Upload configured");
    }

    const multerOpts: multer.Options = {
      dest: config?.destination,
      limits: config?.limits,
    };

    if (config?.fileFilter) {
      const userFilter = config.fileFilter;
      multerOpts.fileFilter = (_req, file, cb): void => {
        try {
          const result = userFilter(file as unknown as Express.Multer.File);
          if (result instanceof Promise) {
            result
              .then((accepted) => cb(null, accepted))
              .catch((err) => cb(err));
          } else {
            cb(null, result);
          }
        } catch (err) {
          cb(err as Error);
        }
      };
    }

    const multerInstance = this.setupMulter(multerOpts);

    return {
      single: (fieldName: string) => multerInstance.single(fieldName),
      array: (fieldName: string, maxCount?: number) =>
        multerInstance.array(fieldName, maxCount),
      fields: (fields: Array<{ name: string; maxCount?: number }>) =>
        multerInstance.fields(fields),
      any: () => multerInstance.any(),
      none: () => multerInstance.none(),
    };
  }

  /**
   * Enhanced static file serving.
   * Replaces: serveStatic, addServeFavicon
   */
  public static(
    config: StaticConfig | string | Array<StaticConfig | string>,
  ): void {
    const configs = Array.isArray(config) ? config : [config];

    for (const cfg of configs) {
      if (typeof cfg === "string") {
        // Simple path string
        this.serveStatic(cfg);
      } else {
        // Full config object
        const staticOpts: ServeStaticOptions = {
          maxAge: cfg.maxAge,
          etag: cfg.etag,
          index: cfg.spa ? false : cfg.index,
          ...cfg.options,
        };

        if (cfg.prefix) {
          // Route-specific static serving
          this.addMiddleware({
            path: cfg.prefix,
            middlewares: [expressStatic(cfg.path, staticOpts)],
          });
        } else {
          this.serveStatic(cfg.path, staticOpts);
        }

        // SPA support - serve index.html for all non-file routes
        if (cfg.spa) {
          const indexPath = cfg.index || "index.html";
          const spaHandler: RequestHandler = (_req, res, next) => {
            const filePath = `${cfg.path}/${indexPath}`;
            res.sendFile(filePath, { root: process.cwd() }, (err) => {
              if (err) next(err);
            });
          };
          this.addBuiltInMiddleware("spa-fallback", "static", () => spaHandler);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 MIDDLEWARE REGISTRY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a named middleware for use in routes.
   */
  public register(
    name: string,
    handler: RequestHandler | Array<RequestHandler> | RegistryEntry,
  ): void {
    this.registry.register(name, handler);
    // Track registered names for summary (no individual logging)
    this.registeredMiddlewareNames.push(name);
  }

  /**
   * Get a registered middleware by name.
   */
  public get(name: string): RequestHandler | Array<RequestHandler> | undefined {
    return this.registry.get(name);
  }

  /**
   * Check if a middleware is registered.
   */
  public has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all registered middleware names.
   */
  public getRegisteredNames(): Array<string> {
    return this.registry.getRegisteredNames();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 PRESET SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Define a custom reusable preset.
   */
  public definePreset(name: string, config: V4MiddlewareConfig): void {
    this.customPresets.set(name, config);
    this.bufferStartupLog(`Defined custom preset: ${name}`);
  }

  /**
   * Apply a preset configuration.
   */
  public applyPreset(
    preset: string,
    overrides?: Partial<V4MiddlewareConfig>,
  ): void {
    const config = this.getPresetConfig(preset);
    if (!config) {
      this.loggerInstance.error(
        `Preset '${preset}' not found. Available: ${this.getAvailablePresetNames().join(", ")}`,
        "middleware",
      );
      return;
    }

    // Merge with overrides
    const finalConfig = overrides
      ? this.mergeConfigs(config, overrides)
      : config;

    // Apply each category
    if (finalConfig.parse) {
      if (typeof finalConfig.parse === "boolean") {
        this.parse();
      } else {
        this.parse(finalConfig.parse);
      }
    }

    if (finalConfig.logger) {
      if (typeof finalConfig.logger === "boolean") {
        this.logger();
      } else {
        this.logger(finalConfig.logger);
      }
    }

    if (finalConfig.security) {
      if (typeof finalConfig.security === "boolean") {
        this.security();
      } else {
        this.security(finalConfig.security);
      }
    }

    if (finalConfig.compress) {
      if (typeof finalConfig.compress === "boolean") {
        this.compress();
      } else {
        this.compress(finalConfig.compress);
      }
    }

    if (finalConfig.session) {
      this.session(finalConfig.session);
    }

    if (finalConfig.static) {
      this.static(finalConfig.static);
    }

    this.bufferStartupLog(`Applied preset: ${preset}`);
  }

  /**
   * Get all available presets.
   */
  public getAllPresets(): Record<string, V4MiddlewareConfig> {
    const builtIn = this.getBuiltInPresets();
    const custom = Object.fromEntries(this.customPresets);
    return { ...builtIn, ...custom };
  }

  /**
   * Get built-in presets.
   */
  private getBuiltInPresets(): Record<string, V4MiddlewareConfig> {
    return {
      api: {
        parse: true,
        logger: { implementation: "auto" },
        security: "api",
        compress: true,
      },
      web: {
        parse: { json: true, urlencoded: true, cookies: true },
        logger: { implementation: "auto" },
        security: "standard",
        compress: true,
      },
      spa: {
        parse: { json: true, urlencoded: true },
        security: "standard",
        compress: true,
      },
      microservice: {
        parse: { json: { limit: "1mb" } },
        compress: true,
      },
      graphql: {
        parse: { json: { limit: "50mb" } },
        security: {
          headers: "helmet",
          cors: { origin: true, methods: ["GET", "POST", "OPTIONS"] },
        },
        compress: true,
      },
      minimal: {
        parse: true,
      },
      development: {
        parse: true,
        logger: { implementation: "morgan", options: { format: "dev" } },
        security: "relaxed",
      },
      production: {
        parse: true,
        logger: { implementation: "auto", disableInTest: true },
        security: "strict",
        compress: true,
      },
    };
  }

  /**
   * Get preset config by name.
   */
  private getPresetConfig(name: string): V4MiddlewareConfig | undefined {
    return this.customPresets.get(name) || this.getBuiltInPresets()[name];
  }

  /**
   * Get available preset names.
   */
  private getAvailablePresetNames(): Array<string> {
    return [
      ...Object.keys(this.getBuiltInPresets()),
      ...this.customPresets.keys(),
    ];
  }

  /**
   * Merge two configs.
   */
  private mergeConfigs(
    base: V4MiddlewareConfig,
    override: Partial<V4MiddlewareConfig>,
  ): V4MiddlewareConfig {
    return {
      ...base,
      ...override,
      // Deep merge for nested objects
      parse:
        override.parse !== undefined
          ? typeof override.parse === "object" && typeof base.parse === "object"
            ? { ...base.parse, ...override.parse }
            : override.parse
          : base.parse,
      logger:
        override.logger !== undefined
          ? typeof override.logger === "object" &&
            typeof base.logger === "object"
            ? { ...base.logger, ...override.logger }
            : override.logger
          : base.logger,
      security:
        override.security !== undefined ? override.security : base.security,
      compress:
        override.compress !== undefined ? override.compress : base.compress,
      session: override.session !== undefined ? override.session : base.session,
      static: override.static !== undefined ? override.static : base.static,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 ADVANCED FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Conditional middleware application.
   */
  public when(
    condition: boolean | (() => boolean),
    handler: RequestHandler | (() => void),
  ): void {
    const shouldApply =
      typeof condition === "function" ? condition() : condition;

    if (shouldApply) {
      if (typeof handler === "function" && handler.length === 0) {
        // It's a callback function, execute it
        (handler as () => void)();
      } else {
        // It's a middleware handler
        this.addMiddleware(handler as RequestHandler);
      }
    }
  }

  /**
   * Auto-optimize middleware pipeline.
   */
  public optimize(config?: OptimizationConfig): void {
    if (config?.autoReorder) {
      this.reorderForPerformance();
    }

    if (config?.metrics) {
      this.enableProfiling();
    }

    this.bufferStartupLog("Middleware pipeline optimized");
  }

  /**
   * Reorder middleware for optimal performance.
   */
  private reorderForPerformance(): void {
    // Priority order: security first, then parsers, then logging, then others
    const priorityOrder: Record<MiddlewareCategory, number> = {
      security: 1,
      parser: 2,
      logging: 3,
      session: 4,
      validation: 5,
      static: 6,
      other: 7,
      error: 100, // Error handlers go last
    };

    this.middlewarePipeline.sort((a, b) => {
      const priorityA = priorityOrder[a.category] || 50;
      const priorityB = priorityOrder[b.category] || 50;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.order - b.order;
    });

    this.invalidateCache();
  }

  /**
   * Analyze middleware pipeline.
   */
  public analyze(): PipelineAnalysis {
    const info = this.getPipelineInfo();
    const issues: Array<string> = [];
    const bottlenecks: Array<string> = [];

    // Check for common issues
    if (!this.middlewareExists("jsonParser")) {
      issues.push("No JSON body parser configured");
    }

    if (
      !this.middlewareExists("compression") &&
      process.env.NODE_ENV === "production"
    ) {
      issues.push("Compression not enabled in production");
    }

    if (
      !this.middlewareExists("rateLimit") &&
      process.env.NODE_ENV === "production"
    ) {
      issues.push("Rate limiting not enabled in production");
    }

    // Identify potential bottlenecks
    if (this.profilingEnabled && this.profiler) {
      const metrics = this.profiler.getAllMetrics();
      for (const metric of metrics) {
        if (metric.avgExecutionMs > 50) {
          bottlenecks.push(
            `${metric.name}: avg ${metric.avgExecutionMs.toFixed(2)}ms`,
          );
        }
      }
    }

    return {
      count: info.total,
      estimatedOverhead: info.total * 0.1, // Rough estimate: 0.1ms per middleware
      order: info.entries.map((e) => ({
        name: e.name,
        category: e.category,
        isBuiltIn: e.type === "built-in",
      })),
      issues,
      bottlenecks,
    };
  }

  /**
   * Get recommendations for improvement.
   */
  public getRecommendations(): Array<Recommendation> {
    const recommendations: Array<Recommendation> = [];
    const analysis = this.analyze();

    // Check compression
    if (!this.middlewareExists("compression")) {
      recommendations.push({
        type: "performance",
        severity: "medium",
        message: "Compression is not enabled. Responses can be 60-80% smaller.",
        action: "this.Middleware.compress()",
      });
    }

    // Check rate limiting in production
    if (
      !this.middlewareExists("rateLimit") &&
      process.env.NODE_ENV === "production"
    ) {
      recommendations.push({
        type: "security",
        severity: "high",
        message:
          "Rate limiting not enabled in production. API is vulnerable to abuse.",
        action: "this.Middleware.security({ rateLimit: true })",
      });
    }

    // Check helmet in production
    if (
      !this.middlewareExists("helmet") &&
      process.env.NODE_ENV === "production"
    ) {
      recommendations.push({
        type: "security",
        severity: "high",
        message: "Security headers (Helmet) not enabled in production.",
        action: "this.Middleware.security('standard')",
      });
    }

    // Check for issues
    for (const issue of analysis.issues) {
      recommendations.push({
        type: "best-practice",
        severity: "low",
        message: issue,
      });
    }

    return recommendations;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 ALIAS: add() for addMiddleware()
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add custom middleware to global pipeline.
   * Alias for addMiddleware() with shorter name.
   */
  public add(middleware: MiddlewareOptions): void {
    this.addMiddleware(middleware);
  }
}
