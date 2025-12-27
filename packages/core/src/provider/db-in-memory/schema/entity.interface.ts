/**
 * Entity Interfaces for ExpressoTS In-Memory Database
 *
 * Base interfaces and types for entity definitions.
 *
 * @module db-in-memory/schema
 */

/**
 * Base interface that all entities must implement.
 * Provides the required `id` field for record identification.
 *
 * @example
 * ```typescript
 * interface User extends IEntity {
 *   name: string;
 *   email: string;
 * }
 * ```
 * @public API
 */
export interface IEntity {
  /** Unique identifier for the entity */
  id?: string;
}

/**
 * Entity with automatic timestamps.
 * Extends IEntity with createdAt and updatedAt fields.
 *
 * @example
 * ```typescript
 * interface User extends ITimestampedEntity {
 *   name: string;
 *   email: string;
 * }
 * ```
 * @public API
 */
export interface ITimestampedEntity extends IEntity {
  /** Timestamp when the record was created */
  createdAt?: Date;
  /** Timestamp when the record was last updated */
  updatedAt?: Date;
}

/**
 * Entity with soft delete support.
 * Extends ITimestampedEntity with deletedAt field.
 *
 * @example
 * ```typescript
 * interface User extends ISoftDeleteEntity {
 *   name: string;
 *   email: string;
 * }
 * ```
 * @public API
 */
export interface ISoftDeleteEntity extends ITimestampedEntity {
  /** Timestamp when the record was soft deleted (null if not deleted) */
  deletedAt?: Date | null;
}

