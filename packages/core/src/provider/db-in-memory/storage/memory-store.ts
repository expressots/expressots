/**
 * Memory Store for ExpressoTS In-Memory Database
 *
 * High-performance in-memory storage with secondary indexes.
 *
 * @module db-in-memory/storage
 */

import { randomUUID } from "node:crypto";
import { IEntity } from "../schema/entity.interface";
import {
  AutoGenerateStrategy,
  SchemaRegistry,
} from "../schema/decorators";

// ═══════════════════════════════════════════════════════════════════════════
// INDEX MANAGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manages secondary indexes for a table.
 * Provides O(1) lookups for indexed fields.
 * @internal
 */
export class IndexManager<T extends IEntity> {
  /** Map of field name -> value -> Set of entity IDs */
  private indexes = new Map<string, Map<unknown, Set<string>>>();
  /** Set of indexed field names */
  private indexedFields = new Set<string>();
  /** Set of unique field names */
  private uniqueFields = new Set<string>();

  /**
   * Create an index for a field.
   * @param field - Field name to index
   */
  createIndex(field: string): void {
    if (!this.indexes.has(field)) {
      this.indexes.set(field, new Map());
      this.indexedFields.add(field);
    }
  }

  /**
   * Mark a field as unique.
   * @param field - Field name
   */
  markUnique(field: string): void {
    this.uniqueFields.add(field);
    // Unique fields are automatically indexed
    this.createIndex(field);
  }

  /**
   * Check if a field is indexed.
   * @param field - Field name
   * @returns True if field is indexed
   */
  hasIndex(field: string): boolean {
    return this.indexedFields.has(field);
  }

  /**
   * Check if a field is unique.
   * @param field - Field name
   * @returns True if field is unique
   */
  isUnique(field: string): boolean {
    return this.uniqueFields.has(field);
  }

  /**
   * Add an entity to all indexes.
   * @param entity - Entity to index
   * @throws Error if unique constraint is violated
   */
  indexEntity(entity: T): void {
    const id = entity.id!;

    for (const field of this.indexedFields) {
      const value = (entity as Record<string, unknown>)[field];
      if (value === undefined) continue;

      const fieldIndex = this.indexes.get(field)!;

      // Check unique constraint
      if (this.uniqueFields.has(field)) {
        const existing = fieldIndex.get(value);
        if (existing && existing.size > 0) {
          const existingId = Array.from(existing)[0];
          if (existingId !== id) {
            throw new UniqueConstraintError(field, value);
          }
        }
      }

      // Add to index
      if (!fieldIndex.has(value)) {
        fieldIndex.set(value, new Set());
      }
      fieldIndex.get(value)!.add(id);
    }
  }

  /**
   * Remove an entity from all indexes.
   * @param entity - Entity to remove from indexes
   */
  removeFromIndex(entity: T): void {
    const id = entity.id!;

    for (const field of this.indexedFields) {
      const value = (entity as Record<string, unknown>)[field];
      if (value === undefined) continue;

      const fieldIndex = this.indexes.get(field);
      if (fieldIndex) {
        const ids = fieldIndex.get(value);
        if (ids) {
          ids.delete(id);
          if (ids.size === 0) {
            fieldIndex.delete(value);
          }
        }
      }
    }
  }

  /**
   * Update an entity in all indexes.
   * @param oldEntity - Previous entity state
   * @param newEntity - New entity state
   */
  updateIndex(oldEntity: T, newEntity: T): void {
    this.removeFromIndex(oldEntity);
    this.indexEntity(newEntity);
  }

  /**
   * Find entity IDs by indexed field value.
   * @param field - Field name
   * @param value - Value to find
   * @returns Set of matching entity IDs or undefined if not indexed
   */
  findByIndex(field: string, value: unknown): Set<string> | undefined {
    const fieldIndex = this.indexes.get(field);
    if (!fieldIndex) return undefined;
    return fieldIndex.get(value);
  }

  /**
   * Get all values for an indexed field.
   * @param field - Field name
   * @returns Array of unique values
   */
  getIndexValues(field: string): Array<unknown> {
    const fieldIndex = this.indexes.get(field);
    if (!fieldIndex) return [];
    return Array.from(fieldIndex.keys());
  }

  /**
   * Clear all indexes.
   */
  clear(): void {
    for (const fieldIndex of this.indexes.values()) {
      fieldIndex.clear();
    }
  }

  /**
   * Get index statistics.
   */
  getStats(): Array<{ field: string; size: number; unique: boolean }> {
    return Array.from(this.indexedFields).map((field) => ({
      field,
      size: this.indexes.get(field)?.size || 0,
      unique: this.uniqueFields.has(field),
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when a unique constraint is violated.
 * @public API
 */
export class UniqueConstraintError extends Error {
  field: string;
  value: unknown;

  constructor(field: string, value: unknown) {
    super(`Unique constraint failed on field '${field}' with value '${value}'`);
    this.name = "UniqueConstraintError";
    this.field = field;
    this.value = value;
  }
}

/**
 * Error thrown when an entity is not found.
 * @public API
 */
export class EntityNotFoundError extends Error {
  entityName: string;
  id: string;

  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' not found`);
    this.name = "EntityNotFoundError";
    this.entityName = entityName;
    this.id = id;
  }
}

/**
 * Error thrown when an entity already exists.
 * @public API
 */
export class EntityAlreadyExistsError extends Error {
  entityName: string;
  id: string;

  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' already exists`);
    this.name = "EntityAlreadyExistsError";
    this.entityName = entityName;
    this.id = id;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ID Generator utility.
 * @internal
 */
export class IdGenerator {
  private static incrementCounter = new Map<string, number>();

  /**
   * Generate an ID based on the strategy.
   * @param strategy - Generation strategy
   * @param tableName - Table name (for increment strategy)
   * @returns Generated ID
   */
  static generate(strategy: AutoGenerateStrategy, tableName: string): string {
    switch (strategy) {
      case "uuid":
        return randomUUID();
      case "cuid":
        return this.generateCuid();
      case "ulid":
        return this.generateUlid();
      case "increment":
        return this.generateIncrement(tableName);
      default:
        return randomUUID();
    }
  }

  private static generateCuid(): string {
    // Simple CUID-like implementation
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const counter = (this.incrementCounter.get("cuid") || 0) + 1;
    this.incrementCounter.set("cuid", counter);
    return `c${timestamp}${random}${counter.toString(36)}`;
  }

  private static generateUlid(): string {
    // Simple ULID-like implementation
    const timestamp = Date.now().toString(36).padStart(10, "0");
    const random = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join("");
    return `${timestamp}${random}`.toUpperCase();
  }

  private static generateIncrement(tableName: string): string {
    const current = this.incrementCounter.get(tableName) || 0;
    const next = current + 1;
    this.incrementCounter.set(tableName, next);
    return next.toString();
  }

  /**
   * Reset increment counters (useful for testing).
   */
  static reset(): void {
    this.incrementCounter.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for MemoryStore.
 * @public API
 */
export interface MemoryStoreOptions {
  /** Entity class for schema metadata */
  entityClass?: new (...args: Array<unknown>) => unknown;
  /** Enable timestamps (createdAt, updatedAt) */
  timestamps?: boolean;
  /** Enable soft deletes */
  softDelete?: boolean;
}

/**
 * High-performance in-memory storage for a single table/collection.
 * Features:
 * - O(1) lookups by ID
 * - O(1) lookups by indexed fields
 * - Automatic ID generation
 * - Timestamp management
 * - Soft delete support
 * - Transaction snapshots
 *
 * @public API
 */
export class MemoryStore<T extends IEntity> {
  /** Primary storage: ID -> Entity */
  private data = new Map<string, T>();
  /** Index manager for secondary indexes */
  private indexManager = new IndexManager<T>();
  /** Transaction snapshot stack */
  private transactionStack: Array<Map<string, T>> = [];
  /** Table/collection name */
  private tableName: string;
  /** Entity class for metadata */
  private entityClass?: new (...args: Array<unknown>) => unknown;
  /** Enable timestamps */
  private timestamps: boolean;
  /** Enable soft delete */
  private softDelete: boolean;
  /** Auto-generate configuration */
  private autoGenerateFields: Record<string, AutoGenerateStrategy> = {};
  /** Default values */
  private defaultValues: Record<string, unknown> = {};

  constructor(tableName: string, options: MemoryStoreOptions = {}) {
    this.tableName = tableName;
    this.entityClass = options.entityClass;
    this.timestamps = options.timestamps ?? true;
    this.softDelete = options.softDelete ?? false;

    // Load schema metadata if entity class is provided
    if (this.entityClass) {
      this.loadSchemaMetadata();
    } else {
      // Default: index on id
      this.indexManager.createIndex("id");
      this.indexManager.markUnique("id");
    }
  }

  /**
   * Load schema metadata from decorators.
   * @private
   */
  private loadSchemaMetadata(): void {
    if (!this.entityClass) return;

    // Get indexes
    const indexes = SchemaRegistry.getIndexes(this.entityClass);
    for (const index of indexes) {
      this.indexManager.createIndex(String(index.field));
    }

    // Get unique fields
    const uniqueFields = SchemaRegistry.getUniqueFields(this.entityClass);
    for (const field of uniqueFields) {
      this.indexManager.markUnique(String(field));
    }

    // Always index and mark id as unique
    this.indexManager.createIndex("id");
    this.indexManager.markUnique("id");

    // Get auto-generate fields
    this.autoGenerateFields = SchemaRegistry.getAutoGenerateFields(
      this.entityClass,
    ) as Record<string, AutoGenerateStrategy>;

    // Get default values
    this.defaultValues = SchemaRegistry.getDefaults(
      this.entityClass,
    ) as Record<string, unknown>;

    // Get entity metadata for timestamps/softDelete settings
    const entityMeta = SchemaRegistry.getMetadata(this.entityClass);
    if (entityMeta) {
      this.timestamps = entityMeta.timestamps;
      this.softDelete = entityMeta.softDelete;
    }
  }

  /**
   * Apply auto-generation and defaults to entity.
   * @private
   */
  private applyDefaults(entity: Partial<T>): T {
    const result = { ...entity } as Record<string, unknown>;

    // Apply auto-generate fields
    for (const [field, strategy] of Object.entries(this.autoGenerateFields)) {
      if (result[field] === undefined) {
        result[field] = IdGenerator.generate(strategy, this.tableName);
      }
    }

    // Generate ID if not provided
    if (!result.id) {
      result.id = randomUUID();
    }

    // Apply default values
    for (const [field, value] of Object.entries(this.defaultValues)) {
      if (result[field] === undefined) {
        result[field] = typeof value === "function" ? value() : value;
      }
    }

    // Apply timestamps
    if (this.timestamps) {
      const now = new Date();
      if (result.createdAt === undefined) {
        result.createdAt = now;
      }
      result.updatedAt = now;
    }

    return result as T;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Insert a new entity.
   * @param entity - Entity to insert
   * @returns Inserted entity with generated fields
   * @throws EntityAlreadyExistsError if ID already exists
   * @throws UniqueConstraintError if unique constraint is violated
   */
  insert(entity: Partial<T>): T {
    const prepared = this.applyDefaults(entity);

    if (this.data.has(prepared.id!)) {
      throw new EntityAlreadyExistsError(this.tableName, prepared.id!);
    }

    // Index first (will throw if unique constraint violated)
    this.indexManager.indexEntity(prepared);
    // Then store
    this.data.set(prepared.id!, prepared);

    return prepared;
  }

  /**
   * Insert multiple entities.
   * @param entities - Entities to insert
   * @param skipDuplicates - Skip entities with duplicate keys
   * @returns Array of inserted entities
   */
  insertMany(entities: Array<Partial<T>>, skipDuplicates = false): Array<T> {
    const results: Array<T> = [];

    for (const entity of entities) {
      try {
        results.push(this.insert(entity));
      } catch (error) {
        if (
          skipDuplicates &&
          (error instanceof EntityAlreadyExistsError ||
            error instanceof UniqueConstraintError)
        ) {
          continue;
        }
        throw error;
      }
    }

    return results;
  }

  /**
   * Update an entity by ID.
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity
   * @throws EntityNotFoundError if entity not found
   */
  update(id: string, data: Partial<T>): T {
    const existing = this.data.get(id);
    if (!existing) {
      throw new EntityNotFoundError(this.tableName, id);
    }

    const updated = { ...existing, ...data, id } as T;

    // Apply updated timestamp
    if (this.timestamps) {
      (updated as { updatedAt?: Date }).updatedAt = new Date();
    }

    // Update indexes
    this.indexManager.updateIndex(existing, updated);
    // Store updated entity
    this.data.set(id, updated);

    return updated;
  }

  /**
   * Update multiple entities matching a predicate.
   * @param predicate - Filter function
   * @param data - Update data
   * @returns Number of updated entities
   */
  updateMany(predicate: (entity: T) => boolean, data: Partial<T>): number {
    let count = 0;

    for (const [id, entity] of this.data) {
      if (predicate(entity)) {
        this.update(id, data);
        count++;
      }
    }

    return count;
  }

  /**
   * Delete an entity by ID.
   * @param id - Entity ID
   * @returns Deleted entity
   * @throws EntityNotFoundError if entity not found
   */
  delete(id: string): T {
    const entity = this.data.get(id);
    if (!entity) {
      throw new EntityNotFoundError(this.tableName, id);
    }

    if (this.softDelete) {
      // Soft delete
      return this.update(id, {
        deletedAt: new Date(),
      } as unknown as Partial<T>);
    }

    // Hard delete
    this.indexManager.removeFromIndex(entity);
    this.data.delete(id);

    return entity;
  }

  /**
   * Delete multiple entities matching a predicate.
   * @param predicate - Filter function
   * @returns Number of deleted entities
   */
  deleteMany(predicate?: (entity: T) => boolean): number {
    if (!predicate) {
      const count = this.data.size;
      this.clear();
      return count;
    }

    let count = 0;
    const toDelete: Array<string> = [];

    for (const [id, entity] of this.data) {
      if (predicate(entity)) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.delete(id);
      count++;
    }

    return count;
  }

  /**
   * Find an entity by ID.
   * @param id - Entity ID
   * @returns Entity or undefined
   */
  findById(id: string): T | undefined {
    const entity = this.data.get(id);

    // Filter out soft-deleted entities
    if (entity && this.softDelete) {
      const deletedAt = (entity as { deletedAt?: Date }).deletedAt;
      if (deletedAt) return undefined;
    }

    return entity;
  }

  /**
   * Find entities by indexed field value (O(1) lookup).
   * @param field - Field name
   * @param value - Value to find
   * @returns Array of matching entities
   */
  findByIndex(field: string, value: unknown): Array<T> {
    const ids = this.indexManager.findByIndex(field, value);
    if (!ids) {
      // Fall back to scan if not indexed
      return this.findAll().filter(
        (e) => (e as Record<string, unknown>)[field] === value,
      );
    }

    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter((e): e is T => {
        if (!e) return false;
        if (this.softDelete) {
          return !(e as { deletedAt?: Date }).deletedAt;
        }
        return true;
      });
  }

  /**
   * Find all entities.
   * @returns Array of all entities
   */
  findAll(): Array<T> {
    const entities = Array.from(this.data.values());

    if (this.softDelete) {
      return entities.filter((e) => !(e as { deletedAt?: Date }).deletedAt);
    }

    return entities;
  }

  /**
   * Find entities matching a predicate.
   * @param predicate - Filter function
   * @returns Array of matching entities
   */
  find(predicate: (entity: T) => boolean): Array<T> {
    return this.findAll().filter(predicate);
  }

  /**
   * Find the first entity matching a predicate.
   * @param predicate - Filter function
   * @returns First matching entity or undefined
   */
  findFirst(predicate: (entity: T) => boolean): T | undefined {
    for (const entity of this.data.values()) {
      if (this.softDelete && (entity as { deletedAt?: Date }).deletedAt) {
        continue;
      }
      if (predicate(entity)) {
        return entity;
      }
    }
    return undefined;
  }

  /**
   * Count entities.
   * @param predicate - Optional filter function
   * @returns Number of entities
   */
  count(predicate?: (entity: T) => boolean): number {
    if (!predicate) {
      if (this.softDelete) {
        return this.findAll().length;
      }
      return this.data.size;
    }
    return this.find(predicate).length;
  }

  /**
   * Check if an entity exists.
   * @param id - Entity ID
   * @returns True if entity exists
   */
  exists(id: string): boolean {
    return this.findById(id) !== undefined;
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.data.clear();
    this.indexManager.clear();
    IdGenerator.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Begin a transaction (creates a snapshot).
   */
  beginTransaction(): void {
    const snapshot = new Map(this.data);
    this.transactionStack.push(snapshot);
  }

  /**
   * Commit the current transaction.
   */
  commitTransaction(): void {
    this.transactionStack.pop();
  }

  /**
   * Rollback the current transaction.
   * @throws Error if no transaction is active
   */
  rollbackTransaction(): void {
    const snapshot = this.transactionStack.pop();
    if (!snapshot) {
      throw new Error("No active transaction to rollback");
    }
    this.data = snapshot;
    // Rebuild indexes
    this.indexManager.clear();
    for (const entity of this.data.values()) {
      this.indexManager.indexEntity(entity);
    }
  }

  /**
   * Execute a function within a transaction.
   * @param fn - Function to execute
   * @returns Result of the function
   */
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    this.beginTransaction();
    try {
      const result = await fn();
      this.commitTransaction();
      return result;
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Export all data as JSON.
   * @returns JSON string of all data
   */
  toJSON(): string {
    const entries = Array.from(this.data.entries());
    return JSON.stringify(entries, (_, value) => {
      if (value instanceof Date) {
        return { __type: "Date", value: value.toISOString() };
      }
      return value;
    });
  }

  /**
   * Import data from JSON.
   * @param json - JSON string to import
   */
  fromJSON(json: string): void {
    this.clear();
    const entries: Array<[string, T]> = JSON.parse(json, (_, value) => {
      if (value && typeof value === "object" && value.__type === "Date") {
        return new Date(value.value);
      }
      return value;
    });
    for (const [id, entity] of entries) {
      this.data.set(id, entity);
      this.indexManager.indexEntity(entity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get store statistics.
   * @returns Statistics object
   */
  getStats(): {
    tableName: string;
    recordCount: number;
    indexes: Array<{ field: string; size: number; unique: boolean }>;
    memoryEstimate: number;
  } {
    return {
      tableName: this.tableName,
      recordCount: this.data.size,
      indexes: this.indexManager.getStats(),
      memoryEstimate: this.estimateMemory(),
    };
  }

  /**
   * Estimate memory usage in bytes.
   * @private
   */
  private estimateMemory(): number {
    // Rough estimate: JSON string length * 2 (UTF-16)
    return this.toJSON().length * 2;
  }
}

