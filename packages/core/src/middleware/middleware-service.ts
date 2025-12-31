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
import { OptionsJson } from "./interfaces/body-parser.interface";
import { CompressionOptions } from "./interfaces/compression.interface";
import { CookieParserOptions } from "./interfaces/cookie-parser.interface";
import { CookieSessionOptions } from "./interfaces/cookie-session/cookie-session.interface";
import { CorsOptions } from "./interfaces/cors.interface";
import { RateLimitOptions } from "./interfaces/express-rate-limit.interface";
import { SessionOptions } from "./interfaces/express-session.interface";
import { OptionsHelmet } from "./interfaces/helmet.interface";
import { FormatFn, OptionsMorgan } from "./interfaces/morgan.interface";
import { multer } from "./interfaces/multer.interface";
import { ServeFaviconOptions } from "./interfaces/serve-favicon.interface";
import { ServeStaticOptions } from "./interfaces/serve-static.interface";
import { OptionsUrlencoded } from "./interfaces/url-encoded.interface";
import {
  middlewareResolver,
  isMiddlewareAvailable,
} from "./middleware-resolver";
import { ContentNegotiationService } from "./content-negotiation/content-negotiation-service";
import { ContentNegotiationOptions } from "./interfaces/content-negotiation.interface";
import type { ValidationConfig } from "../provider/validation/validation.interface";
import {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler";
import {
  MiddlewarePresetName,
  MiddlewarePreset,
  ApplyPresetOptions,
  MIDDLEWARE_PRESETS,
  getPreset,
} from "./middleware-presets";

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
  // Singleton logger
  private logger: Logger;
  // Content negotiation service
  private contentNegotiationService: ContentNegotiationService | undefined;
  // Profiler instance
  private profiler: MiddlewareProfiler | null = null;
  // Profiling enabled flag
  private profilingEnabled = false;

  constructor() {
    this.logger = new Logger();
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
      this.logger.warn(
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
  // BUILT-IN MIDDLEWARE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adds a URL Encoded Parser middleware to the middleware collection.
   * The URL Encoded Parser is responsible for parsing the URL-encoded data in the incoming request bodies.
   *
   * @param options - Optional configuration options for the URL Encoded Parser.
   */
  addUrlEncodedParser(options?: OptionsUrlencoded): void {
    this.addBuiltInMiddleware("urlencodedParser", "parser", () =>
      urlencoded(options),
    );
  }

  /**
   * Adds a Rate Limit middleware to the middleware collection.
   *
   * @param options - Optional configuration options for the rate limiter.
   */
  public addRateLimiter(options?: RateLimitOptions): void {
    this.addBuiltInMiddleware("rateLimit", "security", () =>
      middlewareResolver("rateLimit", options),
    );
  }

  /**
   * Adds a Body Parser middleware to the middleware collection using the given options.
   *
   * @param options - Optional configuration options for the JSON body parser.
   */
  public addBodyParser(options?: OptionsJson): void {
    this.addBuiltInMiddleware("jsonParser", "parser", () => json(options));
  }

  /**
   * Adds Cross-Origin Resource Sharing (CORS) middleware to enable or control cross-origin requests.
   *
   * @param options - Optional configuration options for CORS.
   */
  addCors(options?: CorsOptions): void {
    this.addBuiltInMiddleware("cors", "security", () =>
      middlewareResolver("cors", options),
    );
  }

  /**
   * Adds Compression middleware to reduce the size of the response body.
   *
   * @param options - Optional configuration options for Compression.
   */
  addCompression(options?: CompressionOptions): void {
    this.addBuiltInMiddleware("compression", "other", () =>
      middlewareResolver("compression", options),
    );
  }

  /**
   * Adds Morgan middleware to log HTTP requests.
   *
   * @param format - The log format. Can be a string or a function.
   * @param options - Optional configuration options for Morgan.
   */
  addMorgan(
    format: string | FormatFn,
    options?: OptionsMorgan | undefined,
  ): void {
    this.addBuiltInMiddleware("morgan", "logging", () =>
      middlewareResolver("morgan", format, options),
    );
  }

  /**
   * Adds Cookie Parser middleware to parse the cookie header.
   *
   * @param secret - A string or array used for signing cookies.
   * @param options - Optional configuration options for Cookie Parser.
   */
  addCookieParser(
    secret?: string | Array<string> | undefined,
    options?: CookieParserOptions | undefined,
  ): void {
    this.addBuiltInMiddleware("cookieParser", "session", () =>
      middlewareResolver("cookieParser", secret, options),
    );
  }

  /**
   * Adds Cookie Session middleware to enable cookie-based sessions.
   *
   * @param options - Configuration options for Cookie Session.
   */
  addCookieSession(options: CookieSessionOptions): void {
    this.addBuiltInMiddleware("cookieSession", "session", () =>
      middlewareResolver("cookieSession", options),
    );
  }

  /**
   * Adds a middleware to serve the favicon.
   *
   * @param path - The path to the favicon file.
   * @param options - Optional configuration options for serving the favicon.
   */
  addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void {
    this.addBuiltInMiddleware("serveFavicon", "static", () =>
      middlewareResolver("serveFavicon", path, options),
    );
  }

  /**
   * Sets up Multer middleware for handling multipart/form-data.
   *
   * @param options - Optional configuration options for Multer.
   * @returns The Multer middleware instance.
   */
  public setupMulter(options?: multer.Options): multer.Multer {
    const multerMiddleware = middlewareResolver("multer", options);

    if (multerMiddleware) {
      return multerMiddleware as unknown as multer.Multer;
    }

    return null as unknown as multer.Multer;
  }

  /**
   * Adds Helmet middleware to enhance security by setting various HTTP headers.
   *
   * @param options - Optional configuration options for Helmet.
   */
  addHelmet(options?: OptionsHelmet): void {
    this.addBuiltInMiddleware("helmet", "security", () =>
      middlewareResolver("helmet", options),
    );
  }

  /**
   * Add express-session middleware.
   *
   * @param options - Configuration options for Session.
   */
  addSession(options: SessionOptions): void {
    this.addBuiltInMiddleware("session", "session", () =>
      middlewareResolver("session", options),
    );
  }

  /**
   * Adds a middleware to serve static files from the specified root directory.
   *
   * @param root - The root directory from which the static assets are to be served.
   * @param options - Optional configuration options for serving static files.
   */
  serveStatic(root: string, options?: ServeStaticOptions): void {
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
      this.logger.warn(
        `No middlewares in the route [${config.path}]. Skipping...`,
        "middleware-service",
      );
      return;
    }

    const configKey = config.path || `config_${this.insertionOrder}`;

    if (this.middlewareExists(configKey)) {
      this.logger.warn(
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
      this.logger.warn(
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
      this.logger.warn(
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
      this.logger.warn(
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
  // PRESETS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply a middleware preset bundle.
   *
   * @param preset - The preset name or custom preset object
   * @param options - Options for applying the preset
   *
   * @example
   * ```typescript
   * // Apply the API preset
   * middleware.usePreset("api");
   *
   * // Apply with overrides
   * middleware.usePreset("api", {
   *   overrides: {
   *     Cors: { origin: "https://myapp.com" },
   *     RateLimiter: { max: 200 }
   *   }
   * });
   *
   * // Skip specific middleware
   * middleware.usePreset("production", {
   *   skip: ["Morgan", "Compression"]
   * });
   * ```
   *
   * @public API
   */
  usePreset(
    preset: MiddlewarePresetName | MiddlewarePreset,
    options?: ApplyPresetOptions,
  ): void {
    const presetConfig =
      typeof preset === "string" ? getPreset(preset) : preset;

    if (!presetConfig) {
      this.logger.error(`Unknown preset: ${preset}`, "middleware-service");
      return;
    }

    this.logger.info(
      `Applying preset: ${presetConfig.name} (${presetConfig.description})`,
      "middleware-service",
    );

    for (const mwConfig of presetConfig.middleware) {
      // Skip if in skip list
      if (options?.skip?.includes(mwConfig.name)) {
        continue;
      }

      // Skip if only installed and not available
      if (
        options?.onlyInstalled &&
        !this.isMiddlewareMethodAvailable(mwConfig.name)
      ) {
        if (!mwConfig.optional) {
          this.logger.warn(
            `Middleware [${mwConfig.name}] not available, skipping...`,
            "middleware-service",
          );
        }
        continue;
      }

      // Get options with overrides
      const mwOptions = options?.overrides?.[mwConfig.name] ?? mwConfig.options;

      // Call the appropriate add method
      this.applyMiddlewareByName(mwConfig.name, mwOptions);
    }
  }

  /**
   * Check if a middleware add method is available.
   */
  private isMiddlewareMethodAvailable(name: string): boolean {
    const methodMap: Record<string, () => boolean> = {
      Cors: () => isMiddlewareAvailable("cors"),
      Helmet: () => isMiddlewareAvailable("helmet"),
      Compression: () => isMiddlewareAvailable("compression"),
      Morgan: () => isMiddlewareAvailable("morgan"),
      CookieParser: () => isMiddlewareAvailable("cookieParser"),
      CookieSession: () => isMiddlewareAvailable("cookieSession"),
      Session: () => isMiddlewareAvailable("session"),
      RateLimiter: () => isMiddlewareAvailable("rateLimit"),
      ServeFavicon: () => isMiddlewareAvailable("serveFavicon"),
      // Built-in Express middleware always available
      BodyParser: () => true,
      UrlEncodedParser: () => true,
    };

    return methodMap[name]?.() ?? false;
  }

  /**
   * Apply middleware by name using the appropriate add method.
   */
  private applyMiddlewareByName(name: string, options?: unknown): void {
    switch (name) {
      case "Cors":
        this.addCors(options as CorsOptions);
        break;
      case "Helmet":
        this.addHelmet(options as OptionsHelmet);
        break;
      case "BodyParser":
        this.addBodyParser(options as OptionsJson);
        break;
      case "UrlEncodedParser":
        this.addUrlEncodedParser(options as OptionsUrlencoded);
        break;
      case "Compression":
        this.addCompression(options as CompressionOptions);
        break;
      case "Morgan":
        // Morgan requires format as first argument
        if (typeof options === "string") {
          this.addMorgan(options);
        } else {
          this.addMorgan("combined");
        }
        break;
      case "CookieParser":
        this.addCookieParser(undefined, options as CookieParserOptions);
        break;
      case "CookieSession":
        this.addCookieSession(options as CookieSessionOptions);
        break;
      case "Session":
        this.addSession(options as SessionOptions);
        break;
      case "RateLimiter":
        this.addRateLimiter(options as RateLimitOptions);
        break;
      case "ServeFavicon":
        if (typeof options === "string") {
          this.addServeFavicon(options);
        }
        break;
      default:
        this.logger.warn(
          `Unknown middleware in preset: ${name}`,
          "middleware-service",
        );
    }
  }

  /**
   * Get all available presets.
   *
   * @returns Record of preset names to preset configurations
   * @public API
   */
  getAvailablePresets(): Record<MiddlewarePresetName, MiddlewarePreset> {
    return MIDDLEWARE_PRESETS;
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
        this.logger.warn(
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
        this.logger.warn(
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
      this.logger.warn(
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
}
