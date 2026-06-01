/**
 * In-Memory Adapter for ExpressoTS
 *
 * High-performance in-memory implementation of IDataAdapter
 * with Prisma-compatible API.
 *
 * @module db-in-memory/adapter
 */

import { IEntity } from "../schema/entity.interface.js";
import { SchemaRegistry, RelationMetadata } from "../schema/decorators.js";
import { nodeRequire } from "../../../utils/node-require.js";
import {
  MemoryStore,
  MemoryStoreOptions,
  EntityNotFoundError,
} from "../storage/memory-store.js";
import { QueryEngine } from "../query/query-engine.js";
import {
  FindUniqueArgs,
  FindFirstArgs,
  FindManyArgs,
  CreateArgs,
  CreateManyArgs,
  UpdateArgs,
  UpdateManyArgs,
  UpsertArgs,
  DeleteArgs,
  DeleteManyArgs,
  CountArgs,
  AggregateArgs,
  AggregateResult,
  BatchPayload,
  GroupByArgs,
  WhereInput,
  IncludeInput,
} from "../query/query.types.js";
import {
  IDataAdapter,
  ITableAdapter,
  IReactiveDataAdapter,
  ISubscription,
  ChangeEvent,
  ChangeType,
} from "./adapter.interface.js";

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for InMemoryAdapter.
 * @public API
 */
export interface InMemoryAdapterOptions extends MemoryStoreOptions {
  /** Database reference for relation resolution */
  database?: InMemoryDatabase;
}

/**
 * High-performance in-memory implementation of IDataAdapter.
 *
 * Features:
 * - Prisma-compatible query API
 * - Secondary indexes for O(1) lookups
 * - Automatic ID generation
 * - Timestamps (createdAt, updatedAt)
 * - Soft deletes
 * - Transactions with rollback
 * - Relation support
 * - Reactive subscriptions
 *
 * @example
 * ```typescript
 * const userAdapter = new InMemoryAdapter<User>("users");
 *
 * // Create
 * const user = await userAdapter.create({
 *   data: { name: "John", email: "john@example.com" }
 * });
 *
 * // Find with filters
 * const adults = await userAdapter.findMany({
 *   where: { age: { gte: 18 } },
 *   orderBy: { name: "asc" }
 * });
 * ```
 *
 * @public API
 */
export class InMemoryAdapter<T extends IEntity>
  implements ITableAdapter<T>, IReactiveDataAdapter<T>
{
  readonly tableName: string;
  private store: MemoryStore<T>;
  private queryEngine: QueryEngine<T>;
  private database?: InMemoryDatabase;
  private entityClass?: new (...args: Array<unknown>) => unknown;
  private subscribers: Array<(event: ChangeEvent<T>) => void> = [];
  private typeSubscribers = new Map<
    ChangeType,
    Array<(event: ChangeEvent<T>) => void>
  >();

  constructor(tableName: string, options: InMemoryAdapterOptions = {}) {
    this.tableName = tableName;
    this.database = options.database;
    this.entityClass = options.entityClass;
    this.store = new MemoryStore<T>(tableName, options);
    this.queryEngine = new QueryEngine<T>(this.store);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async findUnique(args: FindUniqueArgs<T>): Promise<T | null> {
    const { where, include } = args;

    // Try to find by ID first (fastest)
    if (where.id) {
      const entity = this.store.findById(where.id);
      if (entity) {
        return this.resolveIncludes(entity, include);
      }
      return null;
    }

    // Find by other unique fields
    const whereInput = where as WhereInput<T>;
    const entities = this.queryEngine.executeWhere(whereInput);
    const entity = entities[0] || null;

    if (entity && include) {
      return this.resolveIncludes(entity, include);
    }

    return entity;
  }

  async findUniqueOrThrow(args: FindUniqueArgs<T>): Promise<T> {
    const result = await this.findUnique(args);
    if (!result) {
      throw new EntityNotFoundError(
        this.tableName,
        args.where.id || JSON.stringify(args.where),
      );
    }
    return result;
  }

  async findFirst(args?: FindFirstArgs<T>): Promise<T | null> {
    if (!args) {
      const all = this.store.findAll();
      return all[0] || null;
    }

    const { where, orderBy, skip, include } = args;

    let entities = this.queryEngine.executeWhere(where);
    entities = this.queryEngine.executeOrderBy(entities, orderBy);
    entities = this.queryEngine.executePagination(entities, skip, 1);

    const entity = entities[0] || null;

    if (entity && include) {
      return this.resolveIncludes(entity, include);
    }

    return entity;
  }

  async findFirstOrThrow(args?: FindFirstArgs<T>): Promise<T> {
    const result = await this.findFirst(args);
    if (!result) {
      throw new EntityNotFoundError(this.tableName, "first match");
    }
    return result;
  }

  async findMany(args?: FindManyArgs<T>): Promise<Array<T>> {
    const entities = this.queryEngine.executeFindMany(args);

    if (args?.include) {
      return Promise.all(
        entities.map((entity) => this.resolveIncludes(entity, args.include)),
      );
    }

    return entities;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async create(args: CreateArgs<T>): Promise<T> {
    const entity = this.store.insert(args.data as Partial<T>);
    this.emit({ type: "create", data: entity, timestamp: new Date() });

    if (args.include) {
      return this.resolveIncludes(entity, args.include);
    }

    return entity;
  }

  async createMany(args: CreateManyArgs<T>): Promise<BatchPayload> {
    const entities = this.store.insertMany(
      args.data as Array<Partial<T>>,
      args.skipDuplicates,
    );

    for (const entity of entities) {
      this.emit({ type: "create", data: entity, timestamp: new Date() });
    }

    return { count: entities.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async update(args: UpdateArgs<T>): Promise<T> {
    const existing = await this.findUnique({ where: args.where });
    if (!existing) {
      throw new EntityNotFoundError(
        this.tableName,
        args.where.id || JSON.stringify(args.where),
      );
    }

    const updated = this.store.update(existing.id!, args.data as Partial<T>);
    this.emit({
      type: "update",
      data: updated,
      previousData: existing,
      timestamp: new Date(),
    });

    if (args.include) {
      return this.resolveIncludes(updated, args.include);
    }

    return updated;
  }

  async updateMany(args: UpdateManyArgs<T>): Promise<BatchPayload> {
    const entities = this.queryEngine.executeWhere(args.where);
    let count = 0;

    for (const entity of entities) {
      const updated = this.store.update(entity.id!, args.data as Partial<T>);
      this.emit({
        type: "update",
        data: updated,
        previousData: entity,
        timestamp: new Date(),
      });
      count++;
    }

    return { count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPSERT OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async upsert(args: UpsertArgs<T>): Promise<T> {
    const existing = await this.findUnique({ where: args.where });

    if (existing) {
      return this.update({
        where: args.where,
        data: args.update,
        select: args.select,
        include: args.include,
      });
    }

    return this.create({
      data: args.create,
      select: args.select,
      include: args.include,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async delete(args: DeleteArgs<T>): Promise<T> {
    const existing = await this.findUnique({ where: args.where });
    if (!existing) {
      throw new EntityNotFoundError(
        this.tableName,
        args.where.id || JSON.stringify(args.where),
      );
    }

    const deleted = this.store.delete(existing.id!);
    this.emit({
      type: "delete",
      previousData: deleted,
      timestamp: new Date(),
    });

    return deleted;
  }

  async deleteMany(args?: DeleteManyArgs<T>): Promise<BatchPayload> {
    if (!args?.where) {
      const count = this.store.count();
      const all = this.store.findAll();

      for (const entity of all) {
        this.emit({
          type: "delete",
          previousData: entity,
          timestamp: new Date(),
        });
      }

      this.store.clear();
      return { count };
    }

    const entities = this.queryEngine.executeWhere(args.where);
    let count = 0;

    for (const entity of entities) {
      this.store.delete(entity.id!);
      this.emit({
        type: "delete",
        previousData: entity,
        timestamp: new Date(),
      });
      count++;
    }

    return { count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNT & AGGREGATE
  // ═══════════════════════════════════════════════════════════════════════════

  async count(args?: CountArgs<T>): Promise<number> {
    if (!args) {
      return this.store.count();
    }

    const entities = this.queryEngine.executeWhere(args.where);
    return this.queryEngine.executePagination(entities, args.skip, args.take)
      .length;
  }

  async aggregate(args: AggregateArgs<T>): Promise<AggregateResult<T>> {
    return this.queryEngine.executeAggregate(args);
  }

  async groupBy(
    args: GroupByArgs<T>,
  ): Promise<Array<Partial<T> & AggregateResult<T>>> {
    let entities = this.queryEngine.executeWhere(args.where);
    entities = this.queryEngine.executeOrderBy(entities, args.orderBy);
    entities = this.queryEngine.executePagination(
      entities,
      args.skip,
      args.take,
    );

    // Group by specified fields
    const groups = new Map<string, Array<T>>();

    for (const entity of entities) {
      const key = args.by
        .map((field) => JSON.stringify(entity[field]))
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    // Apply having filter and compute aggregates
    const results: Array<Partial<T> & AggregateResult<T>> = [];

    for (const [, groupEntities] of groups) {
      const representative = groupEntities[0];

      // Build group key object
      const groupKey: Partial<T> = {};
      for (const field of args.by) {
        (groupKey as Record<string, unknown>)[field as string] =
          representative[field];
      }

      // Apply having filter
      if (args.having) {
        if (!this.queryEngine.matchesWhere(representative, args.having)) {
          continue;
        }
      }

      // Compute aggregates for this group
      const groupAggregates: AggregateResult<T> = {};

      if (args._count) {
        if (args._count === true) {
          groupAggregates._count = groupEntities.length;
        } else {
          groupAggregates._count = { _all: groupEntities.length } as Partial<
            Record<keyof T | "_all", number>
          >;
        }
      }

      if (args._avg) {
        groupAggregates._avg = {};
        for (const [field, include] of Object.entries(args._avg)) {
          if (include) {
            const values = groupEntities
              .map((e) => (e as Record<string, unknown>)[field])
              .filter((v): v is number => typeof v === "number");
            groupAggregates._avg[field as keyof T] =
              values.length > 0
                ? values.reduce((a, b) => a + b, 0) / values.length
                : null;
          }
        }
      }

      if (args._sum) {
        groupAggregates._sum = {};
        for (const [field, include] of Object.entries(args._sum)) {
          if (include) {
            const values = groupEntities
              .map((e) => (e as Record<string, unknown>)[field])
              .filter((v): v is number => typeof v === "number");
            groupAggregates._sum[field as keyof T] =
              values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
          }
        }
      }

      results.push({ ...groupKey, ...groupAggregates });
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async transaction<R>(fn: (tx: IDataAdapter<T>) => Promise<R>): Promise<R> {
    return this.store.transaction(async () => {
      return fn(this);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve include clauses for relations.
   * @private
   */
  private async resolveIncludes(
    entity: T,
    include?: IncludeInput<T>,
  ): Promise<T> {
    if (!include || !this.database || !this.entityClass) {
      return entity;
    }

    const relations = SchemaRegistry.getRelations(this.entityClass);
    const result = { ...entity } as T & Record<string, unknown>;

    for (const [field, includeConfig] of Object.entries(include)) {
      if (!includeConfig) continue;

      const relation = relations.find((r) => String(r.field) === field);
      if (!relation) continue;

      const relatedData = await this.resolveRelation(
        entity,
        relation,
        includeConfig,
      );
      (result as Record<string, unknown>)[field] = relatedData;
    }

    return result as T;
  }

  /**
   * Resolve a single relation.
   * @private
   */
  private async resolveRelation(
    entity: T,
    relation: RelationMetadata,
    includeConfig: unknown,
  ): Promise<unknown> {
    if (!this.database) return null;

    const relatedEntityMeta = SchemaRegistry.getMetadata(relation.target());
    if (!relatedEntityMeta) return null;

    const relatedAdapter = this.database.table(relatedEntityMeta.name);

    switch (relation.type) {
      case "hasMany": {
        const foreignKeyValue = entity.id;
        return relatedAdapter.findMany({
          where: {
            [relation.foreignKey]: foreignKeyValue,
          } as WhereInput<IEntity>,
          ...(typeof includeConfig === "object" ? includeConfig : {}),
        });
      }

      case "hasOne": {
        const foreignKeyValue = entity.id;
        return relatedAdapter.findFirst({
          where: {
            [relation.foreignKey]: foreignKeyValue,
          } as WhereInput<IEntity>,
        });
      }

      case "belongsTo": {
        const foreignKeyValue = (entity as Record<string, unknown>)[
          relation.foreignKey
        ];
        if (!foreignKeyValue) return null;
        return relatedAdapter.findUnique({
          where: { id: foreignKeyValue as string },
        });
      }

      case "manyToMany": {
        // Resolve through a join table. Convention: the `through` table holds
        // link records with two foreign keys named `<sourceClass>Id` and
        // `<targetClass>Id` (class names lowercased). For example, a
        // Post <-> Tag relation through "post_tags" stores rows shaped like
        // `{ postId, tagId }`.
        if (!relation.through || !this.entityClass) return [];

        const sourceKey = `${this.entityClass.name.toLowerCase()}Id`;
        const targetKey = `${relation.target().name.toLowerCase()}Id`;

        const joinAdapter = this.database.table(relation.through);
        const joinRecords = await joinAdapter.findMany({
          where: { [sourceKey]: entity.id } as WhereInput<IEntity>,
        });

        const targetIds = joinRecords
          .map((record) => (record as Record<string, unknown>)[targetKey])
          .filter((value): value is string => typeof value === "string");

        if (targetIds.length === 0) return [];

        const related = await Promise.all(
          targetIds.map((id) => relatedAdapter.findUnique({ where: { id } })),
        );

        return related.filter((item) => item !== null);
      }

      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REACTIVE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  subscribe(callback: (event: ChangeEvent<T>) => void): ISubscription {
    this.subscribers.push(callback);
    return {
      unsubscribe: (): void => {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
          this.subscribers.splice(index, 1);
        }
      },
    };
  }

  on(
    type: ChangeType,
    callback: (event: ChangeEvent<T>) => void,
  ): ISubscription {
    if (!this.typeSubscribers.has(type)) {
      this.typeSubscribers.set(type, []);
    }
    this.typeSubscribers.get(type)!.push(callback);

    return {
      unsubscribe: (): void => {
        const callbacks = this.typeSubscribers.get(type);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      },
    };
  }

  private emit(event: ChangeEvent<T>): void {
    // Notify general subscribers
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in subscription callback:", error);
      }
    }

    // Notify type-specific subscribers
    const typeCallbacks = this.typeSubscribers.get(event.type);
    if (typeCallbacks) {
      for (const callback of typeCallbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error("Error in subscription callback:", error);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clear all data in this table.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Export table data as JSON.
   * @returns JSON string
   */
  toJSON(): string {
    return this.store.toJSON();
  }

  /**
   * Import table data from JSON.
   * @param json - JSON string
   */
  fromJSON(json: string): void {
    this.store.fromJSON(json);
  }

  /**
   * Get table statistics.
   * @returns Statistics object
   */
  getStats(): {
    tableName: string;
    recordCount: number;
    indexes: Array<{ field: string; size: number; unique: boolean }>;
    memoryEstimate: number;
  } {
    return this.store.getStats();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY DATABASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for InMemoryDatabase.
 * @public API
 */
export interface InMemoryDatabaseOptions {
  /** Enable timestamps by default for all tables */
  timestamps?: boolean;
  /** Enable soft deletes by default for all tables */
  softDelete?: boolean;
  /** Maximum number of records per table (0 = unlimited) */
  maxRecordsPerTable?: number;
  /** Persistence configuration */
  persist?: {
    /** Storage type */
    storage: "file" | "memory";
    /** File path (for file storage) */
    path?: string;
    /** Auto-save interval in ms (0 to disable) */
    interval?: number;
  };
}

/**
 * In-Memory Database with multi-table support.
 *
 * The main entry point for the in-memory database system.
 * Provides a clean API for managing multiple tables with
 * relation support.
 *
 * @example
 * ```typescript
 * const db = new InMemoryDatabase();
 *
 * // Access tables
 * const users = db.table<User>("users");
 * const posts = db.table<Post>("posts");
 *
 * // Create with relations
 * const user = await users.create({
 *   data: { name: "John", email: "john@example.com" }
 * });
 *
 * const post = await posts.create({
 *   data: { title: "Hello", authorId: user.id }
 * });
 *
 * // Query with includes
 * const userWithPosts = await users.findUnique({
 *   where: { id: user.id },
 *   include: { posts: true }
 * });
 * ```
 *
 * @public API
 */
export class InMemoryDatabase {
  private tables = new Map<string, InMemoryAdapter<IEntity>>();
  private options: InMemoryDatabaseOptions;
  private persistInterval?: NodeJS.Timeout;

  constructor(options: InMemoryDatabaseOptions = {}) {
    this.options = {
      timestamps: true,
      softDelete: false,
      ...options,
    };

    // Setup auto-persist if configured
    if (options.persist?.interval && options.persist.interval > 0) {
      this.persistInterval = setInterval(
        () => this.snapshot(),
        options.persist.interval,
      );
    }
  }

  /**
   * Get or create a table adapter.
   * @param tableName - Name of the table
   * @param entityClass - Optional entity class for schema metadata
   * @returns Table adapter
   */
  table<T extends IEntity>(
    tableName: string,
    entityClass?: new (...args: Array<unknown>) => unknown,
  ): InMemoryAdapter<T> {
    if (!this.tables.has(tableName)) {
      this.tables.set(
        tableName,
        new InMemoryAdapter<IEntity>(tableName, {
          database: this,
          entityClass,
          timestamps: this.options.timestamps,
          softDelete: this.options.softDelete,
          maxRecordsPerTable: this.options.maxRecordsPerTable,
        }),
      );
    }
    return this.tables.get(tableName)! as unknown as InMemoryAdapter<T>;
  }

  /**
   * Execute operations in a transaction across all tables.
   * @param fn - Transaction function
   * @returns Result of the transaction function
   */
  async transaction<R>(fn: (db: InMemoryDatabase) => Promise<R>): Promise<R> {
    // Begin transaction on all tables
    for (const adapter of this.tables.values()) {
      (
        adapter as unknown as { store: { beginTransaction: () => void } }
      ).store.beginTransaction();
    }

    try {
      const result = await fn(this);

      // Commit all
      for (const adapter of this.tables.values()) {
        (
          adapter as unknown as { store: { commitTransaction: () => void } }
        ).store.commitTransaction();
      }

      return result;
    } catch (error) {
      // Rollback all
      for (const adapter of this.tables.values()) {
        try {
          (
            adapter as unknown as { store: { rollbackTransaction: () => void } }
          ).store.rollbackTransaction();
        } catch {
          // Ignore rollback errors
        }
      }
      throw error;
    }
  }

  /**
   * Create a snapshot of all data.
   * @returns JSON string of all data
   */
  snapshot(): string {
    const data: Record<string, string> = {};

    for (const [name, adapter] of this.tables) {
      data[name] = adapter.toJSON();
    }

    const json = JSON.stringify(data);

    // Write to file if configured
    if (this.options.persist?.storage === "file" && this.options.persist.path) {
      this.writeToFile(this.options.persist.path, json);
    }

    return json;
  }

  /**
   * Restore data from a snapshot.
   * @param json - JSON string of snapshot data
   */
  restore(json: string): void {
    const data: Record<string, string> = JSON.parse(json);

    for (const [name, tableJson] of Object.entries(data)) {
      const adapter = this.table(name);
      adapter.fromJSON(tableJson);
    }
  }

  /**
   * Load data from persistence storage.
   */
  async load(): Promise<void> {
    if (this.options.persist?.storage === "file" && this.options.persist.path) {
      try {
        const json = await this.readFromFile(this.options.persist.path);
        this.restore(json);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
    }
  }

  /**
   * Clear all tables.
   */
  clear(): void {
    for (const adapter of this.tables.values()) {
      adapter.clear();
    }
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
    const tables = Array.from(this.tables.values()).map((adapter) =>
      adapter.getStats(),
    );

    return {
      tableCount: this.tables.size,
      totalRecords: tables.reduce((sum, t) => sum + t.recordCount, 0),
      tables,
    };
  }

  /**
   * Shutdown the database (cleanup).
   */
  shutdown(): void {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }

    // Final snapshot if persistence is enabled
    if (this.options.persist) {
      this.snapshot();
    }
  }

  /**
   * Write data to file (Node.js only).
   * @private
   */
  private writeToFile(path: string, data: string): void {
    try {
      // Dynamic import via node-require helper so this works in both
      // CJS and ESM compiled output.
      const fs = nodeRequire<typeof import("node:fs")>("node:fs");
      fs.writeFileSync(path, data, "utf-8");
    } catch (error) {
      console.error("Failed to write snapshot to file:", error);
    }
  }

  /**
   * Read data from file (Node.js only).
   * @private
   */
  private async readFromFile(path: string): Promise<string> {
    const fs = nodeRequire<typeof import("node:fs")>("node:fs");
    return fs.readFileSync(path, "utf-8");
  }
}
