/**
 * @example Basic Guard
 * @description Simple guard implementation
 * @runnable true
 */

import { Guard } from "../../guard-decorators";
import type { IGuard, GuardContext } from "../../guard.interface";
import { GuardResult } from "../../guard.interface";

/**
 * Simple guard that always allows access
 */
@Guard()
export class BasicGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    console.log(`Guard executed for: ${context.route.path}`);
    return GuardResult.allow();
  }
}

/**
 * Example usage
 */
export function runExample() {
  console.log("📘 Example: Basic Guard");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Basic guard created successfully");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, BasicGuard };
