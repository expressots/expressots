import { Guard } from "../guard-decorators.js";
import { injectable } from "../../di/inversify.js";
import type { IGuard, GuardContext } from "../guard.interface.js";
import { GuardResult } from "../guard.interface.js";
import { AppError } from "../../error/app-error.js";

/**
 * Attribute set for ABAC (Attribute-Based Access Control)
 */
export interface AttributeSet {
  user: {
    id: string;
    roles: Array<string>;
    department?: string;
    [key: string]: unknown;
  };
  resource: {
    id: string;
    type: string;
    owner?: string;
    [key: string]: unknown;
  };
  environment: {
    time: Date;
    ip: string;
    tenant?: string;
    [key: string]: unknown;
  };
}

/**
 * Guard that uses ABAC (Attribute-Based Access Control)
 * Evaluates policy based on user, resource, and environment attributes
 *
 * @example
 * ```typescript
 * @controller("/api/resources")
 * export class ResourceController {
 *   @Get("/:id")
 *   @UseGuards(
 *     RequireAuth(),
 *     RequirePolicy((attrs) => {
 *       return attrs.user.roles.includes("admin") ||
 *              attrs.resource.owner === attrs.user.id;
 *     })
 *   )
 *   getResource(@param("id") id: string) {}
 * }
 * ```
 */
/**
 * Note: Guards are instantiated dynamically by GuardRegistry, not via DI
 */
@Guard({ priority: 25 })
@injectable()
export class AttributeBasedGuard implements IGuard {
  constructor(
    private policy: (attributes: AttributeSet) => boolean | Promise<boolean>,
  ) {
    if (!policy || typeof policy !== "function") {
      throw new Error("AttributeBasedGuard requires a policy function");
    }
  }

  async canActivate(context: GuardContext): Promise<GuardResult> {
    const userDetails = context.principal.details as
      | { id?: string; department?: string }
      | null
      | undefined;
    // Get resource ID from route params or query params
    const resourceId = context.route.params.id || context.route.query.id || "";
    const attributes: AttributeSet = {
      user: {
        id: userDetails?.id || "anonymous",
        roles: await this.getUserRoles(context),
        department: userDetails?.department,
      },
      resource: {
        id: String(resourceId),
        type: context.route.controller,
        owner: await this.getResourceOwner(context),
      },
      environment: {
        time: new Date(),
        ip: context.request.ip || "unknown",
        tenant: context.scope.tenant,
      },
    };

    try {
      const allowed = await this.policy(attributes);

      return allowed
        ? GuardResult.allow()
        : GuardResult.deny(AppError.forbidden("Policy evaluation failed"));
    } catch (error) {
      return GuardResult.deny(
        AppError.forbidden(`Policy evaluation error: ${error}`),
      );
    }
  }

  private async getUserRoles(context: GuardContext): Promise<Array<string>> {
    // Extract roles from principal
    // This is a simplified implementation - in practice, you'd load from database
    const roles: Array<string> = [];
    for (const role of ["admin", "moderator", "user"]) {
      if (await context.principal.isInRole(role)) {
        roles.push(role);
      }
    }
    return roles;
  }

  private async getResourceOwner(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: GuardContext,
  ): Promise<string | undefined> {
    // Extract resource owner from context
    // This is a simplified implementation - in practice, you'd load from database
    // Future implementation would use: context.route.params.id, context.container, etc.
    return undefined;
  }
}

/**
 * Factory function for convenience
 * @param policy - Policy function that evaluates attributes
 */
export const RequirePolicy = (
  policy: (attributes: AttributeSet) => boolean | Promise<boolean>,
): AttributeBasedGuard => new AttributeBasedGuard(policy);
