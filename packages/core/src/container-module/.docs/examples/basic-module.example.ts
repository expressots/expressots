/**
 * @example Basic Module Creation
 * @description Simple module creation from controllers
 * @runnable true
 */

import { CreateModule } from "../../container-module";

// Example controller classes
class UserController {}
class AuthController {}

/**
 * Example: Create module from controllers
 */
export function runExample() {
  console.log("📘 Example: Basic Module Creation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const module = CreateModule([UserController, AuthController]);

  console.log("✅ Module created successfully");
  console.log(`   Controllers: ${module.constructor.name}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, UserController, AuthController };
