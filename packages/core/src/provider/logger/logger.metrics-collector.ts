import { interfaces } from "../../di/inversify.js";
import {
  ApplicationMetrics,
  FeaturesStatus,
  detectFeaturesStatus,
} from "./logger.metrics.js";
import { METADATA_KEY } from "../../di/binding-decorator/constants.js";
import { GuardRegistry } from "../../authorization/guard-registry.js";
import { ExceptionFilterRegistry } from "../../error/exception-filter-registry.js";
import { InterceptorRegistry } from "../../interceptor/interceptor-registry.js";
import { EventRegistry } from "../../event/event-registry.js";
import { LazyModuleLoader } from "../../lazy-loading/lazy-module-loader.js";
import { INTERCEPTOR_METADATA_KEY } from "../../interceptor/interceptor-constants.js";
import { EVENT_METADATA } from "../../event/event.interfaces.js";

/**
 * Collect application metrics from container and metadata.
 * @public API
 */
export class MetricsCollector {
  /**
   * Collect metrics from the application.
   * @param container - InversifyJS container
   * @param options - Collection options
   * @returns Application metrics and features status
   */
  static collect(
    container: interfaces.Container,
    options: {
      getControllersFromMetadata: () => Array<unknown>;
      getControllersFromContainer: () => Array<unknown>;
      getControllerMethodMetadata: (
        constructor: NewableFunction,
      ) => Array<{ method: string; path: string }> | undefined;
      getMiddlewareCount: () => number;
      hasContentNegotiation: () => boolean;
      hasSmartValidation: () => boolean;
      hasAuthorization: () => boolean;
      hasExceptionFilters: () => boolean;
      hasApiVersioning?: () => boolean;
      hasGlobalRoutePrefix?: () => boolean;
      hasErrorHandler?: () => boolean;
      hasRequestLogging?: () => boolean;
      hasEnhancedConfiguration?: () => boolean;
      /**
       * Optional. The adapter (or app) can pass a probe that returns true
       * when the application has registered scopes outside of Inversify's
       * built-in `Singleton` / `Transient` / `Request` (e.g. tenant scope).
       *
       * When omitted, `customScopes` is reported as `false` — accurate by
       * default for vanilla apps.
       */
      hasCustomScopes?: () => boolean;
    },
  ): {
    metrics: ApplicationMetrics;
    features: FeaturesStatus;
  } {
    // Count controllers
    const controllers = options.getControllersFromMetadata();
    const controllerCount = controllers.length;

    // Count routes by iterating through controllers
    let routeCount = 0;
    try {
      const controllerInstances = options.getControllersFromContainer();
      controllerInstances.forEach((controller) => {
        const constructor = (controller as { constructor: NewableFunction })
          .constructor;
        const methods = options.getControllerMethodMetadata(constructor);
        if (methods) {
          routeCount += methods.length;
        }
      });
    } catch {
      // Fallback: estimate routes (assume 4 routes per controller on average)
      routeCount = controllerCount * 4;
    }

    // Count providers from metadata
    const provideMetadata =
      Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
    const providerCount = provideMetadata.length;

    // Count bootstrap/shutdown providers
    let bootstrapCount = 0;
    let shutdownCount = 0;
    provideMetadata.forEach(
      (metadata: { implementationType: NewableFunction }) => {
        const target = metadata.implementationType;
        if (target?.prototype) {
          if (typeof target.prototype.bootstrap === "function") {
            bootstrapCount++;
          }
          if (typeof target.prototype.shutdown === "function") {
            shutdownCount++;
          }
        }
      },
    );

    // Count middleware
    const middlewareCount = options.getMiddlewareCount();

    // Count guards (check if GuardRegistry is bound)
    let guardsCount = 0;
    try {
      if (container.isBound(GuardRegistry)) {
        // GuardRegistry doesn't expose count, so we check metadata
        const guardMetadata = Reflect.getMetadata("guard", Reflect) || [];
        guardsCount = guardMetadata.length;
      }
    } catch {
      // Guards not available
    }

    // Count exception filters (check if ExceptionFilterRegistry is bound)
    let filtersCount = 0;
    try {
      if (container.isBound(ExceptionFilterRegistry)) {
        // ExceptionFilterRegistry doesn't expose count, so we check metadata
        const filterMetadata =
          Reflect.getMetadata("exception-filter", Reflect) || [];
        filtersCount = filterMetadata.length;
      }
    } catch {
      // Filters not available
    }

    // Count interceptors (check metadata and registry)
    let interceptorsCount = 0;
    let hasInterceptors = false;
    try {
      // Check metadata for registered interceptors
      const interceptorMetadata =
        Reflect.getMetadata(INTERCEPTOR_METADATA_KEY.interceptor, Reflect) ||
        [];
      interceptorsCount = interceptorMetadata.length;
      hasInterceptors = interceptorsCount > 0;

      // Also check if InterceptorRegistry is bound and has interceptors
      if (!hasInterceptors && container.isBound(InterceptorRegistry)) {
        const registry = container.get(InterceptorRegistry);
        const allInterceptors = registry.getAll();
        interceptorsCount = allInterceptors.length;
        hasInterceptors = interceptorsCount > 0;
      }
    } catch {
      // Interceptors not available
    }

    // Count event handlers (check EventRegistry)
    let eventHandlersCount = 0;
    let hasEventSystem = false;
    try {
      if (container.isBound(EventRegistry)) {
        const registry = container.get(EventRegistry);
        const handlers = registry.getHandlerClasses();
        eventHandlersCount = handlers.length;
        hasEventSystem = eventHandlersCount > 0;
      } else {
        // Fallback: check metadata for event handlers
        const provideMetadataForEvents =
          Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
        provideMetadataForEvents.forEach(
          (metadata: { implementationType: NewableFunction }) => {
            const target = metadata.implementationType;
            if (target) {
              const isHandler = Reflect.getMetadata(
                EVENT_METADATA.IS_EVENT_HANDLER,
                target,
              );
              if (isHandler) {
                eventHandlersCount++;
                hasEventSystem = true;
              }
            }
          },
        );
      }
    } catch {
      // Event system not available
    }

    // Count lazy modules (check LazyModuleLoader)
    let lazyModulesCount = 0;
    let hasLazyLoading = false;
    try {
      if (container.isBound(LazyModuleLoader)) {
        const loader = container.get(LazyModuleLoader);
        const allModules = loader.getAll();
        lazyModulesCount = allModules.length;
        hasLazyLoading = lazyModulesCount > 0;
      }
    } catch {
      // Lazy loading not available
    }

    // Detect enhanced configuration
    const hasEnhancedConfiguration =
      options.hasEnhancedConfiguration?.() ?? false;

    const metrics: ApplicationMetrics = {
      controllers: controllerCount,
      providers: providerCount,
      middleware: middlewareCount,
      guards: guardsCount,
      filters: filtersCount,
      routes: routeCount,
      bootstrapProviders: bootstrapCount > 0 ? bootstrapCount : undefined,
      shutdownProviders: shutdownCount > 0 ? shutdownCount : undefined,
      interceptors: interceptorsCount > 0 ? interceptorsCount : undefined,
      eventHandlers: eventHandlersCount > 0 ? eventHandlersCount : undefined,
      lazyModules: lazyModulesCount > 0 ? lazyModulesCount : undefined,
    };

    const features: FeaturesStatus = detectFeaturesStatus({
      hasContentNegotiation: options.hasContentNegotiation(),
      hasSmartValidation: options.hasSmartValidation(),
      hasAuthorization: options.hasAuthorization(),
      hasExceptionFilters: options.hasExceptionFilters(),
      hasLifecycleHooks: bootstrapCount > 0 || shutdownCount > 0,
      hasCustomScopes: options.hasCustomScopes?.() ?? false,
      hasApiVersioning: options.hasApiVersioning?.() ?? false,
      hasGlobalRoutePrefix: options.hasGlobalRoutePrefix?.() ?? false,
      hasErrorHandler: options.hasErrorHandler?.() ?? false,
      hasRequestLogging: options.hasRequestLogging?.() ?? false,
      hasInterceptors,
      hasEventSystem,
      hasLazyLoading,
      hasEnhancedConfiguration,
    });

    return { metrics, features };
  }
}
