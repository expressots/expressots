/**
 * Schema Decorators for ExpressoTS In-Memory Database
 *
 * Decorators for defining entity schemas, indexes, relations,
 * and other metadata for the in-memory database.
 *
 * @module db-in-memory/schema
 */

import "reflect-metadata";

// ═══════════════════════════════════════════════════════════════════════════
// METADATA KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const DB_METADATA_KEYS = {
  entity: "expressots:db:entity",
  primaryKey: "expressots:db:primaryKey",
  index: "expressots:db:index",
  unique: "expressots:db:unique",
  autoGenerate: "expressots:db:autoGenerate",
  timestamps: "expressots:db:timestamps",
  softDelete: "expressots:db:softDelete",
  default: "expressots:db:default",
  relation: "expressots:db:relation",
  nullable: "expressots:db:nullable",
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY DECORATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for the @Entity decorator.
 * @public API
 */
export interface EntityOptions {
  /** Table/collection name (defaults to class name) */
  name?: string;
  /** Enable runtime validation (default: false) */
  validate?: boolean;
  /** Enable soft deletes (default: false) */
  softDelete?: boolean;
  /** Enable automatic timestamps (default: true) */
  timestamps?: boolean;
}

/**
 * Entity metadata stored on decorated classes.
 * @internal
 */
export interface EntityMetadata {
  name: string;
  validate: boolean;
  softDelete: boolean;
  timestamps: boolean;
  target: new (...args: Array<unknown>) => unknown;
}

/**
 * Marks a class as a database entity.
 *
 * @param options - Entity configuration options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Entity({ name: "users", timestamps: true })
 * class User {
 *   @PrimaryKey()
 *   @AutoGenerate("uuid")
 *   id!: string;
 *
 *   @Index()
 *   @Unique()
 *   email!: string;
 *
 *   name!: string;
 * }
 * ```
 * @public API
 */
export function Entity(options: EntityOptions | string = {}): ClassDecorator {
  return function (target: object) {
    const opts: EntityOptions =
      typeof options === "string" ? { name: options } : options;

    const metadata: EntityMetadata = {
      name: opts.name || (target as { name: string }).name.toLowerCase(),
      validate: opts.validate ?? false,
      softDelete: opts.softDelete ?? false,
      timestamps: opts.timestamps ?? true,
      target: target as new (...args: Array<unknown>) => unknown,
    };

    Reflect.defineMetadata(DB_METADATA_KEYS.entity, metadata, target);

    // Register with schema registry
    SchemaRegistry.register(
      target as new (...args: Array<unknown>) => unknown,
      metadata,
    );
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD DECORATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marks a field as the primary key.
 *
 * @example
 * ```typescript
 * @PrimaryKey()
 * id!: string;
 * ```
 * @public API
 */
export function PrimaryKey(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.primaryKey, target.constructor) ||
      [];
    existing.push(propertyKey);
    Reflect.defineMetadata(
      DB_METADATA_KEYS.primaryKey,
      existing,
      target.constructor,
    );
  };
}

/**
 * Auto-generation strategy types.
 * @public API
 */
export type AutoGenerateStrategy = "uuid" | "cuid" | "increment" | "ulid";

/**
 * Marks a field for auto-generation.
 *
 * @param strategy - The generation strategy (uuid, cuid, increment, ulid)
 *
 * @example
 * ```typescript
 * @AutoGenerate("uuid")
 * id!: string;
 * ```
 * @public API
 */
export function AutoGenerate(
  strategy: AutoGenerateStrategy,
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.autoGenerate, target.constructor) ||
      {};
    existing[propertyKey] = strategy;
    Reflect.defineMetadata(
      DB_METADATA_KEYS.autoGenerate,
      existing,
      target.constructor,
    );
  };
}

/**
 * Index options.
 * @public API
 */
export interface IndexOptions {
  /** Index name (auto-generated if not provided) */
  name?: string;
  /** Composite index with other fields */
  composite?: Array<string>;
}

/**
 * Marks a field as indexed for faster lookups.
 *
 * @param options - Index configuration
 *
 * @example
 * ```typescript
 * @Index()
 * email!: string;
 *
 * @Index({ composite: ["firstName", "lastName"] })
 * firstName!: string;
 * ```
 * @public API
 */
export function Index(options: IndexOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.index, target.constructor) || [];
    existing.push({
      field: propertyKey,
      name: options.name || `idx_${String(propertyKey)}`,
      composite: options.composite,
    });
    Reflect.defineMetadata(
      DB_METADATA_KEYS.index,
      existing,
      target.constructor,
    );
  };
}

/**
 * Marks a field as unique.
 *
 * @example
 * ```typescript
 * @Unique()
 * email!: string;
 * ```
 * @public API
 */
export function Unique(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.unique, target.constructor) || [];
    existing.push(propertyKey);
    Reflect.defineMetadata(
      DB_METADATA_KEYS.unique,
      existing,
      target.constructor,
    );
  };
}

/**
 * Marks a field as nullable.
 *
 * @example
 * ```typescript
 * @Nullable()
 * middleName?: string;
 * ```
 * @public API
 */
export function Nullable(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.nullable, target.constructor) || [];
    existing.push(propertyKey);
    Reflect.defineMetadata(
      DB_METADATA_KEYS.nullable,
      existing,
      target.constructor,
    );
  };
}

/**
 * Sets a default value for a field.
 *
 * @param value - Default value or factory function
 *
 * @example
 * ```typescript
 * @Default(true)
 * isActive!: boolean;
 *
 * @Default(() => new Date())
 * createdAt!: Date;
 * ```
 * @public API
 */
export function Default<T>(value: T | (() => T)): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const existing =
      Reflect.getMetadata(DB_METADATA_KEYS.default, target.constructor) || {};
    existing[propertyKey] = value;
    Reflect.defineMetadata(
      DB_METADATA_KEYS.default,
      existing,
      target.constructor,
    );
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATION DECORATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Relation types.
 * @public API
 */
export type RelationType = "hasOne" | "hasMany" | "belongsTo" | "manyToMany";

/**
 * Relation metadata.
 * @internal
 */
export interface RelationMetadata {
  type: RelationType;
  target: () => new (...args: Array<unknown>) => unknown;
  foreignKey: string;
  field: string | symbol;
  through?: string;
}

/**
 * Defines a one-to-many relation.
 *
 * @param target - Factory function returning the related entity class
 * @param foreignKey - The foreign key field on the related entity
 *
 * @example
 * ```typescript
 * @HasMany(() => Post, "authorId")
 * posts?: Post[];
 * ```
 * @public API
 */
export function HasMany(
  target: () => new (...args: Array<unknown>) => unknown,
  foreignKey: string,
): PropertyDecorator {
  return function (targetObj: object, propertyKey: string | symbol) {
    addRelationMetadata(targetObj, propertyKey, {
      type: "hasMany",
      target,
      foreignKey,
      field: propertyKey,
    });
  };
}

/**
 * Defines a one-to-one relation.
 *
 * @param target - Factory function returning the related entity class
 * @param foreignKey - The foreign key field
 *
 * @example
 * ```typescript
 * @HasOne(() => Profile, "userId")
 * profile?: Profile;
 * ```
 * @public API
 */
export function HasOne(
  target: () => new (...args: Array<unknown>) => unknown,
  foreignKey: string,
): PropertyDecorator {
  return function (targetObj: object, propertyKey: string | symbol) {
    addRelationMetadata(targetObj, propertyKey, {
      type: "hasOne",
      target,
      foreignKey,
      field: propertyKey,
    });
  };
}

/**
 * Defines a belongs-to relation (inverse of HasMany/HasOne).
 *
 * @param target - Factory function returning the related entity class
 * @param foreignKey - The foreign key field on this entity
 *
 * @example
 * ```typescript
 * @BelongsTo(() => User, "authorId")
 * author?: User;
 *
 * authorId!: string;
 * ```
 * @public API
 */
export function BelongsTo(
  target: () => new (...args: Array<unknown>) => unknown,
  foreignKey: string,
): PropertyDecorator {
  return function (targetObj: object, propertyKey: string | symbol) {
    addRelationMetadata(targetObj, propertyKey, {
      type: "belongsTo",
      target,
      foreignKey,
      field: propertyKey,
    });
  };
}

/**
 * Defines a many-to-many relation.
 *
 * @param target - Factory function returning the related entity class
 * @param through - The join table/collection name
 *
 * @example
 * ```typescript
 * @ManyToMany(() => Tag, "post_tags")
 * tags?: Tag[];
 * ```
 * @public API
 */
export function ManyToMany(
  target: () => new (...args: Array<unknown>) => unknown,
  through: string,
): PropertyDecorator {
  return function (targetObj: object, propertyKey: string | symbol) {
    addRelationMetadata(targetObj, propertyKey, {
      type: "manyToMany",
      target,
      foreignKey: "",
      field: propertyKey,
      through,
    });
  };
}

/**
 * Helper to add relation metadata.
 * @internal
 */
function addRelationMetadata(
  target: object,
  propertyKey: string | symbol,
  metadata: RelationMetadata,
): void {
  const existing =
    Reflect.getMetadata(DB_METADATA_KEYS.relation, target.constructor) || [];
  existing.push(metadata);
  Reflect.defineMetadata(
    DB_METADATA_KEYS.relation,
    existing,
    target.constructor,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema Registry for storing and retrieving entity metadata.
 * @public API
 */
export class SchemaRegistry {
  private static entities = new Map<
    new (...args: Array<unknown>) => unknown,
    EntityMetadata
  >();

  private static entityByName = new Map<
    string,
    new (...args: Array<unknown>) => unknown
  >();

  /**
   * Register an entity with the schema registry.
   * @internal
   */
  static register(
    target: new (...args: Array<unknown>) => unknown,
    metadata: EntityMetadata,
  ): void {
    this.entities.set(target, metadata);
    this.entityByName.set(metadata.name, target);
  }

  /**
   * Get entity metadata by class.
   * @param target - Entity class
   * @returns Entity metadata or undefined
   * @public API
   */
  static getMetadata(
    target: new (...args: Array<unknown>) => unknown,
  ): EntityMetadata | undefined {
    return this.entities.get(target);
  }

  /**
   * Get entity class by name.
   * @param name - Entity name
   * @returns Entity class or undefined
   * @public API
   */
  static getByName(
    name: string,
  ): (new (...args: Array<unknown>) => unknown) | undefined {
    return this.entityByName.get(name);
  }

  /**
   * Get all registered entities.
   * @returns Array of entity metadata
   * @public API
   */
  static getAll(): Array<EntityMetadata> {
    return Array.from(this.entities.values());
  }

  /**
   * Get index metadata for an entity.
   * @param target - Entity class
   * @returns Array of index metadata
   * @public API
   */
  static getIndexes(
    target: new (...args: Array<unknown>) => unknown,
  ): Array<{
    field: string | symbol;
    name: string;
    composite?: Array<string>;
  }> {
    return Reflect.getMetadata(DB_METADATA_KEYS.index, target) || [];
  }

  /**
   * Get unique field metadata for an entity.
   * @param target - Entity class
   * @returns Array of unique field names
   * @public API
   */
  static getUniqueFields(
    target: new (...args: Array<unknown>) => unknown,
  ): Array<string | symbol> {
    return Reflect.getMetadata(DB_METADATA_KEYS.unique, target) || [];
  }

  /**
   * Get auto-generate metadata for an entity.
   * @param target - Entity class
   * @returns Object mapping field names to generation strategies
   * @public API
   */
  static getAutoGenerateFields(
    target: new (...args: Array<unknown>) => unknown,
  ): Record<string | symbol, AutoGenerateStrategy> {
    return Reflect.getMetadata(DB_METADATA_KEYS.autoGenerate, target) || {};
  }

  /**
   * Get default values for an entity.
   * @param target - Entity class
   * @returns Object mapping field names to default values/factories
   * @public API
   */
  static getDefaults(
    target: new (...args: Array<unknown>) => unknown,
  ): Record<string | symbol, unknown> {
    return Reflect.getMetadata(DB_METADATA_KEYS.default, target) || {};
  }

  /**
   * Get relation metadata for an entity.
   * @param target - Entity class
   * @returns Array of relation metadata
   * @public API
   */
  static getRelations(
    target: new (...args: Array<unknown>) => unknown,
  ): Array<RelationMetadata> {
    return Reflect.getMetadata(DB_METADATA_KEYS.relation, target) || [];
  }

  /**
   * Clear all registered entities (useful for testing).
   * @public API
   */
  static clear(): void {
    this.entities.clear();
    this.entityByName.clear();
  }
}
