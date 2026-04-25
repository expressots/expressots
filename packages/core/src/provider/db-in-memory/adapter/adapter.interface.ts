/**
 * Data Adapter Interface for ExpressoTS
 *
 * The universal database adapter interface that enables seamless
 * swapping between in-memory, Prisma, TypeORM, and other databases.
 *
 * @module db-in-memory/adapter
 */

import { IEntity } from "../schema/entity.interface.js";
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
} from "../query/query.types.js";

/**
 * Universal Data Adapter Interface.
 *
 * This interface defines the contract that all database adapters must implement.
 * By coding against this interface, applications can seamlessly swap between:
 * - In-memory database (for development/testing)
 * - Prisma (PostgreSQL, MySQL, SQLite, etc.)
 * - TypeORM (any supported database)
 * - Mongoose (MongoDB)
 * - Custom implementations
 *
 * @example
 * ```typescript
 * // In development
 * bind<IDataAdapter<User>>("UserAdapter").to(InMemoryAdapter);
 *
 * // In production (one line change)
 * bind<IDataAdapter<User>>("UserAdapter").to(PrismaAdapter);
 * ```
 *
 * @public API
 */
export interface IDataAdapter<T extends IEntity> {
  /**
   * Find a single unique record.
   * @param args - Find unique arguments (must include unique field)
   * @returns The found record or null
   */
  findUnique(args: FindUniqueArgs<T>): Promise<T | null>;

  /**
   * Find the first record matching the criteria.
   * @param args - Find first arguments
   * @returns The first matching record or null
   */
  findFirst(args?: FindFirstArgs<T>): Promise<T | null>;

  /**
   * Find multiple records matching the criteria.
   * @param args - Find many arguments (optional)
   * @returns Array of matching records
   */
  findMany(args?: FindManyArgs<T>): Promise<Array<T>>;

  /**
   * Find a record by ID or throw if not found.
   * @param args - Find unique arguments
   * @returns The found record
   * @throws EntityNotFoundError if record not found
   */
  findUniqueOrThrow(args: FindUniqueArgs<T>): Promise<T>;

  /**
   * Find the first record or throw if none found.
   * @param args - Find first arguments
   * @returns The first matching record
   * @throws EntityNotFoundError if no record found
   */
  findFirstOrThrow(args?: FindFirstArgs<T>): Promise<T>;

  /**
   * Create a new record.
   * @param args - Create arguments
   * @returns The created record
   */
  create(args: CreateArgs<T>): Promise<T>;

  /**
   * Create multiple records.
   * @param args - Create many arguments
   * @returns Batch payload with count
   */
  createMany(args: CreateManyArgs<T>): Promise<BatchPayload>;

  /**
   * Update an existing record.
   * @param args - Update arguments
   * @returns The updated record
   * @throws EntityNotFoundError if record not found
   */
  update(args: UpdateArgs<T>): Promise<T>;

  /**
   * Update multiple records.
   * @param args - Update many arguments
   * @returns Batch payload with count
   */
  updateMany(args: UpdateManyArgs<T>): Promise<BatchPayload>;

  /**
   * Update or create a record.
   * @param args - Upsert arguments
   * @returns The upserted record
   */
  upsert(args: UpsertArgs<T>): Promise<T>;

  /**
   * Delete a record.
   * @param args - Delete arguments
   * @returns The deleted record
   * @throws EntityNotFoundError if record not found
   */
  delete(args: DeleteArgs<T>): Promise<T>;

  /**
   * Delete multiple records.
   * @param args - Delete many arguments
   * @returns Batch payload with count
   */
  deleteMany(args?: DeleteManyArgs<T>): Promise<BatchPayload>;

  /**
   * Count records.
   * @param args - Count arguments (optional)
   * @returns Number of matching records
   */
  count(args?: CountArgs<T>): Promise<number>;

  /**
   * Execute aggregate operations.
   * @param args - Aggregate arguments
   * @returns Aggregate result
   */
  aggregate(args: AggregateArgs<T>): Promise<AggregateResult<T>>;

  /**
   * Group records by fields.
   * @param args - Group by arguments
   * @returns Array of grouped results
   */
  groupBy(
    args: GroupByArgs<T>,
  ): Promise<Array<Partial<T> & AggregateResult<T>>>;

  /**
   * Execute operations within a transaction.
   * @param fn - Transaction function
   * @returns Result of the transaction function
   */
  transaction<R>(fn: (tx: IDataAdapter<T>) => Promise<R>): Promise<R>;
}

/**
 * Table-specific adapter interface for multi-table databases.
 *
 * @example
 * ```typescript
 * const users = db.table<User>("users");
 * const posts = db.table<Post>("posts");
 * ```
 *
 * @public API
 */
export interface ITableAdapter<T extends IEntity> extends IDataAdapter<T> {
  /** Table/collection name */
  readonly tableName: string;
}

/**
 * Database adapter with multi-table support.
 *
 * @example
 * ```typescript
 * interface MyDB extends IMultiTableAdapter {
 *   users: IDataAdapter<User>;
 *   posts: IDataAdapter<Post>;
 * }
 * ```
 *
 * @public API
 */
export interface IMultiTableAdapter {
  /**
   * Get an adapter for a specific table.
   * @param tableName - Name of the table
   * @returns Table-specific adapter
   */
  table<T extends IEntity>(tableName: string): ITableAdapter<T>;

  /**
   * Execute operations across multiple tables in a transaction.
   * @param fn - Transaction function
   * @returns Result of the transaction function
   */
  transaction<R>(fn: (tx: IMultiTableAdapter) => Promise<R>): Promise<R>;
}

/**
 * Subscription for reactive updates.
 * @public API
 */
export interface ISubscription {
  /** Unsubscribe from updates */
  unsubscribe(): void;
}

/**
 * Change event types.
 * @public API
 */
export type ChangeType = "create" | "update" | "delete";

/**
 * Change event for reactive updates.
 * @public API
 */
export interface ChangeEvent<T> {
  /** Type of change */
  type: ChangeType;
  /** The entity after the change (undefined for delete) */
  data?: T;
  /** The entity before the change (undefined for create) */
  previousData?: T;
  /** Timestamp of the change */
  timestamp: Date;
}

/**
 * Reactive data adapter with subscription support.
 * @public API
 */
export interface IReactiveDataAdapter<T extends IEntity>
  extends IDataAdapter<T> {
  /**
   * Subscribe to all changes.
   * @param callback - Function called on each change
   * @returns Subscription to unsubscribe
   */
  subscribe(callback: (event: ChangeEvent<T>) => void): ISubscription;

  /**
   * Subscribe to specific change types.
   * @param type - Type of change to subscribe to
   * @param callback - Function called on each change
   * @returns Subscription to unsubscribe
   */
  on(
    type: ChangeType,
    callback: (event: ChangeEvent<T>) => void,
  ): ISubscription;
}
