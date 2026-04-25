import type { RequestHandler } from "express";
import {
  ExpressHandler,
  MiddlewareOptions,
  MiddlewareCategory,
  MiddlewareEntry,
  MiddlewarePipelineInfo,
  ConditionalMiddlewareConfig,
} from "./middleware-service.js";
import {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler.js";
import type {
  ParseOptions,
  MiddlewareLoggerConfig,
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
} from "./middleware-config.js";
import type { MiddlewareEntry as RegistryEntry } from "./middleware-registry.js";
import type { RenderConfig, PresetName } from "../render/render-config.js";
import type { RenderService } from "../render/render-service.js";

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
  container?: import("../di/inversify.js").interfaces.Container;
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
  // V4 UNIFIED METHODS - Category-based middleware configuration
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🌟 Configure request parsing (unified method).
   * Replaces: addBodyParser, addUrlEncodedParser, addCookieParser
   *
   * @param options - Parse configuration options
   *
   * @example Simple (all defaults)
   * ```typescript
   * this.Middleware.parse();  // Enables json + urlencoded with smart defaults
   * ```
   *
   * @example Advanced
   * ```typescript
   * this.Middleware.parse({
   *   json: { limit: '10mb', strict: true },
   *   urlencoded: { extended: true, limit: '10mb' },
   *   cookies: { secret: 'my-secret' },
   *   raw: false,
   *   text: false
   * });
   * ```
   *
   * @public API
   */
  parse(options?: ParseOptions): void;

  /**
   * 🌟 Configure logging with any implementation.
   * Replaces: addMorgan
   *
   * Auto-detects best available: pino → winston → morgan → console
   *
   * @param config - Logger configuration
   *
   * @example Auto-detect
   * ```typescript
   * this.Middleware.logger();  // Uses best available logger
   * ```
   *
   * @example Specific implementation
   * ```typescript
   * this.Middleware.logger({
   *   implementation: 'pino',
   *   options: { level: 'info' }
   * });
   * ```
   *
   * @example Custom logger
   * ```typescript
   * this.Middleware.logger({
   *   custom: (req, res, next) => {
   *     console.log(`${req.method} ${req.url}`);
   *     next();
   *   }
   * });
   * ```
   *
   * @public API
   */
  logger(config?: MiddlewareLoggerConfig): void;

  /**
   * 🌟 Unified security configuration.
   * Replaces: addHelmet, addCors, addRateLimiter
   *
   * @param config - Security configuration or preset name
   *
   * @example Preset-based
   * ```typescript
   * this.Middleware.security('standard');   // Helmet + CORS
   * this.Middleware.security('strict');      // Maximum security
   * this.Middleware.security('api');         // API-optimized
   * ```
   *
   * @example Granular control
   * ```typescript
   * this.Middleware.security({
   *   headers: 'helmet',
   *   cors: { origin: ['https://myapp.com'], credentials: true },
   *   rateLimit: { windowMs: 60000, max: 100 }
   * });
   * ```
   *
   * @public API
   */
  security(config?: SecurityConfig | SecurityPreset): void;

  /**
   * 🌟 Configure compression with any algorithm.
   * Replaces: addCompression
   *
   * Auto-detects: shrink-ray → compression
   *
   * @param config - Compression configuration
   *
   * @example Auto-detect
   * ```typescript
   * this.Middleware.compress();  // Uses best available
   * ```
   *
   * @example With options
   * ```typescript
   * this.Middleware.compress({
   *   level: 6,
   *   threshold: '1kb',
   *   algorithms: ['gzip', 'deflate']
   * });
   * ```
   *
   * @public API
   */
  compress(config?: CompressConfig): void;

  /**
   * 🌟 Unified session management.
   * Replaces: addSession, addCookieSession
   *
   * @param config - Session configuration
   *
   * @example Cookie session
   * ```typescript
   * this.Middleware.session({
   *   type: 'cookie',
   *   secret: 'my-secret',
   *   cookie: { maxAge: 86400000 }
   * });
   * ```
   *
   * @example Store-based session
   * ```typescript
   * this.Middleware.session({
   *   type: 'store',
   *   secret: 'my-secret',
   *   store: new RedisStore({ client: redisClient })
   * });
   * ```
   *
   * @public API
   */
  session(config: V4SessionConfig): void;

  /**
   * 🌟 Enhanced file upload handling.
   * Replaces: setupMulter
   *
   * @param config - Upload configuration
   * @returns Upload handler with single, array, fields, any, none methods
   *
   * @example Local storage
   * ```typescript
   * const upload = this.Middleware.upload({
   *   destination: './uploads',
   *   limits: { fileSize: 5 * 1024 * 1024 }
   * });
   * ```
   *
   * @public API
   */
  upload(config?: UploadConfig): UploadHandler;

  /**
   * 🌟 Enhanced static file serving.
   * Replaces: serveStatic, addServeFavicon
   *
   * @param config - Static configuration or path string
   *
   * @example Simple
   * ```typescript
   * this.Middleware.static('./public');
   * ```
   *
   * @example SPA mode
   * ```typescript
   * this.Middleware.static({
   *   path: './dist',
   *   spa: true,
   *   index: 'index.html'
   * });
   * ```
   *
   * @example Multiple directories
   * ```typescript
   * this.Middleware.static([
   *   { path: './public', prefix: '/assets' },
   *   { path: './uploads', prefix: '/media' },
   *   { path: './dist', spa: true }
   * ]);
   * ```
   *
   * @public API
   */
  static(config: StaticConfig | string | Array<StaticConfig | string>): void;

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 MIDDLEWARE REGISTRY - Named middleware for route-level use
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🌟 Register a named middleware for use in routes.
   *
   * @param name - Unique name for the middleware
   * @param handler - Express handler, array of handlers, or ExpressoMiddleware
   *
   * @example Register single handler
   * ```typescript
   * this.Middleware.register('auth', verifyJwtMiddleware);
   * ```
   *
   * @example Register chain
   * ```typescript
   * this.Middleware.register('admin', [verifyJwt, loadUser, checkAdmin]);
   * ```
   *
   * @example Use in controller
   * ```typescript
   * @httpGet('/', ...use('auth'))
   * async getUsers() { }
   * ```
   *
   * @public API
   */
  register(
    name: string,
    handler: RequestHandler | Array<RequestHandler> | RegistryEntry,
  ): void;

  /**
   * Get a registered middleware by name.
   *
   * @param name - Middleware name
   * @returns The middleware handler(s) or undefined
   * @public API
   */
  get(name: string): RequestHandler | Array<RequestHandler> | undefined;

  /**
   * Check if a middleware is registered.
   *
   * @param name - Middleware name
   * @returns True if registered
   * @public API
   */
  has(name: string): boolean;

  /**
   * Get all registered middleware names.
   *
   * @returns Array of registered names
   * @public API
   */
  getRegisteredNames(): Array<string>;

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 PRESETS - Enhanced preset system
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🌟 Define a custom reusable preset.
   *
   * @param name - Preset name
   * @param config - Middleware configuration
   *
   * @example
   * ```typescript
   * this.Middleware.definePreset('my-api', {
   *   parse: { json: { limit: '5mb' } },
   *   logger: { implementation: 'pino' },
   *   security: 'strict',
   *   compress: true
   * });
   *
   * this.Middleware.usePreset('my-api');
   * ```
   *
   * @public API
   */
  definePreset(name: string, config: V4MiddlewareConfig): void;

  /**
   * 🌟 Apply a preset configuration (v4 enhanced).
   *
   * @param preset - Preset name (built-in or custom)
   * @param overrides - Optional overrides for the preset
   *
   * @example Built-in preset
   * ```typescript
   * this.Middleware.usePreset('api');
   * ```
   *
   * @example With overrides
   * ```typescript
   * this.Middleware.usePreset('api', {
   *   logger: { implementation: 'pino' },
   *   security: { rateLimit: { max: 200 } }
   * });
   * ```
   *
   * @public API
   */
  applyPreset(preset: string, overrides?: Partial<V4MiddlewareConfig>): void;

  /**
   * Get all available presets (built-in + custom).
   *
   * @returns Record of preset names to configurations
   * @public API
   */
  getAllPresets(): Record<string, V4MiddlewareConfig>;

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 ADVANCED FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🌟 Conditional middleware application.
   *
   * @param condition - Boolean or function returning boolean
   * @param handler - Middleware to apply or function to execute
   *
   * @example Environment-based
   * ```typescript
   * this.Middleware.when(
   *   process.env.NODE_ENV === 'development',
   *   () => this.Middleware.logger({ implementation: 'morgan', options: { format: 'dev' } })
   * );
   * ```
   *
   * @public API
   */
  when(
    condition: boolean | (() => boolean),
    handler: RequestHandler | (() => void),
  ): void;

  /**
   * 🌟 Auto-optimize middleware pipeline.
   *
   * @param config - Optimization configuration
   *
   * @example
   * ```typescript
   * this.Middleware.optimize({
   *   autoReorder: true,  // Reorder for performance
   *   metrics: true       // Enable performance metrics
   * });
   * ```
   *
   * @public API
   */
  optimize(config?: OptimizationConfig): void;

  /**
   * 🌟 Analyze middleware pipeline.
   *
   * @returns Pipeline analysis with issues and bottlenecks
   * @public API
   */
  analyze(): PipelineAnalysis;

  /**
   * 🌟 Get recommendations for improvement.
   *
   * @returns Array of recommendations
   * @public API
   */
  getRecommendations(): Array<Recommendation>;

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 CUSTOM MIDDLEWARE (renamed from addMiddleware)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🌟 Add custom middleware to global pipeline.
   * Supports: Express handlers, ExpressoTS classes, middleware configs
   *
   * @param middleware - The middleware to add
   *
   * @example Express Handler
   * ```typescript
   * this.Middleware.add((req, res, next) => {
   *   req.requestId = crypto.randomUUID();
   *   next();
   * });
   * ```
   *
   * @example ExpressoTS Middleware
   * ```typescript
   * this.Middleware.add(new AuthMiddleware());
   * ```
   *
   * @example Route-specific
   * ```typescript
   * this.Middleware.add({
   *   path: '/api',
   *   middlewares: [authMiddleware, rateLimiter]
   * });
   * ```
   *
   * @public API
   */
  add(middleware: MiddlewareOptions): void;

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
   * this.Middleware.addConditional({
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
    options?: import("./interfaces/content-negotiation.interface.js").ContentNegotiationOptions,
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
    options?: import("../provider/validation/validation.interface.js").ValidationConfig,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 RENDER ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configure view rendering with unified API.
   * Supports traditional engines (EJS, Pug, Handlebars) and modern frameworks (React, Vue, Svelte).
   *
   * @param config - Render configuration or preset name
   *
   * @example Auto-detect
   * ```typescript
   * this.Middleware.render();  // Detects installed engine
   * ```
   *
   * @example With preset
   * ```typescript
   * this.Middleware.render('production');  // Production-optimized settings
   * this.Middleware.render('development'); // Dev settings with hot reload
   * ```
   *
   * @example Full configuration
   * ```typescript
   * this.Middleware.render({
   *   engine: 'react',
   *   viewsDir: 'src/views',
   *   cache: 'auto',
   *   ssr: { hydrate: true, streaming: true },
   *   watch: 'auto'
   * });
   * ```
   *
   * @public API
   */
  render(config?: RenderConfig | PresetName): Promise<void>;

  /**
   * Get the render service instance.
   * Use this to access advanced rendering features.
   *
   * @returns Render service or null if not configured
   *
   * @example
   * ```typescript
   * const renderService = this.Middleware.getRenderService();
   * if (renderService) {
   *   const html = await renderService.render('Home', { title: 'Welcome' });
   * }
   * ```
   *
   * @public API
   */
  getRenderService(): RenderService | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 STARTUP LOGS (displayed after banner)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get buffered startup logs for display after the banner.
   * These logs are collected during configureServices() and should be
   * displayed in postServerInitialization() after the banner.
   *
   * @returns Array of startup log entries with message and type
   *
   * @example
   * ```typescript
   * async postServerInitialization(): Promise<void> {
   *   // Display middleware startup logs after banner
   *   const logs = this.Middleware.getStartupLogs();
   *   logs.forEach(log => {
   *     if (log.type === 'warn') {
   *       console.log(`⚠️ ${log.message}`);
   *     } else {
   *       console.log(`✓ ${log.message}`);
   *     }
   *   });
   * }
   * ```
   *
   * @public API
   */
  getStartupLogs(): Array<{ message: string; type: "info" | "warn" }>;

  /**
   * Clear all buffered startup logs.
   * Call this after displaying the logs to free memory.
   *
   * @public API
   */
  clearStartupLogs(): void;
}
