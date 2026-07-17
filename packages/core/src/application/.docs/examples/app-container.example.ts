/**
 * @example AppContainer Usage
 * @description Dependency injection container setup
 * @runnable true
 */

import { AppContainer } from "../../application-container.js";
import { ContainerModule } from "inversify";
import { Scope } from "../../../index.js";

// Example module
class ExampleModule extends ContainerModule {
  constructor() {
    super((bind) => {
      // Example binding
      bind("ExampleService").toConstantValue({
        name: "Example Service",
        version: "1.0.0",
      });
    });
  }
}

/**
 * Example: Basic container setup
 */
async function runExample() {
  console.log("📘 Example: AppContainer Basic Usage");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Create container with default options
  const container = new AppContainer();

  // Create and load modules
  container.create([new ExampleModule()]);

  console.log("✅ Container created and modules loaded");

  // View bindings (for demonstration)
  console.log("\n📊 Container Bindings:");
  container.getFormattedBindingsView();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

/**
 * Example: Container with custom scope
 */
async function runSingletonExample() {
  console.log("\n📘 Example: AppContainer with Singleton Scope");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const container = new AppContainer({
    defaultScope: Scope.Singleton,
  });

  container.create([new ExampleModule()]);

  const options = container.getContainerOptions();
  console.log(`✅ Container created with scope: ${options.defaultScope}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample()
    .then(() => runSingletonExample())
    .catch(console.error);
}

export { runExample, runSingletonExample, ExampleModule };
