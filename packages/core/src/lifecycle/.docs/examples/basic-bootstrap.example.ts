/**
 * Basic Bootstrap Hook Example
 *
 * This example demonstrates basic bootstrap hook usage.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/basic-bootstrap.example.ts
 * ```
 */

import { IBootstrap, provideSingleton } from "../index";

// Example 1: Simple bootstrap hook
@provideSingleton(DatabaseService)
export class DatabaseService implements IBootstrap {
  private connected: boolean = false;

  async bootstrap(): Promise<void> {
    console.log("DatabaseService: Connecting to database...");
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
    console.log("DatabaseService: Connected!");
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Example 2: Bootstrap with initialization
@provideSingleton(CacheService)
export class CacheService implements IBootstrap {
  private cache: Map<string, unknown> = new Map();

  async bootstrap(): Promise<void> {
    console.log("CacheService: Warming cache...");
    // Simulate cache warming
    await this.warmCache();
    console.log("CacheService: Cache warmed!");
  }

  private async warmCache(): Promise<void> {
    // Simulate loading data into cache
    await new Promise(resolve => setTimeout(resolve, 50));
    this.cache.set("config", { theme: "dark" });
    this.cache.set("user", { name: "John" });
  }

  get(key: string): unknown {
    return this.cache.get(key);
  }
}

// Example 3: Bootstrap with multiple steps
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap {
  private connected: boolean = false;
  private subscribed: boolean = false;

  async bootstrap(): Promise<void> {
    console.log("MessageQueueService: Initializing...");
    
    // Multiple initialization steps
    await this.connect();
    await this.subscribe();
    await this.loadConfiguration();
    
    console.log("MessageQueueService: Initialized!");
  }

  private async connect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.connected = true;
  }

  private async subscribe(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.subscribed = true;
  }

  private async loadConfiguration(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  isReady(): boolean {
    return this.connected && this.subscribed;
  }
}

// Example 4: Bootstrap with error handling
@provideSingleton(ExternalService)
export class ExternalService implements IBootstrap {
  async bootstrap(): Promise<void> {
    try {
      console.log("ExternalService: Connecting...");
      await this.connect();
      console.log("ExternalService: Connected!");
    } catch (error) {
      console.error("ExternalService: Connection failed:", error);
      // Re-throw to fail bootstrap
      throw error;
    }
  }

  private async connect(): Promise<void> {
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate potential failure
    if (Math.random() > 0.5) {
      throw new Error("Connection failed");
    }
  }
}

// Example usage
if (require.main === module) {
  console.log("Bootstrap Hook Examples");
  console.log("======================");
  console.log("\n1. DatabaseService - Simple connection");
  console.log("2. CacheService - Cache warming");
  console.log("3. MessageQueueService - Multi-step initialization");
  console.log("4. ExternalService - Error handling");
}

export {
  DatabaseService,
  CacheService,
  MessageQueueService,
  ExternalService
};

