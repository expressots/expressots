/**
 * ExpressoTS v4 Middleware Configuration Types
 *
 * This file contains all type definitions for the unified middleware system.
 *
 * @module middleware-config
 * @public API
 */

import { Request, Response, RequestHandler } from "express";
import type { OptionsJson } from "./interfaces/body-parser.interface";
import type { OptionsUrlencoded } from "./interfaces/url-encoded.interface";
import type { CookieParserOptions } from "./interfaces/cookie-parser.interface";
import type { CorsOptions } from "./interfaces/cors.interface";
import type { OptionsHelmet } from "./interfaces/helmet.interface";
import type { CompressionOptions } from "./interfaces/compression.interface";
import type { ServeStaticOptions } from "./interfaces/serve-static.interface";
import type { multer } from "./interfaces/multer.interface";

// ═══════════════════════════════════════════════════════════════════════════
// PARSE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for the unified parse() method.
 * Replaces: addBodyParser, addUrlEncodedParser, addCookieParser
 *
 * @public API
 */
export interface ParseOptions {
  /**
   * JSON body parsing configuration.
   * Set to false to disable, true for defaults, or provide options.
   * @default true
   */
  json?: boolean | OptionsJson;

  /**
   * URL-encoded body parsing configuration.
   * Set to false to disable, true for defaults, or provide options.
   * @default true
   */
  urlencoded?: boolean | OptionsUrlencoded;

  /**
   * Cookie parsing configuration.
   * Set to false to disable, true for defaults, or provide options.
   * @default false (requires cookie-parser package)
   */
  cookies?:
    | boolean
    | {
        secret?: string | Array<string>;
        options?: CookieParserOptions;
      };

  /**
   * Raw body parsing for binary data.
   * @default false
   */
  raw?:
    | boolean
    | {
        type?: string | Array<string>;
        limit?: string | number;
      };

  /**
   * Text body parsing for plain text.
   * @default false
   */
  text?:
    | boolean
    | {
        type?: string | Array<string>;
        limit?: string | number;
      };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supported logger implementations.
 * @public API
 */
export type LoggerImplementation =
  | "morgan"
  | "pino"
  | "winston"
  | "bunyan"
  | "console"
  | "auto";

/**
 * Morgan-specific options.
 */
export interface MorganLoggerOptions {
  /** Log format: 'combined', 'common', 'dev', 'short', 'tiny', or custom */
  format?: string;
  /** Stream to write logs to */
  stream?: { write: (str: string) => void };
  /** Skip function */
  skip?: (req: Request, res: Response) => boolean;
  /** Log immediately on request */
  immediate?: boolean;
}

/**
 * Pino-specific options.
 */
export interface PinoLoggerOptions {
  /** Log level */
  level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  /** Pretty print in development */
  transport?: "pretty" | "pino-pretty" | object;
  /** Redact sensitive fields */
  redact?: Array<string>;
  /** Custom serializers */
  serializers?: Record<string, (value: unknown) => unknown>;
}

/**
 * Winston-specific options.
 */
export interface WinstonLoggerOptions {
  /** Log level */
  level?: string;
  /** Winston transports */
  transports?: Array<unknown>;
  /** Log format */
  format?: unknown;
  /** Meta info to include */
  meta?: boolean;
  /** Message key */
  msg?: string;
  /** Express format */
  expressFormat?: boolean;
  /** Color output */
  colorize?: boolean;
}

/**
 * Configuration for the logger() method.
 * Replaces: addMorgan
 *
 * @public API
 */
export interface MiddlewareLoggerConfig {
  /**
   * Logger implementation to use.
   * 'auto' will detect the best available: pino → winston → morgan → console
   * @default 'auto'
   */
  implementation?: LoggerImplementation;

  /**
   * Implementation-specific options.
   * The type depends on the implementation chosen.
   */
  options?:
    | MorganLoggerOptions
    | PinoLoggerOptions
    | WinstonLoggerOptions
    | unknown;

  /**
   * Custom logger middleware.
   * If provided, implementation is ignored.
   */
  custom?: RequestHandler;

  /**
   * Skip logging for specific requests.
   */
  skip?: (req: Request) => boolean;

  /**
   * Only log requests matching this condition.
   */
  only?: (req: Request) => boolean;

  /**
   * Disable logging in test environment.
   * @default true
   */
  disableInTest?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Built-in security presets.
 * @public API
 */
export type SecurityPreset =
  | "standard" // Balanced security for most apps
  | "strict" // Maximum security
  | "api" // Optimized for APIs
  | "minimal" // Basic security only
  | "relaxed"; // Development-friendly

/**
 * CSRF protection configuration.
 */
export interface CsrfConfig {
  /** Enable CSRF protection */
  enabled?: boolean;
  /** Cookie name for CSRF token */
  cookie?: string | boolean;
  /** Ignored methods */
  ignoreMethods?: Array<string>;
}

/**
 * Rate limiting strategy.
 */
export type RateLimitStrategy =
  | "fixed-window"
  | "sliding-window"
  | "token-bucket"
  | "leaky-bucket";

/**
 * Enhanced rate limit configuration.
 */
export interface EnhancedRateLimitConfig {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Max requests per window */
  max?: number;
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  /** Store for distributed rate limiting (pass actual store instance) */
  store?: object;
  /** Skip rate limiting condition */
  skip?: (req: Request) => boolean;
  /** Custom key generator */
  keyGenerator?: (req: Request) => string;
  /** Standard headers */
  standardHeaders?: boolean | "draft-6" | "draft-7";
  /** Legacy headers */
  legacyHeaders?: boolean;
}

/**
 * Configuration for the security() method.
 * Replaces: addHelmet, addCors, addRateLimiter
 *
 * @public API
 */
export interface SecurityConfig {
  /**
   * Security headers configuration.
   * Set to 'helmet' for Helmet.js, false to disable, or provide options.
   * @default 'helmet'
   */
  headers?: "helmet" | "lusca" | OptionsHelmet | false;

  /**
   * CORS configuration.
   * Set to true for permissive defaults, false to disable, or provide options.
   * @default true
   */
  cors?: boolean | CorsOptions;

  /**
   * Rate limiting configuration.
   * Set to true for defaults, false to disable, or provide options.
   * @default false
   */
  rateLimit?: boolean | EnhancedRateLimitConfig;

  /**
   * CSRF protection.
   * @default false
   */
  csrf?: boolean | CsrfConfig;

  /**
   * Custom security middleware to add.
   */
  custom?: Array<RequestHandler>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPRESSION OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compression algorithm.
 */
export type CompressionAlgorithm = "br" | "gzip" | "deflate";

/**
 * Compression implementation.
 */
export type CompressionImplementation = "compression" | "shrink-ray" | "auto";

/**
 * Configuration for the compress() method.
 * Replaces: addCompression
 *
 * @public API
 */
export interface CompressConfig extends Partial<CompressionOptions> {
  /**
   * Compression implementation to use.
   * 'auto' will detect: shrink-ray → compression
   * @default 'auto'
   */
  implementation?: CompressionImplementation;

  /**
   * Compression algorithms in order of preference.
   * @default ['gzip', 'deflate']
   */
  algorithms?: Array<CompressionAlgorithm>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Session storage type.
 */
export type SessionType = "cookie" | "store" | "jwt";

/**
 * JWT session options.
 */
export interface JwtSessionOptions {
  /** JWT algorithm */
  algorithm?: "HS256" | "HS384" | "HS512" | "RS256";
  /** Token expiration */
  expiresIn?: string | number;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string;
  /** Where to store JWT */
  storage?: "cookie" | "header" | "both";
  /** Cookie name if storage includes cookie */
  cookieName?: string;
  /** Header name if storage includes header */
  headerName?: string;
}

/**
 * Configuration for the session() method.
 * Replaces: addSession, addCookieSession
 *
 * @public API
 */
export interface SessionConfig {
  /**
   * Session type.
   * - 'cookie': Cookie-based sessions (client-side)
   * - 'store': Server-side sessions with external store
   * - 'jwt': JWT-based sessions
   */
  type: SessionType;

  /**
   * Secret for signing sessions/cookies.
   * Required for all session types.
   */
  secret: string | Array<string>;

  /**
   * Session store (for type: 'store').
   * Can be Redis, MongoDB, or any compatible store.
   */
  store?: object;

  /**
   * Cookie options.
   */
  cookie?: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    domain?: string;
    path?: string;
  };

  /**
   * Session name.
   * @default 'connect.sid'
   */
  name?: string;

  /**
   * Force session save even if unmodified.
   * @default false
   */
  resave?: boolean;

  /**
   * Save uninitialized sessions.
   * @default false
   */
  saveUninitialized?: boolean;

  /**
   * Rolling sessions (reset expiry on each request).
   * @default false
   */
  rolling?: boolean;

  /**
   * JWT-specific options (for type: 'jwt').
   */
  jwt?: JwtSessionOptions;

  /**
   * Cookie session specific options (for type: 'cookie').
   */
  keys?: Array<string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Storage provider type.
 */
export type StorageProvider =
  | "disk"
  | "memory"
  | "s3"
  | "gcs"
  | "azure"
  | "cloudinary";

/**
 * Configuration for the upload() method.
 * Replaces: setupMulter
 *
 * @public API
 */
export interface UploadConfig {
  /**
   * Storage provider.
   * @default 'disk'
   */
  storage?: StorageProvider | multer.StorageEngine;

  /**
   * Destination directory (for disk storage).
   * @default 'uploads/'
   */
  destination?: string;

  /**
   * File size limits.
   */
  limits?: {
    /** Max file size in bytes */
    fileSize?: number;
    /** Max number of files */
    files?: number;
    /** Max number of fields */
    fields?: number;
    /** Max field name size */
    fieldNameSize?: number;
    /** Max field value size */
    fieldSize?: number;
  };

  /**
   * File filter function.
   * Return true to accept, false to reject.
   */
  fileFilter?: (file: Express.Multer.File) => boolean | Promise<boolean>;

  /**
   * Preserve original filename.
   * @default false
   */
  preserveFilename?: boolean;

  /**
   * Custom filename generator.
   */
  filenameGenerator?: (file: Express.Multer.File) => string;

  // Cloud storage options (S3, GCS, Azure)
  /** Bucket name */
  bucket?: string;
  /** Region (for S3) */
  region?: string;
  /** Project ID (for GCS) */
  projectId?: string;
  /** Access control */
  acl?: "private" | "public-read" | "public-read-write";
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Upload handler interface.
 * @public API
 */
export interface UploadHandler {
  /** Single file upload */
  single(fieldName: string): RequestHandler;
  /** Multiple files (same field) */
  array(fieldName: string, maxCount?: number): RequestHandler;
  /** Multiple files (different fields) */
  fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
  /** Any files */
  any(): RequestHandler;
  /** No files (form fields only) */
  none(): RequestHandler;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATIC OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the static() method.
 * Replaces: serveStatic, addServeFavicon
 *
 * @public API
 */
export interface StaticConfig {
  /**
   * Directory path to serve.
   */
  path: string;

  /**
   * URL prefix for static files.
   * @example '/assets'
   */
  prefix?: string;

  /**
   * Enable SPA mode.
   * Serves index.html for non-file routes.
   * @default false
   */
  spa?: boolean;

  /**
   * Index file for SPA mode.
   * @default 'index.html'
   */
  index?: string;

  /**
   * Cache-Control header value.
   * @example 'public, max-age=31536000'
   */
  cacheControl?: string;

  /**
   * Max age for caching.
   * @default 0
   */
  maxAge?: string | number;

  /**
   * Enable ETag.
   * @default true
   */
  etag?: boolean;

  /**
   * Enable directory listing.
   * @default false
   */
  directoryListing?: boolean;

  /**
   * Custom headers.
   */
  headers?: Record<string, string>;

  /**
   * Serve-static options passthrough.
   */
  options?: ServeStaticOptions;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Built-in preset names.
 * @public API
 */
export type PresetName =
  | "api"
  | "graphql"
  | "web"
  | "spa"
  | "microservice"
  | "minimal"
  | "development"
  | "production";

/**
 * Complete middleware configuration for presets.
 * @public API
 */
export interface MiddlewareConfig {
  /** Request parsing configuration */
  parse?: ParseOptions | boolean;
  /** Logging configuration */
  logger?: MiddlewareLoggerConfig | boolean;
  /** Security configuration */
  security?: SecurityConfig | SecurityPreset | boolean;
  /** Compression configuration */
  compress?: CompressConfig | boolean;
  /** Session configuration */
  session?: SessionConfig;
  /** Static file serving */
  static?: StaticConfig | string | Array<StaticConfig | string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZATION OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the optimize() method.
 * @public API
 */
export interface OptimizationConfig {
  /**
   * Automatically reorder middleware for optimal performance.
   * @default false
   */
  autoReorder?: boolean;

  /**
   * Lazy-load heavy middleware.
   */
  lazy?: Array<string>;

  /**
   * Enable performance metrics.
   * @default false
   */
  metrics?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS & RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pipeline analysis result.
 * @public API
 */
export interface PipelineAnalysis {
  /** Total middleware count */
  count: number;
  /** Estimated overhead per request (ms) */
  estimatedOverhead: number;
  /** Middleware execution order */
  order: Array<{
    name: string;
    category: string;
    isBuiltIn: boolean;
  }>;
  /** Potential issues */
  issues: Array<string>;
  /** Performance bottlenecks */
  bottlenecks: Array<string>;
}

/**
 * Recommendation type.
 */
export type RecommendationType = "performance" | "security" | "best-practice";

/**
 * Recommendation severity.
 */
export type RecommendationSeverity = "low" | "medium" | "high";

/**
 * Middleware recommendation.
 * @public API
 */
export interface Recommendation {
  /** Recommendation type */
  type: RecommendationType;
  /** Severity level */
  severity: RecommendationSeverity;
  /** Human-readable message */
  message: string;
  /** Suggested action */
  action?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registered middleware entry.
 * @public API
 */
export interface RegisteredMiddleware {
  /** Middleware name */
  name: string;
  /** Middleware handler(s) */
  handler: RequestHandler | Array<RequestHandler>;
  /** Registration timestamp */
  registeredAt: Date;
}
