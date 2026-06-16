/**
 * Basic Shutdown Hook Example
 *
 * This example demonstrates basic shutdown hook usage.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/basic-shutdown.example.ts
 * ```
 */

import { IShutdown, provideSingleton } from "../index";

// Example 1: Simple shutdown hook
@provideSingleton(DatabaseService)
export class DatabaseService implements IShutdown {
  private connections: number = 0;

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`DatabaseService: Shutting down (signal: ${signal})...`);
    // Simulate closing connections
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.connections = 0;
    console.log("DatabaseService: Shut down!");
  }
}

// Example 2: Signal-based shutdown
@provideSingleton(CacheService)
export class CacheService implements IShutdown {
  private cache: Map<string, unknown> = new Map();

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`CacheService: Shutting down (signal: ${signal})...`);

    if (signal === "SIGTERM") {
      // Graceful shutdown - flush cache
      console.log("CacheService: Flushing cache...");
      await this.flushCache();
    } else {
      // Immediate shutdown - just close
      console.log("CacheService: Immediate shutdown");
    }

    await this.disconnect();
    console.log("CacheService: Shut down!");
  }

  private async flushCache(): Promise<void> {
    // Simulate flushing cache to disk
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.cache.clear();
  }

  private async disconnect(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Example 3: Shutdown with cleanup
@provideSingleton(FileService)
export class FileService implements IShutdown {
  private fileHandles: Array<{ id: number; name: string }> = [];

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`FileService: Shutting down (signal: ${signal})...`);

    // Close all file handles
    await Promise.all(
      this.fileHandles.map((handle) => this.closeHandle(handle.id)),
    );

    this.fileHandles = [];
    console.log("FileService: All handles closed!");
  }

  private async closeHandle(id: number): Promise<void> {
    // Simulate closing file handle
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  openFile(name: string): number {
    const id = Math.random();
    this.fileHandles.push({ id, name });
    return id;
  }
}

// Example 4: Shutdown with error handling
@provideSingleton(ExternalService)
export class ExternalService implements IShutdown {
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    try {
      console.log(`ExternalService: Shutting down (signal: ${signal})...`);
      await this.cleanup();
      console.log("ExternalService: Shut down!");
    } catch (error) {
      // Log but don't throw - error-tolerant
      console.error("ExternalService: Cleanup failed:", error);
    }
  }

  private async cleanup(): Promise<void> {
    // Simulate cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate potential failure
    if (Math.random() > 0.5) {
      throw new Error("Cleanup failed");
    }
  }
}

// Example 5: Shutdown with timeout
@provideSingleton(NetworkService)
export class NetworkService implements IShutdown {
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    console.log(`NetworkService: Shutting down (signal: ${signal})...`);

    // Shutdown with timeout
    await Promise.race([
      this.disconnect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 1000),
      ),
    ]).catch((error) => {
      console.error("NetworkService: Shutdown timeout:", error);
    });

    console.log("NetworkService: Shut down!");
  }

  private async disconnect(): Promise<void> {
    // Simulate slow disconnection
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

// Example usage
if (require.main === module) {
  console.log("Shutdown Hook Examples");
  console.log("======================");
  console.log("\n1. DatabaseService - Simple shutdown");
  console.log("2. CacheService - Signal-based shutdown");
  console.log("3. FileService - Resource cleanup");
  console.log("4. ExternalService - Error handling");
  console.log("5. NetworkService - Timeout handling");
}

export {
  DatabaseService,
  CacheService,
  FileService,
  ExternalService,
  NetworkService,
};
