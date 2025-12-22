import { UseGuards } from "../guard-decorators";
import {
  RequireAuth,
  RequireRole,
  RequirePermission,
  RequireResourceOwner,
} from "../guards";

/**
 * Shorthand decorator for requiring authentication
 * Equivalent to @UseGuards(RequireAuth())
 *
 * @example
 * ```typescript
 * @controller("/api/users")
 * export class UserController {
 *   @Get("/profile")
 *   @RequireAuthentication()
 *   getProfile(@principal() principal: Principal) {
 *     return principal.details;
 *   }
 * }
 * ```
 */
export function RequireAuthentication(): MethodDecorator & ClassDecorator {
  return UseGuards(RequireAuth());
}

/**
 * Shorthand decorator for requiring specific roles
 * Equivalent to @UseGuards(RequireRole(...roles))
 *
 * @example
 * ```typescript
 * @controller("/api/admin")
 * export class AdminController {
 *   @Get("/users")
 *   @RequireRoles("admin")
 *   getUsers() {}
 * }
 * ```
 */
export function RequireRoles(...roles: Array<string>): MethodDecorator & ClassDecorator {
  return UseGuards(RequireRole(...roles));
}

/**
 * Shorthand decorator for requiring specific permissions
 * Equivalent to @UseGuards(RequirePermission(...permissions))
 *
 * @example
 * ```typescript
 * @controller("/api/documents")
 * export class DocumentController {
 *   @Get("/")
 *   @RequirePermissions("documents:read")
 *   listDocuments() {}
 * }
 * ```
 */
export function RequirePermissions(
  ...permissions: Array<string>
): MethodDecorator & ClassDecorator {
  return UseGuards(...permissions.map((p) => RequirePermission(p)));
}

/**
 * Shorthand decorator for requiring resource ownership
 * Equivalent to @UseGuards(RequireResourceOwner(paramName))
 *
 * @example
 * ```typescript
 * @controller("/api/documents")
 * export class DocumentController {
 *   @Delete("/:id")
 *   @RequireOwnership("id")
 *   deleteDocument(@param("id") id: string) {
 *     // Only resource owner can delete
 *   }
 * }
 * ```
 */
export function RequireOwnership(paramName: string = "id"): MethodDecorator {
  return UseGuards(RequireResourceOwner(paramName));
}

