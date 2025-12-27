/**
 * @example AppFactory Usage
 * @description Direct instantiation of application (advanced usage)
 * @runnable true
 */

import { AppFactory } from "../../application-factory";
import { AppExpress } from "@expressots/adapter-express";

class ExampleApp extends AppExpress {
  protected configureServices(): void {
    // Application configuration
  }
}

/**
 * Example: Direct AppFactory usage
 *
 * Note: Typically you should use bootstrap() instead.
 * This example shows direct usage for advanced scenarios.
 */
async function runExample() {
  console.log("📘 Example: AppFactory Direct Usage");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Create app instance
  const app = await AppFactory.create(ExampleApp);

  console.log("✅ App instance created successfully");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Note: You would typically call app.listen() here
  // but for this example we'll just demonstrate creation
}

if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample, ExampleApp };
