import { Request, Response, NextFunction } from "express";
import {
  inject,
  injectable,
  Container,
  interfaces,
  ContextManager,
  findFlowTracker,
  InterceptorExecutor,
  createExecutionContext,
} from "@expressots/core";
import type { InterceptorClass, IInterceptor } from "@expressots/core";
import { INTERCEPTOR_METADATA_KEY } from "@expressots/core";
import "reflect-metadata";

/**
 * Express middleware that executes interceptors around route handler
 *
 * @layer internal
 * @audience framework-developers
 *
 * @summary Quick Start
 * InterceptorMiddleware integrates the interceptor system with Express.
 * It wraps the route handler with interceptors defined via @UseInterceptors().
 *
 * @internal
 */
@injectable()
export class InterceptorMiddleware {
  constructor(
    @inject(InterceptorExecutor) private executor: InterceptorExecutor,
    @inject(Container) private container: Container,
  ) {}

  /**
   * Create middleware for a specific controller and method
   * @param controllerClass - Controller class
   * @param methodName - Method name
   * @param handler - Original route handler
   */
  createMiddleware(
    controllerClass: NewableFunction,
    methodName: string | symbol,
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Get request ID for flow tracking
      const requestContext = ContextManager.getCurrentContext();
      const requestId = requestContext?.requestId;
      const flowTracker = requestId ? findFlowTracker(requestId) : undefined;

      // Extract interceptors from metadata
      const interceptors = this.extractInterceptors(controllerClass, methodName);

      if (interceptors.length === 0) {
        // No interceptors, proceed directly
        return handler(req, res, next)
          .then(() => {})
          .catch(next);
      }

      // Get interceptor names for tracking
      const interceptorNames = interceptors.map((i) => {
        if (typeof i === "function") {
          return i.name || "UnknownInterceptor";
        }
        return i.constructor.name;
      });
      const interceptorStepName = `Interceptors: ${interceptorNames.join(", ")}`;

      // Start tracking interceptor execution (using "middleware" type as interceptors are part of request pipeline)
      if (flowTracker?.isEnabled()) {
        flowTracker.startStep("middleware", interceptorStepName, {
          interceptorCount: interceptors.length,
          interceptorNames,
        });
      }

      try {
        // Create execution context
        const context = createExecutionContext(
          req,
          res,
          this.container,
          controllerClass,
          String(methodName),
        );

        // Execute interceptors with handler
        const result = await this.executor.execute(interceptors, context, async () => {
          // This is the actual handler execution
          const handlerResult = await handler(req, res, next);
          return handlerResult;
        });

        // End interceptor step with success
        if (flowTracker?.isEnabled()) {
          flowTracker.endStep("success");
        }

        // If handler hasn't sent response and we have a result, set it
        if (!res.headersSent && result !== undefined) {
          // Store result for response handling
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsInterceptorResult = result;
        }
      } catch (error) {
        // End interceptor step with failure
        if (flowTracker?.isEnabled()) {
          flowTracker.failStep(error instanceof Error ? error : undefined);
        }
        next(error);
      }
    };
  }

  /**
   * Extract interceptors from controller and method metadata
   * @private
   */
  private extractInterceptors(
    controllerClass: NewableFunction,
    methodName: string | symbol,
  ): Array<InterceptorClass | IInterceptor | unknown> {
    // Get controller-level interceptors
    const controllerInterceptors =
      (Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.controllerInterceptors,
        controllerClass,
      ) as Array<InterceptorClass | IInterceptor | unknown>) || [];

    // Get method-level interceptors
    const methodInterceptors =
      (Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.methodInterceptors,
        controllerClass,
        methodName,
      ) as Array<InterceptorClass | IInterceptor | unknown>) || [];

    // Combine: controller + method level
    return [...controllerInterceptors, ...methodInterceptors];
  }
}

/**
 * Factory function to create interceptor middleware
 * @param container - DI container
 * @param controllerClass - Controller class
 * @param methodName - Method name
 * @param handler - Original handler
 */
export function createInterceptorMiddleware(
  container: interfaces.Container | Container,
  controllerClass: NewableFunction,
  methodName: string | symbol,
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const middleware = container.get<InterceptorMiddleware>(InterceptorMiddleware);
  return middleware.createMiddleware(controllerClass, methodName, handler);
}
