/**
 * @example Authenticated Guard
 * @description Guard that checks authentication
 * @runnable true
 */

import {
  Guard,
  IGuard,
  GuardContext,
  GuardResult,
} from "../../guard.interface";
import { AppError } from "../../../error/app-error";

/**
 * Guard that requires authentication
 */
@Guard({ priority: 1 })
export class AuthenticatedGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const isAuthenticated = await context.principal.isAuthenticated();

    if (!isAuthenticated) {
      return GuardResult.deny(AppError.unauthorized("Authentication required"));
    }

    return GuardResult.allow();
  }
}

/**
 * Example usage
 */
export function runExample() {
  console.log("📘 Example: Authenticated Guard");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Authenticated guard created");
  console.log("   Priority: 1 (runs first)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, AuthenticatedGuard };
