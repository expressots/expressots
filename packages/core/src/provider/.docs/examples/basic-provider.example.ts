/**
 * Basic Provider Example
 *
 * This example demonstrates basic provider implementation.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/basic-provider.example.ts
 * ```
 */

import { IProvider, provideSingleton } from "../index";

// Example 1: Basic provider with metadata
@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider {
  readonly name = "Database Provider";
  readonly version = "1.0.0";
  readonly description = "PostgreSQL connection manager";
  readonly author = "ExpressoTS Team";
  readonly repo = "https://github.com/expressots/expressots";
}

// Example 2: Minimal provider
@provideSingleton(SimpleProvider)
export class SimpleProvider implements IProvider {
  readonly name = "Simple Provider";
}

// Example 3: Provider with optional fields
@provideSingleton(ConfigProvider)
export class ConfigProvider implements IProvider {
  readonly name = "Configuration Provider";
  readonly version = "2.0.0";
  readonly description = "Application configuration manager";
}

// Example usage
if (require.main === module) {
  console.log("Basic Provider Examples");
  console.log("=======================");
  console.log("\n1. DatabaseProvider - Full metadata");
  console.log("2. SimpleProvider - Minimal metadata");
  console.log("3. ConfigProvider - Partial metadata");
}

export {
  DatabaseProvider,
  SimpleProvider,
  ConfigProvider
};

