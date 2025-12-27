/**
 * Combined Lifecycle Hooks Example
 *
 * This example demonstrates using both bootstrap and shutdown hooks together.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/combined-lifecycle.example.ts
 * ```
 */

import { IBootstrap, IShutdown, provideSingleton } from "../index";

// Example 1: Database service with both hooks
@provideSingleton(DatabaseService)
export class DatabaseService implements IBootstrap, IShutdown {
  private pool: ConnectionPool | null = null;

  async bootstrap(): Promise<void> {
    console.log("DatabaseService: Bootstrapping...");
    this.pool = await this.createPool();
    await this.pool.connect();
    console.log("DatabaseService: Bootstrapped!");
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`DatabaseService: Shutting down (signal: ${signal})...`);
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
    console.log("DatabaseService: Shut down!");
  }

  private async createPool(): Promise<ConnectionPool> {
    // Simulate pool creation
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      connect: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      },
      close: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };
  }
}

// Example 2: Message queue service
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap, IShutdown {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  async bootstrap(): Promise<void> {
    console.log("MessageQueueService: Bootstrapping...");
    this.connection = await this.connect();
    this.channel = await this.connection.createChannel();
    await this.setupQueues();
    console.log("MessageQueueService: Bootstrapped!");
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`MessageQueueService: Shutting down (signal: ${signal})...`);
    
    if (signal === 'SIGTERM') {
      // Graceful shutdown - finish current messages
      await this.finishCurrentMessages();
    }
    
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    
    console.log("MessageQueueService: Shut down!");
  }

  private async connect(): Promise<Connection> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      createChannel: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          close: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        };
      },
      close: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };
  }

  private async setupQueues(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async finishCurrentMessages(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Example 3: Cache service with warmup and flush
@provideSingleton(CacheService)
export class CacheService implements IBootstrap, IShutdown {
  private cache: Map<string, unknown> = new Map();
  private connected: boolean = false;

  async bootstrap(): Promise<void> {
    console.log("CacheService: Bootstrapping...");
    await this.connect();
    await this.warmCache();
    console.log("CacheService: Bootstrapped!");
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`CacheService: Shutting down (signal: ${signal})...`);
    
    if (signal === 'SIGTERM') {
      // Graceful shutdown - flush to disk
      await this.flushToDisk();
    }
    
    await this.disconnect();
    this.cache.clear();
    console.log("CacheService: Shut down!");
  }

  private async connect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
  }

  private async warmCache(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.cache.set("config", { theme: "dark" });
    this.cache.set("user", { name: "John" });
  }

  private async flushToDisk(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async disconnect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.connected = false;
  }
}

// Example 4: Service with state tracking
@provideSingleton(StatefulService)
export class StatefulService implements IBootstrap, IShutdown {
  private state: 'initializing' | 'ready' | 'shutting-down' = 'initializing';
  private resources: Array<{ id: number; name: string }> = [];

  async bootstrap(): Promise<void> {
    console.log("StatefulService: Bootstrapping...");
    this.state = 'initializing';
    
    // Initialize resources
    await this.initializeResources();
    
    this.state = 'ready';
    console.log("StatefulService: Bootstrapped!");
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`StatefulService: Shutting down (signal: ${signal})...`);
    this.state = 'shutting-down';
    
    // Cleanup resources
    await this.cleanupResources();
    
    this.resources = [];
    console.log("StatefulService: Shut down!");
  }

  private async initializeResources(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.resources.push(
      { id: 1, name: "Resource 1" },
      { id: 2, name: "Resource 2" }
    );
  }

  private async cleanupResources(): Promise<void> {
    await Promise.all(
      this.resources.map(resource => this.cleanupResource(resource.id))
    );
  }

  private async cleanupResource(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  getState(): string {
    return this.state;
  }
}

// Type definitions for examples
interface ConnectionPool {
  connect(): Promise<void>;
  close(): Promise<void>;
}

interface Connection {
  createChannel(): Promise<Channel>;
  close(): Promise<void>;
}

interface Channel {
  close(): Promise<void>;
}

// Example usage
if (require.main === module) {
  console.log("Combined Lifecycle Hooks Examples");
  console.log("==================================");
  console.log("\n1. DatabaseService - Connection pool management");
  console.log("2. MessageQueueService - Queue setup and cleanup");
  console.log("3. CacheService - Cache warmup and flush");
  console.log("4. StatefulService - State tracking");
}

export {
  DatabaseService,
  MessageQueueService,
  CacheService,
  StatefulService
};

