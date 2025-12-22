import { Request, Response, NextFunction } from "express";
import { inject, injectable, Container } from "@expressots/core";
import type { GuardClass, IGuard } from "@expressots/core";
import { GuardExecutor } from "@expressots/core";
import { GuardContextFactory } from "./guard-context-factory";
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
    try {
      // Extract guards from route metadata (controller + method level)
      const guards = this.extractGuards(req);

      if (guards.length === 0) {
        return next(); // No guards, proceed
      }

      // Create guard context
      const context = await this.contextFactory.create(req, res);

      // Execute guards
      const result = await this.executor.execute(guards, context);

      if (!result.allowed) {
        // Throw error to be caught by exception handler
        throw result.error || AppError.forbidden("Access denied");
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Extract guards from request metadata
   * @private
   */
  private extractGuards(req: Request): Array<GuardClass | IGuard> {
    // Extract from request metadata (set during route registration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controllerGuards = ((req as any).__expressotsControllerGuards as Array<
      GuardClass | IGuard
    >) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methodGuards = ((req as any).__expressotsMethodGuards as Array<
      GuardClass | IGuard
    >) || [];
    return [...controllerGuards, ...methodGuards];
  }
}

