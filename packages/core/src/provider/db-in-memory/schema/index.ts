/**
 * Schema Module Exports
 * @module db-in-memory/schema
 */

export { IEntity, ITimestampedEntity, ISoftDeleteEntity } from "./entity.interface";

export {
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
  HasMany,
  HasOne,
  BelongsTo,
  ManyToMany,
  RelationType,
  RelationMetadata,
  SchemaRegistry,
  DB_METADATA_KEYS,
} from "./decorators";

