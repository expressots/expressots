import { inject, injectable } from "../di/inversify";
import { Logger } from "../provider/logger/logger.provider";
import type { IGuard, GuardClass, GuardContext } from "./guard.interface";
import { GuardResult } from "./guard.interface";
import { GuardRegistry } from "./guard-registry";
import type { IGuardCache } from "./services/guard-cache.interface";

/**
 * Executor for running guards in priority order with caching support
 */
@injectable()
export class GuardExecutor {
  constructor(
    @inject(GuardRegistry) private registry: GuardRegistry,
    @inject("IGuardCache") private cache: IGuardCache,
    @inject(Logger) private logger: Logger,
  ) {}

  /**
   * Execute guards in priority order with caching support
   * @param guards - Array of guard classes or instances
   * @param context - Guard context with request, principal, container, and scope
   * @returns GuardResult indicating if access is allowed
   */
  async execute(
    guards: Array<GuardClass | IGuard>,
    context: GuardContext,
  ): Promise<GuardResult> {
    if (guards.length === 0) {
      return GuardResult.allow();
    }

    // 1. Resolve guards and sort by priority
    const resolvedGuards = guards
      .map((g) => this.registry.get(g))
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    // 2. Execute guards sequentially
    for (const guard of resolvedGuards) {
      try {
        // Check cache if cacheable
        if (guard.cacheable) {
          const cacheKey = guard.cacheKey
            ? guard.cacheKey(context)
            : this.defaultCacheKey(guard, context);
          const cached = this.cache.get(context.scope.request, cacheKey);
          if (cached !== null) {
            if (!cached.allowed) {
              return cached;
            }
            continue; // Allow, check next guard
          }
        }

        // Execute guard
        const result = await guard.canActivate(context);
        const guardResult =
          result instanceof GuardResult
            ? result
            : result
              ? GuardResult.allow()
              : GuardResult.deny();

        // Cache result if cacheable and allowed
        if (guard.cacheable && guardResult.allowed) {
          const cacheKey = guard.cacheKey
            ? guard.cacheKey(context)
            : this.defaultCacheKey(guard, context);
          this.cache.set(context.scope.request, cacheKey, guardResult);
        }

        // Early exit on deny
        if (!guardResult.allowed) {
          return guardResult;
        }
      } catch (error) {
        this.logger.error(
          `Guard ${guard.constructor.name} threw an error: ${error}`,
          "guard-executor",
        );
        // On error, deny access for security
        return GuardResult.deny();
      }
    }

    return GuardResult.allow();
  }

  /**
   * Generate default cache key for guard
   * @private
   */
  private defaultCacheKey(guard: IGuard, context: GuardContext): string {
    return `${guard.constructor.name}:${context.route.method}:${context.route.path}`;
  }
}

