import "reflect-metadata";
import { inject, injectable, Container, interfaces } from "../di/inversify.js";
import { Logger } from "../provider/logger/logger.provider.js";
import type { IGuard, GuardClass, GuardMetadata } from "./guard.interface.js";
import { GUARD_METADATA_KEY } from "./guard-constants.js";

/**
 * Registry for managing guards with automatic discovery
 * Similar to ExceptionFilterRegistry
 */
@injectable()
export class GuardRegistry {
  private guards = new Map<GuardClass, IGuard>();
  private initialized = false;

  constructor(
    @inject(Container) private container: interfaces.Container,
    @inject(Logger) private logger: Logger,
  ) {}

  /**
   * Initialize the registry by auto-discovering all guards decorated with @Guard
   * This should be called after the container is fully configured
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Get all guards registered via @Guard decorator
      const guardMetadata =
        (Reflect.getMetadata(
          GUARD_METADATA_KEY.guard,
          Reflect,
        ) as Array<GuardMetadata>) || [];

      guardMetadata.forEach(({ guard, priority, cacheable }) => {
        try {
          // Try to get guard from container (if @provide() decorated)
          let guardInstance: IGuard;

          if (this.container.isBound(guard)) {
            guardInstance = this.container.get<IGuard>(guard);
          } else {
            // Try to create instance manually if not in container
            // Some guards require constructor arguments (RoleGuard, PermissionGuard, etc.)
            // Only register guards that can be instantiated without arguments
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              guardInstance = new (guard as any)();
              // Try to inject common dependencies
              this.injectDependencies(guardInstance);
            } catch (constructorError) {
              // Guard requires constructor arguments - skip auto-registration
              // These guards will be instantiated dynamically via factory functions
              // (RequireAuth(), RequireRole(), etc.) when used in @UseGuards()
              // Silently skip - this is expected behavior for guards with constructor args
              return; // Skip this guard
            }
          }

          // Set metadata
          guardInstance.priority = priority;
          guardInstance.cacheable = cacheable;

          this.guards.set(guard as GuardClass, guardInstance);
        } catch (error) {
          this.logger.warn(
            `Failed to register guard ${guard.name}: ${error}`,
            "guard-registry",
          );
        }
      });

      this.initialized = true;
    } catch (error) {
      this.logger.error(
        `Failed to initialize guard registry: ${error}`,
        "guard-registry",
      );
    }
  }

  /**
   * Get guard instance (from registry or create new)
   * @param guard - Guard class or instance
   * @returns Guard instance
   */
  get(guard: GuardClass | IGuard): IGuard {
    if (typeof guard === "function") {
      // Try registry first
      const registered = this.guards.get(guard);
      if (registered) {
        return registered;
      }

      // Try container
      if (this.container.isBound(guard)) {
        return this.container.get<IGuard>(guard);
      }

      // Create new instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new (guard as any)();
      this.injectDependencies(instance);
      return instance;
    }

    // Already an instance
    return guard;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Inject common dependencies into guard instance
   * @private
   */
  private injectDependencies(
    instance: IGuard & { logger?: Logger; report?: unknown },
  ): void {
    // Inject common dependencies if available
    if (this.container.isBound(Logger)) {
      instance.logger = this.container.get(Logger);
    }
    if (this.container.isBound("Report")) {
      instance.report = this.container.get("Report");
    }
  }
}
