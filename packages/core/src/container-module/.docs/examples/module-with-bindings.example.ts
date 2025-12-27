/**
 * @example Module with Custom Bindings
 * @description Create module with controllers and custom service bindings
 * @runnable true
 */

import { CreateModule } from "../../container-module";
import { BindingScopeEnum } from "inversify";

// Example classes
class UserController {}
interface ILogger {
  log(message: string): void;
}
class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }
}

/**
 * Example: Module with custom bindings
 */
export function runExample() {
  console.log("📘 Example: Module with Custom Bindings");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const module = CreateModule([UserController], (bind) => {
    bind<ILogger>("ILogger")
      .to(ConsoleLogger)
      .inSingletonScope();
  });

  console.log("✅ Module created with custom bindings");
  console.log("   - UserController registered");
  console.log("   - ILogger → ConsoleLogger (Singleton)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, UserController, ILogger, ConsoleLogger };

