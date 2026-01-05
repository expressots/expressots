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
} from "./middleware-service";

// Middleware interface
export {
  ErrorHandlerOptions,
  IMiddleware,
  HealthCheckOptions,
} from "./middleware-interface";

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
} from "./middleware-resolver";

// Middleware profiler
export {
  MiddlewareProfiler,
  MiddlewareMetrics,
  ProfilerStats,
} from "./middleware-profiler";

// Middleware presets
export {
  MiddlewarePresetName,
  MiddlewarePreset,
  PresetMiddlewareConfig,
  ApplyPresetOptions,
  MIDDLEWARE_PRESETS,
  getPreset,
  getPresetNames,
  getPresetsByTag,
  createPreset,
  mergePresets,
} from "./middleware-presets";

// Interface exports
export { OptionsJson } from "./interfaces/body-parser.interface";
export { CorsOptions } from "./interfaces/cors.interface";
export { CompressionOptions } from "./interfaces/compression.interface";
export { CookieSessionOptions } from "./interfaces/cookie-session/cookie-session.interface";
export { OptionsHelmet } from "./interfaces/helmet.interface";
export { SessionOptions } from "./interfaces/express-session.interface";
export { Keygrip } from "./interfaces/cookie-session/keygrip.interface";
export { CookieParserOptions } from "./interfaces/cookie-parser.interface";
export { ServeFaviconOptions } from "./interfaces/serve-favicon.interface";
export { RateLimitOptions } from "./interfaces/express-rate-limit.interface";
export { multer } from "./interfaces/multer.interface";
export { OptionsUrlencoded } from "./interfaces/url-encoded.interface";
export * as IMorgan from "./interfaces/morgan.interface";

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
} from "./content-negotiation";
export type {
  IContentFormatter,
  ContentNegotiationOptions,
  AcceptHeaderEntry,
  NegotiationResult,
  CsvFormatOptions,
  XmlFormatOptions,
  YamlFormatOptions,
} from "./interfaces/content-negotiation.interface";

// ═══════════════════════════════════════════════════════════════════════════
// V4 EXPORTS - New unified middleware system
// ═══════════════════════════════════════════════════════════════════════════

// V4 Middleware utilities
export { use, compose, when, parallel, timeout } from "./middleware-utils";

// V4 Middleware registry
export {
  MiddlewareRegistry,
  getMiddlewareRegistry,
  resetMiddlewareRegistry,
} from "./middleware-registry";
export type { MiddlewareEntry as RegistryMiddlewareEntry } from "./middleware-registry";

// V4 Upload registry (for @FileUpload decorator integration)
export {
  setGlobalUploadConfig,
  getGlobalUploadConfig,
  hasGlobalUploadConfig,
  clearGlobalUploadConfig,
  mergeUploadConfigs,
} from "./upload-registry";

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
} from "./middleware-config";