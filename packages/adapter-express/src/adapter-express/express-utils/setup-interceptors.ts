import { interfaces } from "@expressots/core";
import {
  InterceptorRegistry,
  InterceptorExecutor,
  PerformanceInterceptorService,
  PerformanceInterceptor,
  LoggingInterceptor,
  TimeoutInterceptor,
  IInterceptor,
} from "@expressots/core";

/**
 * Type for interceptor classes that can be registered.
 * Accepts any class constructor, including those with DI-injected dependencies.
 * The DI container resolves constructor parameters at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InterceptorClass = new (...args: Array<any>) => IInterceptor;

/**
 * Built-in interceptor types that can be enabled via configuration.
 *
 * @public API
 */
export type BuiltInInterceptor = "performance" | "logging" | "timeout";

/**
 * Configuration options for the interceptor system setup.
 *
 * @public API
 */
export interface InterceptorSystemOptions {
  /**
   * Enable and configure built-in interceptors.
   * Set to true to enable with defaults, or provide configuration object.
   *
   * @example
   * ```typescript
   * {
   *   performance: true,  // Enable with defaults
   *   logging: { logResponse: true },  // Enable with custom config
   *   timeout: { defaultTimeout: 5000 }
   * }
   * ```
   */
  builtIn?: {
    performance?: boolean;
    logging?: boolean;
    timeout?: boolean | { defaultTimeout?: number };
  };

  /**
   * Custom interceptor classes to register.
   * These will be bound as singletons and auto-discovered.
   * Supports classes with DI-injected constructor dependencies.
   *
   * @example
   * ```typescript
   * customInterceptors: [CacheInterceptor, AuditInterceptor]
   * ```
   */
  customInterceptors?: Array<InterceptorClass>;

  /**
   * Auto-discover interceptors from the container.
   * When true, scans the container for @UseInterceptor decorated controllers/methods.
   * @default true
   */
  autoDiscover?: boolean;
}

/**
 * Result of interceptor system setup.
 *
 * @public API
 */
export interface InterceptorSystemSetupResult {
  /**
   * The interceptor registry instance.
   */
  registry: InterceptorRegistry;

  /**
   * The interceptor executor instance.
   */
  executor: InterceptorExecutor;

  /**
   * Number of interceptors registered.
   */
  interceptorsRegistered: number;
}

/**
 * Set up the ExpressoTS Interceptor System with zero boilerplate.
 *
 * This function:
 * 1. Registers all interceptor infrastructure (InterceptorRegistry, InterceptorExecutor)
 * 2. Optionally enables built-in interceptors (Performance, Logging, Timeout)
 * 3. Registers custom interceptor classes
 * 4. Initializes the interceptor registry
 *
 * @param container - The DI container
 * @param options - Configuration options for the interceptor system
 * @returns Setup result with references to interceptor services
 *
 * @example
 * ```typescript
 * export class App extends AppExpress {
 *   async configureServices(): Promise<void> {
 *     // Simple setup with performance interceptor
 *     setupInterceptorsForExpress(this.config.Container, {
 *       builtIn: { performance: true }
 *     });
 *
 *     // Full setup with custom interceptors
 *     setupInterceptorsForExpress(this.config.Container, {
 *       builtIn: {
 *         performance: true,
 *         logging: true,
 *         timeout: { defaultTimeout: 5000 }
 *       },
 *       customInterceptors: [CacheInterceptor, AuditInterceptor]
 *     });
 *   }
 * }
 * ```
 *
 * @public API
 */
export function setupInterceptorsForExpress(
  container: interfaces.Container,
  options: InterceptorSystemOptions = {},
): InterceptorSystemSetupResult {
  // Default options
  const config: InterceptorSystemOptions = {
    autoDiscover: true,
    ...options,
  };

  let interceptorsRegistered = 0;

  // Register InterceptorRegistry (singleton)
  if (!container.isBound(InterceptorRegistry)) {
    container.bind(InterceptorRegistry).toSelf().inSingletonScope();
  }

  // Register InterceptorExecutor (singleton)
  if (!container.isBound(InterceptorExecutor)) {
    container.bind(InterceptorExecutor).toSelf().inSingletonScope();
  }

  // Register PerformanceInterceptorService (needed by PerformanceInterceptor)
  if (!container.isBound(PerformanceInterceptorService)) {
    container.bind(PerformanceInterceptorService).toSelf().inSingletonScope();
  }

  // Register built-in interceptors if enabled
  if (config.builtIn?.performance) {
    if (!container.isBound(PerformanceInterceptor)) {
      container.bind(PerformanceInterceptor).toSelf().inSingletonScope();
      interceptorsRegistered++;
    }
  }

  if (config.builtIn?.logging) {
    if (!container.isBound(LoggingInterceptor)) {
      container.bind(LoggingInterceptor).toSelf().inSingletonScope();
      interceptorsRegistered++;
    }
  }

  if (config.builtIn?.timeout) {
    if (!container.isBound(TimeoutInterceptor)) {
      container.bind(TimeoutInterceptor).toSelf().inSingletonScope();
      interceptorsRegistered++;
    }
  }

  // Register custom interceptors
  if (config.customInterceptors && config.customInterceptors.length > 0) {
    for (const interceptorClass of config.customInterceptors) {
      if (!container.isBound(interceptorClass)) {
        container.bind(interceptorClass).toSelf().inSingletonScope();
        interceptorsRegistered++;
      }
    }
  }

  // Get instances
  const registry = container.get(InterceptorRegistry);
  const executor = container.get(InterceptorExecutor);

  // Initialize registry (auto-discovers interceptors from container bindings)
  if (config.autoDiscover) {
    registry.initialize();
    // Update count from registry
    interceptorsRegistered = registry.getAll().length;
  }

  return {
    registry,
    executor,
    interceptorsRegistered,
  };
}

