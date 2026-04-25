import "reflect-metadata";
import { inject, injectable, Container, interfaces } from "../di/inversify.js";
import { Logger } from "../provider/logger/logger.provider.js";
import { INTERCEPTOR_METADATA_KEY } from "./interceptor-constants.js";
import type {
  IInterceptor,
  InterceptorClass,
  InterceptorMetadata,
} from "./interceptor.interface.js";

/**
 * Registry for auto-discovering and resolving interceptors
 *
 * @layer public
 * @audience framework-developers
 * @concept interceptor-registry
 *
 * @summary Quick Start
 * InterceptorRegistry manages interceptor discovery, registration, and resolution.
 * It automatically discovers interceptors decorated with @Interceptor() and
 * resolves them from the DI container.
 *
 * @example
 * ```typescript
 * // Get interceptor instance
 * const interceptor = registry.get(LoggingInterceptor);
 *
 * // Get all registered interceptors
 * const allInterceptors = registry.getAll();
 * ```
 *
 * @internal
 */
@injectable()
export class InterceptorRegistry {
  private interceptors: Map<NewableFunction | IInterceptor, IInterceptor> =
    new Map();
  private initialized = false;

  constructor(
    @inject(Container) private container: Container,
    @inject(Logger) private logger: Logger,
  ) {}

  /**
   * Initialize registry by discovering all @Interceptor() decorated classes
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Get all registered interceptors from metadata
    const registeredInterceptors =
      (Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.interceptor,
        Reflect,
      ) as Array<InterceptorMetadata>) || [];

    for (const metadata of registeredInterceptors) {
      try {
        // Try to resolve from container
        const serviceId =
          metadata.interceptor as unknown as interfaces.ServiceIdentifier<IInterceptor>;
        if (this.container.isBound(serviceId)) {
          const instance = this.container.get<IInterceptor>(serviceId);
          // Set priority from metadata if not defined on instance
          if (instance.priority === undefined) {
            instance.priority = metadata.priority;
          }
          this.interceptors.set(metadata.interceptor, instance);
          this.logger.debug(
            `Registered interceptor: ${metadata.interceptor.name} (priority: ${instance.priority})`,
            "interceptor-registry",
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to resolve interceptor ${metadata.interceptor.name}: ${error}`,
          "interceptor-registry",
        );
      }
    }

    this.initialized = true;
    this.logger.debug(
      `InterceptorRegistry initialized with ${this.interceptors.size} interceptors`,
      "interceptor-registry",
    );
  }

  /**
   * Get an interceptor instance from registry or container
   * @param interceptor - Interceptor class or instance
   * @returns Resolved interceptor instance
   */
  get(interceptor: InterceptorClass | IInterceptor): IInterceptor {
    // If already an instance, return it
    if (typeof interceptor !== "function") {
      return interceptor;
    }

    // Check if already in registry
    if (this.interceptors.has(interceptor)) {
      return this.interceptors.get(interceptor)!;
    }

    // Try to resolve from container
    try {
      const serviceId =
        interceptor as unknown as interfaces.ServiceIdentifier<IInterceptor>;
      if (this.container.isBound(serviceId)) {
        const instance = this.container.get<IInterceptor>(serviceId);
        this.interceptors.set(interceptor, instance);
        return instance;
      }
    } catch (error) {
      this.logger.debug(
        `Interceptor ${interceptor.name} not bound, creating new instance`,
        "interceptor-registry",
      );
    }

    // Create new instance (for interceptors not in container)
    try {
      const instance = new interceptor();
      this.interceptors.set(interceptor, instance);
      return instance;
    } catch (error) {
      this.logger.error(
        `Failed to create interceptor instance ${interceptor.name}: ${error}`,
        "interceptor-registry",
      );
      throw new Error(`Cannot resolve interceptor: ${interceptor.name}`);
    }
  }

  /**
   * Get all registered interceptors sorted by priority
   * @returns Array of interceptors sorted by priority
   */
  getAll(): Array<IInterceptor> {
    return Array.from(this.interceptors.values()).sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
  }

  /**
   * Register an interceptor instance manually
   * @param key - Interceptor class or identifier
   * @param instance - Interceptor instance
   */
  register(key: NewableFunction | IInterceptor, instance: IInterceptor): void {
    this.interceptors.set(key, instance);
  }

  /**
   * Check if an interceptor is registered
   * @param interceptor - Interceptor class or instance
   * @returns True if registered
   */
  has(interceptor: InterceptorClass | IInterceptor): boolean {
    if (typeof interceptor !== "function") {
      return true; // Instances are always "available"
    }
    return (
      this.interceptors.has(interceptor) ||
      this.container.isBound(interceptor as interfaces.ServiceIdentifier)
    );
  }

  /**
   * Clear all registered interceptors (for testing)
   */
  clear(): void {
    this.interceptors.clear();
    this.initialized = false;
  }
}
