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
