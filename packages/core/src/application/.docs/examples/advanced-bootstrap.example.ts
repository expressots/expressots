/**
 * @example Advanced Bootstrap
 * @description Production-ready configuration with environment files
 * @runnable true
 */

import { bootstrap, BootstrapOptions } from "../../bootstrap.js";
import { AppExpress } from "@expressots/adapter-express";

class AdvancedApp extends AppExpress {
  protected configureServices(): void {
    // Production services configuration
  }
}

/**
 * Advanced bootstrap with full configuration
 */
async function runExample() {
  console.log("📘 Example: Advanced Bootstrap");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const options: BootstrapOptions = {
    port: 8080,
    appName: "My Production API",
    appVersion: "2.0.0",
    currentEnvironment: process.env.NODE_ENV || "development",
    envFileConfig: {
      files: {
        development: ".env.dev",
        staging: ".env.staging",
        production: ".env.prod",
      },
      required: ["DATABASE_URL", "JWT_SECRET", "API_KEY"],
      autoCreateTemplate: true,
      validateValues: process.env.NODE_ENV === "production",
    },
  };

  const app = await bootstrap(AdvancedApp, options);

  console.log(`✅ App started: ${options.appName} v${options.appVersion}`);
  console.log(`   Port: ${app.port}`);
  console.log(`   Environment: ${options.currentEnvironment}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await app.close();
}

if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample, AdvancedApp };
