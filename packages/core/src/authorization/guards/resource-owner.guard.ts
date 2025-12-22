import { Guard } from "../guard-decorators";
import { injectable } from "../../di/inversify";
import type { IGuard, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";
import { AppError } from "../../error/app-error";

/**
 * Guard that requires resource ownership
 * Checks if principal owns the resource specified by route parameter
 *
 * @example
 * ```typescript
 * @controller("/api/documents")
 * export class DocumentController {
 *   @Delete("/:id")
 *   @UseGuards(ResourceOwnerGuard("id"))
 *   deleteDocument(@param("id") id: string) {
 *     // Only resource owner can delete
 *   }
 * }
 * ```
 * Note: Guards are instantiated dynamically by GuardRegistry, not via DI
 */
@Guard({ priority: 30 })
@injectable()
export class ResourceOwnerGuard implements IGuard {
  constructor(private resourceIdParam: string = "id") {}

  async canActivate(context: GuardContext): Promise<GuardResult> {
    const resourceId = context.route.params[this.resourceIdParam];

    if (!resourceId) {
      return GuardResult.deny(
        AppError.badRequest(`Resource ID parameter '${this.resourceIdParam}' is required`),
      );
    }

    const isOwner = await context.principal.isResourceOwner(resourceId);

    if (!isOwner) {
      return GuardResult.deny(AppError.forbidden("Not resource owner"));
    }

    return GuardResult.allow();
  }
}

/**
 * Factory function for convenience
 * @param paramName - Route parameter name containing resource ID (default: "id")
 */
export const RequireResourceOwner = (paramName: string = "id"): ResourceOwnerGuard =>
  new ResourceOwnerGuard(paramName);

