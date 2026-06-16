/**
 * ExpressoTS In-Memory Database
 *
 * A high-performance, Prisma-compatible in-memory database
 * for ExpressoTS applications.
 *
 * Scope: this database is intended for development, testing, and
 * prototyping. Data lives in process memory (with optional file
 * snapshots) and does not provide the crash safety, concurrency, or
 * multi-process guarantees of a real database engine. It implements the
 * universal `IDataAdapter` contract so it can be swapped for a
 * production adapter (Prisma, TypeORM, etc.) without rewriting
 * repositories.
 *
 * Features:
 * - Prisma-like query API
 * - Type-safe queries with TypeScript
 * - Secondary indexes for O(1) lookups
 * - Automatic ID generation
 * - Timestamps (createdAt, updatedAt)
 * - Soft deletes
 * - Transactions with rollback
 * - Relation support (HasMany, HasOne, BelongsTo)
 * - Reactive subscriptions
 * - Persistence (file-based snapshots)
 * - Health checks and metrics
 * - Easy migration to real databases
 *
 * @example
 * ```typescript
 * // Define entities
 * interface User extends IEntity {
 *   name: string;
 *   email: string;
 *   age: number;
 * }
 *
 * // Inject the provider
 * constructor(@inject(InMemoryDBProvider) private db: InMemoryDBProvider) {}
 *
 * // Access tables
 * const users = this.db.table<User>("users");
 *
 * // Prisma-like queries
 * const user = await users.create({
 *   data: { name: "John", email: "john@example.com", age: 30 }
 * });
 *
 * const adults = await users.findMany({
 *   where: {
 *     OR: [
 *       { name: { contains: "John" } },
 *       { age: { gte: 18 } }
 *     ]
 *   },
 *   orderBy: { createdAt: "desc" },
 *   take: 10
 * });
 * ```
 *
 * @module db-in-memory
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export {
  InMemoryDBProvider,
  InMemoryDBConfig,
  BaseRepository,
} from "./db.provider.js";

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Interfaces
  IDataAdapter,
  ITableAdapter,
  IMultiTableAdapter,
  IReactiveDataAdapter,
  ISubscription,
  ChangeEvent,
  ChangeType,
  // Implementations
  InMemoryAdapter,
  InMemoryAdapterOptions,
  InMemoryDatabase,
  InMemoryDatabaseOptions,
} from "./adapter/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Entity interfaces
  IEntity,
  ITimestampedEntity,
  ISoftDeleteEntity,
  // Decorators
  Entity,
  EntityOptions,
  EntityMetadata,
  PrimaryKey,
  AutoGenerate,
  AutoGenerateStrategy,
  Index,
  IndexOptions,
  Unique,
  Nullable,
  Default,
  // Relation decorators
  HasMany,
  HasOne,
  BelongsTo,
  ManyToMany,
  RelationType,
  RelationMetadata,
  // Registry
  SchemaRegistry,
  DB_METADATA_KEYS,
} from "./schema/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Filter types
  StringFilter,
  NumberFilter,
  BooleanFilter,
  DateFilter,
  FieldFilter,
  // Query types
  WhereInput,
  WhereUniqueInput,
  OrderByInput,
  SortOrder,
  SelectInput,
  IncludeInput,
  // Find arguments
  FindUniqueArgs,
  FindFirstArgs,
  FindManyArgs,
  // Create arguments
  CreateArgs,
  CreateInput,
  CreateManyArgs,
  // Update arguments
  UpdateArgs,
  UpdateInput,
  UpdateManyArgs,
  // Upsert arguments
  UpsertArgs,
  // Delete arguments
  DeleteArgs,
  DeleteManyArgs,
  // Count & Aggregate
  CountArgs,
  CountSelect,
  AggregateArgs,
  AggregateResult,
  NumericFieldsOnly,
  // Group By
  GroupByArgs,
  // Batch
  BatchPayload,
  // Transaction
  TransactionClient,
  // Engine
  QueryEngine,
} from "./query/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════

export {
  MemoryStore,
  MemoryStoreOptions,
  IndexManager,
  IdGenerator,
  UniqueConstraintError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  MaxRecordsExceededError,
  EntityValidationError,
} from "./storage/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (Backward Compatibility)
// ═══════════════════════════════════════════════════════════════════════════

// Re-export legacy interfaces for backward compatibility
export {
  IRepository,
  IDataTable,
  IDataProvider,
} from "./db-in-memory.interface.js";

// Legacy provider (deprecated, use InMemoryDBProvider)
export {
  InMemoryDataProvider,
  InMemoryDataTable,
} from "./db-in-memory.provider.js";

// Legacy errors (now exported from storage)
export {
  EntityNotFoundError as LegacyEntityNotFoundError,
  EntityAlreadyExistsError as LegacyEntityAlreadyExistsError,
} from "./db-in-memory.types.js";

// Legacy base repository
export { BaseRepository as LegacyBaseRepository } from "./base-repo.repository.js";
