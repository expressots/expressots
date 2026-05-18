// Core middleware service and types
export {
  Middleware,
  ExpressHandler,
  ExpressoMiddleware,
  MiddlewareOptions,
  MiddlewareCategory,
  MiddlewareEntry,
  MiddlewarePipelineInfo,
  ConditionalMiddlewareConfig,
} from "./middleware-service.js";

// Middleware interface
export {
  ErrorHandlerOptions,
  IMiddleware,
  HealthCheckOptions,
} from "./middleware-interface.js";

// Middleware resolver utilities
export {
  middlewareResolver,
  isMiddlewareAvailable,
  isPackageAvailable,
  resolvePackage,
  getAvailableMiddleware,
  getRegisteredMiddleware,
  clearMiddlewareCache,
  getPackageName,
  MIDDLEWARE_REGISTRY,
  RegisteredMiddlewareName,
} from "./middleware-resolver.js";

// Middleware profiler
export {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler.js";

// Interface exports - all type-only. Use `export type` so ESM link
// validation doesn't reject these re-exports (the source files have
// no runtime values; the CJS build silently emitted lazy `undefined`
// getters for them, but ESM is strict about link-time presence).
export type { OptionsJson } from "./interfaces/body-parser.interface.js";
export type { CorsOptions } from "./interfaces/cors.interface.js";
export type { CompressionOptions } from "./interfaces/compression.interface.js";
export type { CookieSessionOptions } from "./interfaces/cookie-session/cookie-session.interface.js";
export type { OptionsHelmet } from "./interfaces/helmet.interface.js";
export type { SessionOptions } from "./interfaces/express-session.interface.js";
export type { Keygrip } from "./interfaces/cookie-session/keygrip.interface.js";
export type { CookieParserOptions } from "./interfaces/cookie-parser.interface.js";
export type { ServeFaviconOptions } from "./interfaces/serve-favicon.interface.js";
export type { RateLimitOptions } from "./interfaces/express-rate-limit.interface.js";
export type { multer } from "./interfaces/multer.interface.js";
export type { OptionsUrlencoded } from "./interfaces/url-encoded.interface.js";
export type * as IMorgan from "./interfaces/morgan.interface.js";

// Content Negotiation exports
export {
  ContentNegotiationService,
  FormatterRegistry,
  AcceptHeaderParser,
  JsonFormatter,
  XmlFormatter,
  CsvFormatter,
  YamlFormatter,
  PlainTextFormatter,
} from "./content-negotiation/index.js";
export type {
  IContentFormatter,
  ContentNegotiationOptions,
  AcceptHeaderEntry,
  NegotiationResult,
  CsvFormatOptions,
  XmlFormatOptions,
  YamlFormatOptions,
} from "./interfaces/content-negotiation.interface.js";

// ═══════════════════════════════════════════════════════════════════════════
// V4 EXPORTS - New unified middleware system
// ═══════════════════════════════════════════════════════════════════════════

// V4 Middleware utilities
export { use, compose, when, parallel, timeout } from "./middleware-utils.js";

// V4 Middleware registry
export {
  MiddlewareRegistry,
  getMiddlewareRegistry,
  resetMiddlewareRegistry,
} from "./middleware-registry.js";
export type { MiddlewareEntry as RegistryMiddlewareEntry } from "./middleware-registry.js";

// V4 Upload registry (for @FileUpload decorator integration)
export {
  setGlobalUploadConfig,
  getGlobalUploadConfig,
  hasGlobalUploadConfig,
  clearGlobalUploadConfig,
  mergeUploadConfigs,
} from "./upload-registry.js";

// V4 Middleware configuration types
export type {
  // Parse options
  ParseOptions,
  // Logger options
  MiddlewareLoggerConfig,
  LoggerImplementation,
  MorganLoggerOptions,
  PinoLoggerOptions,
  WinstonLoggerOptions,
  // Security options
  SecurityConfig,
  SecurityPreset,
  EnhancedRateLimitConfig,
  CsrfConfig,
  RateLimitStrategy,
  // Compression options
  CompressConfig,
  CompressionAlgorithm,
  CompressionImplementation,
  // Session options
  SessionConfig,
  SessionType,
  JwtSessionOptions,
  // Upload options
  UploadConfig,
  UploadHandler,
  StorageProvider,
  // Static options
  StaticConfig,
  // Preset options
  PresetName,
  MiddlewareConfig,
  // Optimization options
  OptimizationConfig,
  // Analysis options
  PipelineAnalysis,
  Recommendation,
  RecommendationType,
  RecommendationSeverity,
  // Registry types
  RegisteredMiddleware,
} from "./middleware-config.js";
