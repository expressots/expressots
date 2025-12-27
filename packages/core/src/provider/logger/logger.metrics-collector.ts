import { interfaces } from "../../di/inversify";
import {
  ApplicationMetrics,
  FeaturesStatus,
  detectFeaturesStatus,
} from "./logger.metrics";
import { METADATA_KEY } from "../../di/binding-decorator/constants";
import { GuardRegistry } from "../../authorization/guard-registry";
import { ExceptionFilterRegistry } from "../../error/exception-filter-registry";

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

    const metrics: ApplicationMetrics = {
      controllers: controllerCount,
      providers: providerCount,
      middleware: middlewareCount,
      guards: guardsCount,
      filters: filtersCount,
      routes: routeCount,
      bootstrapProviders: bootstrapCount > 0 ? bootstrapCount : undefined,
      shutdownProviders: shutdownCount > 0 ? shutdownCount : undefined,
    };

    const features: FeaturesStatus = detectFeaturesStatus({
      hasContentNegotiation: options.hasContentNegotiation(),
      hasSmartValidation: options.hasSmartValidation(),
      hasAuthorization: options.hasAuthorization(),
      hasExceptionFilters: options.hasExceptionFilters(),
      hasLifecycleHooks: bootstrapCount > 0 || shutdownCount > 0,
      hasCustomScopes: false, // TODO: Detect custom scopes
      hasApiVersioning: options.hasApiVersioning?.() ?? false,
      hasGlobalRoutePrefix: options.hasGlobalRoutePrefix?.() ?? false,
      hasErrorHandler: options.hasErrorHandler?.() ?? false,
      hasRequestLogging: options.hasRequestLogging?.() ?? false,
    });

    return { metrics, features };
  }
}
