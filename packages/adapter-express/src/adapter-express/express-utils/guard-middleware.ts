import { Request, Response, NextFunction } from "express";
import { inject, injectable, Container, ContextManager, findFlowTracker } from "@expressots/core";
import type { GuardClass, IGuard } from "@expressots/core";
import { GuardExecutor } from "@expressots/core";
import { GuardContextFactory } from "./guard-context-factory.js";
import { AppError } from "@expressots/core";

/**
 * Express middleware that executes guards before route handler
 */
@injectable()
export class GuardMiddleware {
  constructor(
    @inject(GuardExecutor) private executor: GuardExecutor,
    @inject(GuardContextFactory) private contextFactory: GuardContextFactory,
    @inject(Container) private container: Container,
  ) {}

  /**
   * Express middleware function
   */
  execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get request ID for flow tracking
    const requestContext = ContextManager.getCurrentContext();
    const requestId = requestContext?.requestId;
    const flowTracker = requestId ? findFlowTracker(requestId) : undefined;

    // Extract guards from route metadata (controller + method level)
    const guards = this.extractGuards(req);

    if (guards.length === 0) {
      return next(); // No guards, proceed
    }

    // Start tracking guard execution
    const guardNames = guards.map((g) => {
      if (typeof g === "function") {
        return g.name || "UnknownGuard";
      }
      return g.constructor.name;
    });
    const guardStepName = `Guards: ${guardNames.join(", ")}`;

    if (flowTracker?.isEnabled()) {
      flowTracker.startStep("guard", guardStepName, {
        guardCount: guards.length,
        guardNames,
      });
    }

    try {
      // Create guard context
      const context = await this.contextFactory.create(req, res);

      // Execute guards
      const result = await this.executor.execute(guards, context);

      if (!result.allowed) {
        // End guard step with failure
        if (flowTracker?.isEnabled()) {
          flowTracker.failStep(result.error);
        }
        // Throw error to be caught by exception handler
        throw result.error || AppError.forbidden("Access denied");
      }

      // End guard step with success
      if (flowTracker?.isEnabled()) {
        flowTracker.endStep("success");
      }

      next();
    } catch (error) {
      // Store error on request for flow tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).__expressotsFlowError =
        error instanceof Error ? error : new Error(String(error));

      // End guard step with failure if not already ended
      if (flowTracker?.isEnabled()) {
        const currentFlow = flowTracker.getFlow();
        const lastStep = currentFlow.steps[currentFlow.steps.length - 1];
        if (lastStep && lastStep.name === guardStepName && lastStep.status === "success") {
          // Step was already ended, don't end again
        } else {
          flowTracker.failStep(error instanceof Error ? error : undefined);
        }
      }
      next(error);
    }
  };

  /**
   * Extract guards from request metadata
   * @private
   */
  private extractGuards(req: Request): Array<GuardClass | IGuard> {
    // Extract from request metadata (set during route registration)
    const reqWithGuards = req as Request & {
      __expressotsControllerGuards?: Array<GuardClass | IGuard>;
      __expressotsMethodGuards?: Array<GuardClass | IGuard>;
    };
    const controllerGuards = reqWithGuards.__expressotsControllerGuards || [];
    const methodGuards = reqWithGuards.__expressotsMethodGuards || [];
    return [...controllerGuards, ...methodGuards];
  }
}
