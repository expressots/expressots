import { Request, Response, NextFunction } from "express";
import { inject } from "@expressots/core";
import { BaseMiddleware } from "./base-middleware.js";
import type { ISecurityContext } from "@expressots/core";
import type { HttpContext } from "./interfaces.js";

/**
 * Middleware that preloads permissions for authenticated users
 * Caches permissions in request-scoped SecurityContext
 */
export class PermissionPreloaderMiddleware extends BaseMiddleware {
  @inject("ISecurityContext")
  private securityContext?: ISecurityContext;

  async handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get HttpContext
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const httpContext = (req as any).__expressotsHttpContext as HttpContext;

      if (!httpContext) {
        return next();
      }

      const principal = httpContext.user;

      // Preload permissions if user is authenticated
      if (principal && (await principal.isAuthenticated())) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (principal.details as any)?.id as string;
        if (userId && this.securityContext) {
          await this.securityContext.preload(userId);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}
