/**
 * In-Memory Database Provider for ExpressoTS
 *
 * The main provider that integrates the in-memory database
 * with the ExpressoTS framework, including health checks,
 * metrics, and lifecycle management.
 *
 * @module db-in-memory
 */

import { provideSingleton } from "../../decorator/scope-binding";
import {
  IProvider,
  IHealthCheck,
  IMetrics,
  HealthCheckResult,
  ProviderMetrics,
} from "../provider.interface";
import { IBootstrap, IShutdown } from "../../lifecycle/lifecycle.interface";
import { IEntity } from "./schema/entity.interface";
import {
  InMemoryDatabase,
  InMemoryDatabaseOptions,
  InMemoryAdapter,
} from "./adapter";

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY DATABASE PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for InMemoryDBProvider.
 * @public API
 */
export interface InMemoryDBConfig extends InMemoryDatabaseOptions {
  /** Log database operations (default: false) */
  logging?: boolean;
  /** Maximum number of records per table (0 = unlimited) */
  maxRecordsPerTable?: number;
}

/**
 * In-Memory Database Provider for ExpressoTS.
 *
 * A high-performance, Prisma-compatible in-memory database
 * that integrates seamlessly with the ExpressoTS framework.
 *
 * Features:
 * - Prisma-like query API
 * - Secondary indexes for O(1) lookups
 * - Automatic ID generation
 * - Timestamps (createdAt, updatedAt)
 * - Soft deletes
 * - Transactions with rollback
 * - Relation support (HasMany, HasOne, BelongsTo)
 * - Reactive subscriptions
 * - Persistence (file-based)
 * - Health checks
 * - Metrics collection
 *
 * @example
 * ```typescript
 * // Inject the provider
 * constructor(@inject(InMemoryDBProvider) private db: InMemoryDBProvider) {}
 *
 * // Access tables
 * const users = this.db.table<User>("users");
 *
 * // Prisma-like queries
 * const user = await users.create({
 *   data: { name: "John", email: "john@example.com" }
 * });
 *
 * const adults = await users.findMany({
 *   where: { age: { gte: 18 } },
 *   orderBy: { name: "asc" },
 *   take: 10
 * });
 * ```
 *
 * @public API
 */
@provideSingleton(InMemoryDBProvider, "builtin")
export class InMemoryDBProvider
  implements IProvider, IHealthCheck, IMetrics, IBootstrap, IShutdown
{
  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  readonly name = "In-Memory Database Provider";
  readonly version = "4.0.0";
  readonly description =
    "High-performance, Prisma-compatible in-memory database for ExpressoTS";
  readonly author = "ExpressoTS Team";
  readonly repo = "https://github.com/expressots/expressots";

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNALS
  // ═══════════════════════════════════════════════════════════════════════════

  private database: InMemoryDatabase;
  private config: InMemoryDBConfig;
  private queryCount = 0;
  private totalQueryTime = 0;
  private startTime?: Date;

  constructor(config: InMemoryDBConfig = {}) {
    this.config = {
      timestamps: true,
      softDelete: false,
      logging: false,
      maxRecordsPerTable: 0,
      ...config,
    };

    this.database = new InMemoryDatabase(this.config);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configure the in-memory database provider.
   *
   * Call this method in `configureServices()` to globally configure the database
   * before the application starts. Configuration changes that affect the database
   * structure (timestamps, softDelete, persist) will reinitialize the database.
   *
   * @param config - Partial configuration to merge with defaults
   *
   * @example
   * ```typescript
   * // In app.ts configureServices()
   * async configureServices(): Promise<void> {
   *   const db = this.Provider.get(InMemoryDBProvider);
   *   db.configure({
   *     timestamps: true,
   *     softDelete: true,
   *     logging: true,
   *     persist: {
   *       storage: "file",
   *       path: "./data/db.json",
   *       interval: 30000, // auto-save every 30 seconds
   *     },
   *   });
   * }
   * ```
   * @public API
   */
  configure(config: Partial<InMemoryDBConfig>): void {
    const previousConfig = { ...this.config };

    // Merge new config with existing
    this.config = {
      ...this.config,
      ...config,
    };

    // Check if we need to reinitialize the database
    // (structural changes require a new database instance)
    const structuralChange =
      (config.timestamps !== undefined &&
        config.timestamps !== previousConfig.timestamps) ||
      (config.softDelete !== undefined &&
        config.softDelete !== previousConfig.softDelete) ||
      config.persist !== undefined;

    if (structuralChange) {
      // Preserve existing data if possible
      const snapshot = this.database.snapshot();

      // Create new database with updated config
      this.database = new InMemoryDatabase(this.config);

      // Restore data if there was any
      if (snapshot && snapshot !== "{}") {
        try {
          this.database.restore(snapshot);
        } catch {
          // If restore fails, start fresh (schema might have changed)
          if (this.config.logging) {
            console.log(
              "[InMemoryDB] Could not restore data after config change, starting fresh",
            );
          }
        }
      }

      if (this.config.logging) {
        console.log(
          "[InMemoryDB] Database reinitialized with new configuration",
        );
      }
    }

    if (this.config.logging) {
      console.log("[InMemoryDB] Configuration updated:", this.config);
    }
  }

  /**
   * Get the current configuration.
   * @returns Current database configuration
   * @public API
   */
  getConfig(): Readonly<InMemoryDBConfig> {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bootstrap the database provider.
   * Called after the application is fully ready.
   */
  async bootstrap(): Promise<void> {
    this.startTime = new Date();

    // Load persisted data if configured
    if (this.config.persist) {
      await this.database.load();
    }

    if (this.config.logging) {
      console.log(
        `[InMemoryDB] Provider initialized at ${this.startTime.toISOString()}`,
      );
    }
  }

  /**
   * Shutdown the database provider.
   * Called when the application shuts down.
   */
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    if (this.config.logging) {
      console.log(`[InMemoryDB] Shutting down (signal: ${signal})`);
    }

    this.database.shutdown();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Perform a health check on the database.
   * @returns Health check result
   */
  healthCheck(): HealthCheckResult {
    const stats = this.database.getStats();

    return {
      status: "healthy",
      message: `${stats.tableCount} tables, ${stats.totalRecords} total records`,
      details: {
        tables: stats.tableCount,
        records: stats.totalRecords,
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get database metrics.
   * @returns Metrics object
   */
  getMetrics(): ProviderMetrics {
    const stats = this.database.getStats();

    const metrics: ProviderMetrics = {
      "db.tables": stats.tableCount,
      "db.records.total": stats.totalRecords,
      "db.queries.total": this.queryCount,
      "db.queries.avgMs":
        this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
    };

    // Add per-table metrics
    for (const table of stats.tables) {
      metrics[`db.table.${table.tableName}.records`] = table.recordCount;
      metrics[`db.table.${table.tableName}.memory`] = table.memoryEstimate;
    }

    return metrics;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get or create a table adapter.
   *
   * @param tableName - Name of the table
   * @param entityClass - Optional entity class for schema metadata
   * @returns Table adapter with Prisma-like API
   *
   * @example
   * ```typescript
   * interface User extends IEntity {
   *   name: string;
   *   email: string;
   *   age: number;
   * }
   *
   * const users = db.table<User>("users");
   *
   * // Create
   * const user = await users.create({
   *   data: { name: "John", email: "john@example.com", age: 30 }
   * });
   *
   * // Find with complex filters
   * const results = await users.findMany({
   *   where: {
   *     OR: [
   *       { name: { contains: "John" } },
   *       { age: { gte: 25 } }
   *     ]
   *   },
   *   orderBy: { createdAt: "desc" },
   *   take: 10
   * });
   * ```
   */
  table<T extends IEntity>(
    tableName: string,
    entityClass?: new (...args: Array<unknown>) => unknown,
  ): InMemoryAdapter<T> {
    return this.database.table<T>(tableName, entityClass);
  }

  /**
   * Execute operations in a transaction.
   *
   * @param fn - Transaction function
   * @returns Result of the transaction function
   *
   * @example
   * ```typescript
   * await db.transaction(async (tx) => {
   *   const user = await tx.table<User>("users").create({
   *     data: { name: "John", email: "john@example.com" }
   *   });
   *
   *   await tx.table<Post>("posts").create({
   *     data: { title: "Hello", authorId: user.id }
   *   });
   * });
   * ```
   */
  async transaction<R>(fn: (db: InMemoryDatabase) => Promise<R>): Promise<R> {
    return this.database.transaction(fn);
  }

  /**
   * Create a snapshot of all data.
   * @returns JSON string of all data
   */
  snapshot(): string {
    return this.database.snapshot();
  }

  /**
   * Restore data from a snapshot.
   * @param json - JSON string of snapshot data
   */
  restore(json: string): void {
    this.database.restore(json);
  }

  /**
   * Clear all tables.
   */
  clear(): void {
    this.database.clear();
  }

  /**
   * Get database statistics.
   * @returns Statistics for all tables
   */
  getStats(): {
    tableCount: number;
    totalRecords: number;
    tables: Array<{
      tableName: string;
      recordCount: number;
      indexes: Array<{ field: string; size: number; unique: boolean }>;
      memoryEstimate: number;
    }>;
  } {
    return this.database.getStats();
  }

  /**
   * Get the underlying database instance.
   * @returns InMemoryDatabase instance
   */
  getDatabase(): InMemoryDatabase {
    return this.database;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORY BASE CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base Repository class for the new adapter pattern.
 *
 * Provides a convenient base class for creating repositories
 * that work with the in-memory database.
 *
 * @example
 * ```typescript
 * @provide(UserRepository)
 * export class UserRepository extends BaseRepository<User> {
 *   constructor(@inject(InMemoryDBProvider) db: InMemoryDBProvider) {
 *     super(db, "users");
 *   }
 *
 *   // Add custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.adapter.findFirst({
 *       where: { email }
 *     });
 *   }
 * }
 * ```
 *
 * @public API
 */
export abstract class BaseRepository<T extends IEntity> {
  protected adapter: InMemoryAdapter<T>;
  protected tableName: string;

  constructor(
    db: InMemoryDBProvider,
    tableName: string,
    entityClass?: new (...args: Array<unknown>) => unknown,
  ) {
    this.tableName = tableName;
    this.adapter = db.table<T>(tableName, entityClass);
  }

  // Delegate all methods to the adapter

  async findUnique(
    args: Parameters<InMemoryAdapter<T>["findUnique"]>[0],
  ): Promise<T | null> {
    return this.adapter.findUnique(args);
  }

  async findFirst(
    args?: Parameters<InMemoryAdapter<T>["findFirst"]>[0],
  ): Promise<T | null> {
    return this.adapter.findFirst(args);
  }

  async findMany(
    args?: Parameters<InMemoryAdapter<T>["findMany"]>[0],
  ): Promise<Array<T>> {
    return this.adapter.findMany(args);
  }

  async create(args: Parameters<InMemoryAdapter<T>["create"]>[0]): Promise<T> {
    return this.adapter.create(args);
  }

  async createMany(
    args: Parameters<InMemoryAdapter<T>["createMany"]>[0],
  ): Promise<{ count: number }> {
    return this.adapter.createMany(args);
  }

  async update(args: Parameters<InMemoryAdapter<T>["update"]>[0]): Promise<T> {
    return this.adapter.update(args);
  }

  async updateMany(
    args: Parameters<InMemoryAdapter<T>["updateMany"]>[0],
  ): Promise<{ count: number }> {
    return this.adapter.updateMany(args);
  }

  async upsert(args: Parameters<InMemoryAdapter<T>["upsert"]>[0]): Promise<T> {
    return this.adapter.upsert(args);
  }

  async delete(args: Parameters<InMemoryAdapter<T>["delete"]>[0]): Promise<T> {
    return this.adapter.delete(args);
  }

  async deleteMany(
    args?: Parameters<InMemoryAdapter<T>["deleteMany"]>[0],
  ): Promise<{ count: number }> {
    return this.adapter.deleteMany(args);
  }

  async count(
    args?: Parameters<InMemoryAdapter<T>["count"]>[0],
  ): Promise<number> {
    return this.adapter.count(args);
  }

  async aggregate(
    args: Parameters<InMemoryAdapter<T>["aggregate"]>[0],
  ): Promise<ReturnType<InMemoryAdapter<T>["aggregate"]>> {
    return this.adapter.aggregate(args);
  }

  async transaction<R>(fn: (tx: InMemoryAdapter<T>) => Promise<R>): Promise<R> {
    return this.adapter.transaction(fn as (tx: unknown) => Promise<R>);
  }
}
