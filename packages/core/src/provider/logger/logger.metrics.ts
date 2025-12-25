/**
 * Application metrics for banner display.
 * @public API
 */
export interface ApplicationMetrics {
  /** Number of controllers loaded */
  controllers: number;
  /** Number of providers registered */
  providers: number;
  /** Number of middleware active */
  middleware: number;
  /** Number of guards active */
  guards: number;
  /** Number of exception filters active */
  filters: number;
  /** Number of routes registered */
  routes: number;
  /** Number of bootstrap providers */
  bootstrapProviders?: number;
  /** Number of shutdown providers */
  shutdownProviders?: number;
}

/**
 * Framework features status.
 * @public API
 */
export interface FeaturesStatus {
  /** Content Negotiation enabled */
  contentNegotiation: boolean;
  /** Smart Validation enabled */
  smartValidation: boolean;
  /** Authorization (Guards) enabled */
  authorization: boolean;
  /** Exception Filters enabled */
  exceptionFilters: boolean;
  /** Graceful Shutdown enabled */
  gracefulShutdown: boolean;
  /** Lifecycle Hooks enabled */
  lifecycleHooks: boolean;
  /** Custom Scopes enabled */
  customScopes: boolean;
}

/**
 * Performance metrics for startup.
 * @public API
 */
export interface StartupMetrics {
  /** Startup time in milliseconds */
  startupTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Memory usage formatted (e.g., "45MB") */
  memoryUsageFormatted: string;
}

/**
 * Banner configuration.
 * @public API
 */
export interface BannerConfig {
  /** Banner style: 'full', 'compact', 'minimal', 'none' */
  style?: "full" | "compact" | "minimal" | "none";
  /** Show application metrics */
  showMetrics?: boolean;
  /** Show framework features status */
  showFeatures?: boolean;
  /** Show configuration info */
  showConfig?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  /** Show system health status */
  showHealth?: boolean;
  /** Show resources/links */
  showResources?: boolean;
  /** Custom ASCII art file path */
  customArt?: string;
  /** Environment-specific configuration */
  environment?: {
    /** Banner settings for development */
    development?: Partial<Omit<BannerConfig, "environment">>;
    /** Banner settings for production */
    production?: Partial<Omit<BannerConfig, "environment">>;
  };
  /** Only show banner in specific environments */
  showInEnvironments?: Array<"development" | "production" | "staging" | "test">;
  /** Suppress all logs until banner is displayed */
  suppressLogsUntilBanner?: boolean;
}

/**
 * Get default banner configuration.
 * @param environment - Current environment
 * @returns Default banner config
 * @public API
 */
export function getDefaultBannerConfig(
  environment?: string,
): Required<Omit<BannerConfig, "environment" | "customArt">> {
  const isDev = environment === "development" || !environment;

  return {
    style: isDev ? "full" : "compact",
    showMetrics: true,
    showFeatures: isDev,
    showConfig: isDev,
    showPerformance: true,
    showHealth: true,
    showResources: isDev,
    showInEnvironments: ["development", "production", "staging", "test"],
    suppressLogsUntilBanner: true,
  };
}

/**
 * Merge banner configuration with environment-specific overrides.
 * @param config - User config
 * @param environment - Current environment
 * @returns Merged configuration
 * @public API
 */
export function resolveBannerConfig(
  config: BannerConfig | undefined,
  environment: string,
): BannerConfig {
  const defaults = getDefaultBannerConfig(environment);
  const baseConfig = { ...defaults, ...config };

  // Apply environment-specific overrides
  if (config?.environment) {
    const envConfig =
      environment === "production"
        ? config.environment.production
        : config.environment.development;

    if (envConfig) {
      return { ...baseConfig, ...envConfig };
    }
  }

  return baseConfig;
}

/**
 * Detect framework features status.
 * @param options - Feature detection options
 * @returns Features status
 * @public API
 */
export function detectFeaturesStatus(options?: {
  hasContentNegotiation?: boolean;
  hasSmartValidation?: boolean;
  hasAuthorization?: boolean;
  hasExceptionFilters?: boolean;
  hasGracefulShutdown?: boolean;
  hasLifecycleHooks?: boolean;
  hasCustomScopes?: boolean;
}): FeaturesStatus {
  return {
    contentNegotiation: options?.hasContentNegotiation ?? false,
    smartValidation: options?.hasSmartValidation ?? false,
    authorization: options?.hasAuthorization ?? false,
    exceptionFilters: options?.hasExceptionFilters ?? false,
    gracefulShutdown: options?.hasGracefulShutdown ?? true, // Always enabled
    lifecycleHooks: options?.hasLifecycleHooks ?? false,
    customScopes: options?.hasCustomScopes ?? false,
  };
}

/**
 * Format memory usage.
 * @param bytes - Memory in bytes
 * @returns Formatted string (e.g., "45MB")
 * @public API
 */
export function formatMemory(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
