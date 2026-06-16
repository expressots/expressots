import { inject, injectable } from "../di/inversify.js";
import { Logger } from "../provider/logger/logger.provider.js";
import type {
  IInterceptor,
  InterceptorClass,
  ExecutionContext,
  CallHandler,
} from "./interceptor.interface.js";
import {
  isConditionalInterceptor,
  isComposedInterceptor,
} from "./interceptor.interface.js";
import { InterceptorRegistry } from "./interceptor-registry.js";

/**
 * Executor for running interceptors in pipeline order
 *
 * @layer internal
 * @audience framework-developers
 * @concept interceptor-executor
 *
 * @summary Quick Start
 * InterceptorExecutor runs interceptors in a pipeline pattern where each
 * interceptor wraps the next. Lower priority interceptors run first (outermost).
 *
 * **Execution Flow**
 * ```
 * Request → Interceptor1.before → Interceptor2.before → Handler
 *                                                         ↓
 * Response ← Interceptor1.after ← Interceptor2.after ← Result
 * ```
 *
 * @internal
 */
@injectable()
export class InterceptorExecutor {
  constructor(
    @inject(InterceptorRegistry) private registry: InterceptorRegistry,
    @inject(Logger) private logger: Logger,
  ) {}

  /**
   * Execute interceptors in pipeline order
   * @param interceptors - Array of interceptor classes, instances, or conditional/composed
   * @param context - Execution context with request, response, container info
   * @param handler - The actual route handler to execute at the end
   * @returns The (optionally transformed) result
   */
  async execute<T>(
    interceptors: Array<InterceptorClass | IInterceptor | unknown>,
    context: ExecutionContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (interceptors.length === 0) {
      return handler();
    }

    // 1. Flatten and resolve all interceptors (including conditional and composed)
    const resolvedInterceptors = await this.resolveInterceptors(
      interceptors,
      context,
    );

    if (resolvedInterceptors.length === 0) {
      return handler();
    }

    // 2. Sort by priority (lower = earlier = outermost)
    resolvedInterceptors.sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );

    // 3. Build pipeline (reverse order so first interceptor wraps outermost)
    let pipeline: CallHandler<T> = {
      handle: handler,
    };

    // Build from last to first (so first interceptor is outermost)
    for (let i = resolvedInterceptors.length - 1; i >= 0; i--) {
      const interceptor = resolvedInterceptors[i];
      const next = pipeline;

      pipeline = {
        handle: async (): Promise<T> => {
          try {
            return (await interceptor.intercept(context, next)) as T;
          } catch (error) {
            this.logger.error(
              `Interceptor ${interceptor.constructor.name} threw an error: ${error}`,
              "interceptor-executor",
            );
            throw error;
          }
        },
      };
    }

    // 4. Execute pipeline
    return pipeline.handle();
  }

  /**
   * Resolve all interceptors including conditional and composed
   * @private
   */
  private async resolveInterceptors(
    interceptors: Array<InterceptorClass | IInterceptor | unknown>,
    context: ExecutionContext,
  ): Promise<Array<IInterceptor>> {
    const resolved: Array<IInterceptor> = [];

    for (const interceptor of interceptors) {
      // Handle conditional interceptors
      if (isConditionalInterceptor(interceptor)) {
        const shouldRun = await this.evaluateCondition(interceptor, context);
        if (shouldRun) {
          const resolvedInterceptor = this.registry.get(
            interceptor.interceptor as InterceptorClass | IInterceptor,
          );
          resolved.push(resolvedInterceptor);
        }
        continue;
      }

      // Handle composed interceptors
      if (isComposedInterceptor(interceptor)) {
        for (const composedInterceptor of interceptor.interceptors) {
          const resolvedInterceptor = this.registry.get(
            composedInterceptor as InterceptorClass | IInterceptor,
          );
          resolved.push(resolvedInterceptor);
        }
        continue;
      }

      // Handle regular interceptors (class or instance)
      const resolvedInterceptor = this.registry.get(
        interceptor as InterceptorClass | IInterceptor,
      );
      resolved.push(resolvedInterceptor);
    }

    return resolved;
  }

  /**
   * Evaluate conditional interceptor condition
   * @private
   */
  private async evaluateCondition(
    conditional: {
      type: "when" | "unless";
      condition: (ctx: ExecutionContext) => boolean | Promise<boolean>;
    },
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      const result = await conditional.condition(context);
      // "when" = run if true, "unless" = run if false
      return conditional.type === "when" ? result : !result;
    } catch (error) {
      this.logger.error(
        `Conditional interceptor evaluation failed: ${error}`,
        "interceptor-executor",
      );
      // On error, don't run the interceptor (safe default)
      return false;
    }
  }
}
