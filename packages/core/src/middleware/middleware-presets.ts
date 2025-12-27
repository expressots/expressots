import type { OptionsJson } from "./interfaces/body-parser.interface";
import type { CompressionOptions } from "./interfaces/compression.interface";
import type { CorsOptions } from "./interfaces/cors.interface";
import type { OptionsHelmet } from "./interfaces/helmet.interface";
import type { RateLimitOptions } from "./interfaces/express-rate-limit.interface";
import type { OptionsUrlencoded } from "./interfaces/url-encoded.interface";
import type { OptionsMorgan } from "./interfaces/morgan.interface";

/**
 * Individual middleware configuration within a preset.
 * @public API
 */
export interface PresetMiddlewareConfig {
  /** Middleware name (matches the add* method name without 'add' prefix) */
  name: string;
  /** Configuration options for the middleware */
  options?: unknown;
  /** Whether this middleware is optional (won't fail if not installed) */
  optional?: boolean;
}

/**
 * Available preset names.
 * @public API
 */
export type MiddlewarePresetName =
  | "api"
  | "web"
  | "microservice"
  | "graphql"
  | "minimal"
  | "secure"
  | "development"
  | "production";

/**
 * Preset configuration with metadata.
 * @public API
 */
export interface MiddlewarePreset {
  /** Preset name */
  name: MiddlewarePresetName;
  /** Human-readable description */
  description: string;
  /** List of middleware to apply */
  middleware: Array<PresetMiddlewareConfig>;
  /** Tags for categorization */
  tags?: Array<string>;
}

/**
 * Options for applying a preset.
 * @public API
 */
export interface ApplyPresetOptions {
  /** Override specific middleware options */
  overrides?: Record<string, unknown>;
  /** Skip specific middleware by name */
  skip?: Array<string>;
  /** Only apply middleware that are already installed */
  onlyInstalled?: boolean;
}

/**
 * Default CORS options for API preset.
 */
const API_CORS_OPTIONS: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

/**
 * Default Helmet options for secure preset.
 */
const SECURE_HELMET_OPTIONS: OptionsHelmet = {
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'"],
      "img-src": ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  xDnsPrefetchControl: { allow: false },
  xFrameOptions: { action: "deny" },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xDownloadOptions: "noopen",
  xContentTypeOptions: "nosniff",
  xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
};

/**
 * Default rate limit options.
 */
const DEFAULT_RATE_LIMIT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
};

/**
 * Strict rate limit for production.
 */
const PRODUCTION_RATE_LIMIT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
};

/**
 * Built-in middleware presets.
 * @public API
 */
export const MIDDLEWARE_PRESETS: Record<
  MiddlewarePresetName,
  MiddlewarePreset
> = {
  /**
   * API Preset - Optimized for REST APIs
   * Includes: CORS, Helmet, JSON parser, URL-encoded parser, Compression, Rate limiting
   */
  api: {
    name: "api",
    description:
      "Optimized configuration for REST APIs with security and performance",
    tags: ["rest", "backend", "security"],
    middleware: [
      { name: "Cors", options: API_CORS_OPTIONS },
      { name: "Helmet", options: {} },
      { name: "BodyParser", options: { limit: "10mb" } as OptionsJson },
      {
        name: "UrlEncodedParser",
        options: { extended: true } as OptionsUrlencoded,
      },
      { name: "Compression", options: { level: 6 } as CompressionOptions },
      { name: "RateLimiter", options: DEFAULT_RATE_LIMIT_OPTIONS },
    ],
  },

  /**
   * Web Preset - For traditional web applications
   * Includes: Session, Cookie parser, Static files, CORS, Helmet
   */
  web: {
    name: "web",
    description: "Configuration for traditional web applications with sessions",
    tags: ["web", "frontend", "session"],
    middleware: [
      { name: "Cors", options: { origin: true } as CorsOptions },
      { name: "Helmet", options: {} },
      { name: "BodyParser", options: { limit: "5mb" } as OptionsJson },
      {
        name: "UrlEncodedParser",
        options: { extended: true } as OptionsUrlencoded,
      },
      { name: "CookieParser", options: undefined, optional: true },
      { name: "Compression", options: {} },
    ],
  },

  /**
   * Microservice Preset - Lightweight for service-to-service communication
   * Minimal middleware for maximum performance
   */
  microservice: {
    name: "microservice",
    description: "Lightweight configuration for microservices",
    tags: ["microservice", "performance", "minimal"],
    middleware: [
      { name: "BodyParser", options: { limit: "1mb" } as OptionsJson },
      { name: "Compression", options: { level: 6 } as CompressionOptions },
    ],
  },

  /**
   * GraphQL Preset - Optimized for GraphQL APIs
   */
  graphql: {
    name: "graphql",
    description: "Optimized for GraphQL API servers",
    tags: ["graphql", "api"],
    middleware: [
      {
        name: "Cors",
        options: {
          origin: true,
          methods: ["GET", "POST", "OPTIONS"],
        } as CorsOptions,
      },
      { name: "BodyParser", options: { limit: "50mb" } as OptionsJson },
      { name: "Compression", options: {} },
    ],
  },

  /**
   * Minimal Preset - Absolute minimum for simple apps
   */
  minimal: {
    name: "minimal",
    description: "Minimal configuration with just body parsing",
    tags: ["minimal", "simple"],
    middleware: [
      { name: "BodyParser", options: {} },
      {
        name: "UrlEncodedParser",
        options: { extended: false } as OptionsUrlencoded,
      },
    ],
  },

  /**
   * Secure Preset - Maximum security configuration
   */
  secure: {
    name: "secure",
    description: "Maximum security configuration for sensitive applications",
    tags: ["security", "production", "hardened"],
    middleware: [
      { name: "Helmet", options: SECURE_HELMET_OPTIONS },
      {
        name: "Cors",
        options: {
          origin: false, // Must be explicitly configured
          credentials: true,
        } as CorsOptions,
      },
      { name: "RateLimiter", options: PRODUCTION_RATE_LIMIT_OPTIONS },
      { name: "BodyParser", options: { limit: "1mb" } as OptionsJson },
      {
        name: "UrlEncodedParser",
        options: { extended: false, limit: "1mb" } as OptionsUrlencoded,
      },
    ],
  },

  /**
   * Development Preset - Verbose logging and relaxed security
   */
  development: {
    name: "development",
    description: "Development-friendly with logging and relaxed security",
    tags: ["development", "debug", "logging"],
    middleware: [
      { name: "Cors", options: { origin: true } as CorsOptions },
      { name: "BodyParser", options: { limit: "50mb" } as OptionsJson },
      {
        name: "UrlEncodedParser",
        options: { extended: true } as OptionsUrlencoded,
      },
      {
        name: "Morgan",
        options: "dev" as unknown as OptionsMorgan,
        optional: true,
      },
      { name: "Compression", options: {}, optional: true },
    ],
  },

  /**
   * Production Preset - Optimized for production deployment
   */
  production: {
    name: "production",
    description: "Production-optimized with security and performance",
    tags: ["production", "performance", "security"],
    middleware: [
      { name: "Helmet", options: {} },
      { name: "Cors", options: API_CORS_OPTIONS },
      { name: "RateLimiter", options: PRODUCTION_RATE_LIMIT_OPTIONS },
      {
        name: "Compression",
        options: { level: 6, threshold: 1024 } as CompressionOptions,
      },
      { name: "BodyParser", options: { limit: "10mb" } as OptionsJson },
      {
        name: "UrlEncodedParser",
        options: { extended: true } as OptionsUrlencoded,
      },
    ],
  },
};

/**
 * Get a preset by name.
 *
 * @param name - The preset name
 * @returns The preset configuration or undefined
 * @public API
 */
export function getPreset(
  name: MiddlewarePresetName,
): MiddlewarePreset | undefined {
  return MIDDLEWARE_PRESETS[name];
}

/**
 * Get all available preset names.
 *
 * @returns Array of preset names
 * @public API
 */
export function getPresetNames(): Array<MiddlewarePresetName> {
  return Object.keys(MIDDLEWARE_PRESETS) as Array<MiddlewarePresetName>;
}

/**
 * Get presets by tag.
 *
 * @param tag - The tag to filter by
 * @returns Array of matching presets
 * @public API
 */
export function getPresetsByTag(tag: string): Array<MiddlewarePreset> {
  return Object.values(MIDDLEWARE_PRESETS).filter((preset) =>
    preset.tags?.includes(tag),
  );
}

/**
 * Create a custom preset.
 *
 * @param config - The preset configuration
 * @returns The created preset
 * @public API
 */
export function createPreset(
  config: Omit<MiddlewarePreset, "name"> & { name: string },
): MiddlewarePreset {
  return config as MiddlewarePreset;
}

/**
 * Merge two presets, with the second overriding the first.
 *
 * @param base - The base preset
 * @param override - The overriding preset
 * @returns Merged preset
 * @public API
 */
export function mergePresets(
  base: MiddlewarePreset,
  override: Partial<MiddlewarePreset>,
): MiddlewarePreset {
  const mergedMiddleware = [...base.middleware];

  if (override.middleware) {
    for (const overrideMiddleware of override.middleware) {
      const existingIndex = mergedMiddleware.findIndex(
        (m) => m.name === overrideMiddleware.name,
      );
      if (existingIndex >= 0) {
        mergedMiddleware[existingIndex] = {
          ...mergedMiddleware[existingIndex],
          ...overrideMiddleware,
        };
      } else {
        mergedMiddleware.push(overrideMiddleware);
      }
    }
  }

  return {
    ...base,
    ...override,
    middleware: mergedMiddleware,
    tags: [...(base.tags ?? []), ...(override.tags ?? [])],
  } as MiddlewarePreset;
}
