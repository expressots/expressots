import {
  ExpressHandler,
  MiddlewareOptions,
  MiddlewareCategory,
  MiddlewareEntry,
  MiddlewarePipelineInfo,
  ConditionalMiddlewareConfig,
} from "./middleware-service";
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
  MiddlewarePresetName,
  MiddlewarePreset,
  ApplyPresetOptions,
} from "./middleware-presets";
import {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler";

/**
 * ErrorHandlerOptions Interface
 *
 * The ErrorHandlerOptions interface specifies the configuration options for the error handler middleware.
 * @param errorHandler: An Express error handler function that takes care of processing errors and formulating the response.
 * @param showStackTrace: A boolean value indicating whether to include the stack trace in the error response. The default value is false.
 * @param enableExceptionFilters: A boolean value indicating whether to enable automatic exception filter integration. When enabled, exception filters decorated with @Catch() will be automatically discovered and used. Requires container to be provided. Default value is false.
 * @param container: Optional container instance for exception filter auto-discovery. Required when enableExceptionFilters is true.
 * @public API
 */
export interface ErrorHandlerOptions {
  errorHandler?: ExpressHandler;
  showStackTrace?: boolean;
  enableExceptionFilters?: boolean;
  container?: import("../di/inversify").interfaces.Container;
}

/**
 * Health check endpoint options.
 * @public API
 */
export interface HealthCheckOptions {
  /** Path for the health check endpoint (default: "/health/middleware") */
  path?: string;
  /** Include profiling metrics in the response */
  includeMetrics?: boolean;
  /** Include detailed middleware information */
  detailed?: boolean;
}

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 * @public API
 */
export interface IMiddleware {
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILT-IN MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adds a URL Encoded Parser middleware to the middleware collection.
   * The URL Encoded Parser is responsible for parsing the URL-encoded data in the incoming request bodies.
   *
   * @param options - Optional configuration options for the URL Encoded Parser.
   * @public API
   */
  addUrlEncodedParser(options?: OptionsUrlencoded): void;

  /**
   * Adds a Rate Limit middleware to the middleware collection.
   * The rate limiter is responsible for adding dynamic rate limit and request throttling to the application.
   *
   * @param options - Optional configuration options for the rate limiter.
   * @public API
   */
  addRateLimiter(options?: RateLimitOptions): void;

  /**
   * Adds a Body Parser middleware to the middleware collection.
   * The body parser is responsible for parsing the incoming request bodies in a middleware.
   *
   * @param options - Optional configuration options for the JSON body parser.
   * @public API
   */
  addBodyParser(options?: OptionsJson): void;

  /**
   * Adds Cross-Origin Resource Sharing (CORS) middleware to enable or control cross-origin requests.
   *
   * @param options - Optional configuration options for CORS. Defines the behavior of CORS requests like allowed origins, methods, headers, etc.
   * @public API
   */
  addCors(options?: CorsOptions): void;

  /**
   * Adds Compression middleware to reduce the size of the response body and improve the speed of the client-server communication.
   *
   * @param options - Optional configuration options for Compression. Allows fine-tuning the compression behavior, such as setting the compression level, threshold, and filter functions to determine which requests should be compressed.
   * @public API
   */
  addCompression(options?: CompressionOptions): void;

  /**
   * Adds Cookie Parser middleware to parse the cookie header and populate req.cookies with an object keyed by the cookie names.
   *
   * @param secret - A string or array used for signing cookies. This is optional and if not specified, the cookie-parser will not parse signed cookies.
   * @param options - Optional configuration options for Cookie Parser.
   * @public API
   */
  addCookieParser(
    secret?: string | Array<string> | undefined,
    options?: CookieParserOptions,
  ): void;

  /**
   * Adds Cookie Session middleware to enable cookie-based sessions.
   *
   * @param options - Optional configuration options for Cookie Session. Defines the behavior of cookie sessions like the name of the cookie, keys to sign the cookie, etc.
   * @public API
   */
  addCookieSession(options: CookieSessionOptions): void;

  /**
   * Adds Morgan middleware to log HTTP requests.
   *
   * @param format - The log format. Can be a string or a function.
   * @param options - Optional configuration options for Morgan. Defines the behavior of the logger like the output stream, buffer duration, etc.
   * @public API
   */
  addMorgan(format: string | FormatFn, options?: OptionsMorgan): void;

  /**
   * Adds a middleware to serve the favicon to the middleware collection.
   * The favicon is the icon that is displayed in the browser tab for the application.
   *
   * @param path - The path to the favicon file.
   * @param options - Optional configuration options for serving the favicon. Defines the behavior of the favicon middleware like cache control, custom headers, etc.
   * @public API
   */
  addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void;

  /**
   * Add a middleware to enable express-session.
   *
   * @param options - Optional configuration options for Session.
   * @public API
   */
  addSession(options: SessionOptions): void;

  /**
   * Adds Helmet middleware to enhance security by setting various HTTP headers.
   *
   * @param options - Optional configuration options for Helmet.
   * @returns The configuration options for Helmet middleware.
   * @public API
   */
  addHelmet(options?: OptionsHelmet): void;

  /**
   * Adds Multer middleware for handling multipart/form-data, typically used for file uploads.
   *
   * @param options - Optional configuration options for Multer.
   * @returns The Multer middleware.
   * @public API
   */
  setupMulter(options?: multer.Options): multer.Multer;

  /**
   * Adds a middleware to serve static files from the specified root directory.
   * Allows the application to serve files like images, CSS, JavaScript, etc.
   *
   * @param root - The root directory from which the static assets are to be served.
   * @param options - Optional configuration options for serving static files. Defines behavior like cache control, custom headers, etc.
   * @public API
   */
  serveStatic(root: string, options?: ServeStaticOptions): void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configures the error handling middleware for the application.
   *
   * @param options - The object containing the configuration options for the error handler middleware.
   * @option errorHandler - The Express error handler function that takes care of processing errors and formulating the response.
   * @option showStackTrace - A boolean value indicating whether to show the stack trace in the response.
   * @public API
   */
  setErrorHandler(options?: ErrorHandlerOptions): void;

  /**
   * Gets the configured error handler middleware.
   *
   * @returns The error handler middleware.
   * @public API
   */
  getErrorHandler(): ExpressHandler;

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param options - The Express request handler function to be added to the middleware collection, or a middleware configuration object
   * that is composed by a route and an expressjs handler, or a custom Expresso middleware.
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
   * @public API
   */
  addMiddleware(options: MiddlewareOptions): void;

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
   * ```
   *
   * @public API
   */
  addConditional(config: ConditionalMiddlewareConfig): void;

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
   *     Cors: { origin: "https://myapp.com" }
   *   }
   * });
   * ```
   *
   * @public API
   */
  usePreset(
    preset: MiddlewarePresetName | MiddlewarePreset,
    options?: ApplyPresetOptions,
  ): void;

  /**
   * Get all available presets.
   *
   * @returns Record of preset names to preset configurations
   * @public API
   */
  getAvailablePresets(): Record<MiddlewarePresetName, MiddlewarePreset>;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT NEGOTIATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configures content negotiation middleware for automatic response format selection
   * based on Accept headers. Supports multiple formats (JSON, XML, CSV, YAML, etc.)
   * with quality value negotiation (RFC 7231).
   *
   * @param options - Configuration options for content negotiation
   * @example
   * ```typescript
   * this.Middleware.addContentNegotiation({
   *   defaultFormat: "application/json",
   *   formatters: [JsonFormatter, XmlFormatter, CsvFormatter],
   *   strictMode: false
   * });
   * ```
   * @public API
   */
  addContentNegotiation(
    options?: import("./interfaces/content-negotiation.interface").ContentNegotiationOptions,
  ): void;

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configures validation for automatic request parameter validation.
   * Supports multiple validation libraries (class-validator, Zod, Yup, custom adapters)
   * with smart field detection and helpful error messages.
   *
   * @param options - Configuration options for validation
   * @example
   * ```typescript
   * this.Middleware.addValidation({
   *   smartDetection: true,
   *   errorFormat: "helpful",
   *   adapters: [ClassValidatorAdapter]
   * });
   * ```
   * @public API
   */
  addValidation(
    options?: import("../provider/validation/validation.interface").ValidationConfig,
  ): void;

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
   * // Later, get metrics
   * const stats = profiler.getStats();
   * ```
   *
   * @public API
   */
  enableProfiling(options?: { maxSamples?: number }): MiddlewareProfiler;

  /**
   * Disable middleware profiling.
   * @public API
   */
  disableProfiling(): void;

  /**
   * Get the profiler instance.
   * @returns The profiler or null if not enabled
   * @public API
   */
  getProfiler(): MiddlewareProfiler | null;

  /**
   * Get profiling metrics for all middleware.
   *
   * @returns Array of middleware metrics or empty array if profiling is disabled
   * @public API
   */
  getProfilingMetrics(): Array<MiddlewareMetrics>;

  /**
   * Get profiling statistics.
   *
   * @returns Profiler statistics or null if profiling is disabled
   * @public API
   */
  getProfilingStats(): ProfilerStats | null;

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
  addHealthCheck(options?: HealthCheckOptions): void;

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE INSPECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * View middleware pipeline formatted.
   * @returns void
   * @public API
   */
  viewMiddlewarePipeline(): void;

  /**
   * Get a visual ASCII representation of the middleware pipeline.
   *
   * @returns ASCII art diagram of the pipeline
   * @public API
   */
  visualizePipeline(): string;

  /**
   * Get a compact summary of the middleware pipeline.
   *
   * @returns Single-line summary
   * @public API
   */
  getPipelineSummary(): string;

  /**
   * Get structured pipeline info for banner display and introspection.
   *
   * @returns Middleware pipeline information
   * @public API
   */
  getPipelineInfo(): MiddlewarePipelineInfo;

  /**
   * Get a formatted view for banner display.
   *
   * @param maxDisplay - Maximum number of middleware to show
   * @returns Formatted middleware view
   * @public API
   */
  getFormattedView(maxDisplay?: number): {
    entries: Array<{
      name: string;
      category: MiddlewareCategory;
      type: "built-in" | "custom";
    }>;
    total: number;
    remaining: number;
  };

  /**
   * Get middleware count by category.
   *
   * @returns Record of category to count
   * @public API
   */
  getCountByCategory(): Record<MiddlewareCategory, number>;

  /**
   * Get middleware by name.
   *
   * @param name - The middleware name
   * @returns The middleware entry or undefined
   * @public API
   */
  getByName(name: string): MiddlewareEntry | undefined;

  /**
   * Remove a middleware from the pipeline by name.
   *
   * @param name - The middleware name to remove
   * @returns True if removed, false if not found
   * @public API
   */
  remove(name: string): boolean;

  /**
   * Clear all middleware from the pipeline.
   * @public API
   */
  clear(): void;

  /**
   * Get the total number of middleware in the pipeline.
   *
   * @returns Number of middleware
   * @public API
   */
  count(): number;
}
