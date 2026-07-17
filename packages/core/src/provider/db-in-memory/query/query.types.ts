/**
 * Query Types for ExpressoTS In-Memory Database
 *
 * Prisma-inspired type-safe query interfaces that provide
 * a familiar, intuitive API for database operations.
 *
 * @module db-in-memory/query
 */

import { IEntity } from "../schema/entity.interface.js";

// ═══════════════════════════════════════════════════════════════════════════
// STRING FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter operations for string fields.
 * @public API
 */
export interface StringFilter {
  equals?: string;
  not?: string | StringFilter;
  in?: Array<string>;
  notIn?: Array<string>;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  /** Case-insensitive matching (default: false) */
  mode?: "default" | "insensitive";
}

// ═══════════════════════════════════════════════════════════════════════════
// NUMBER FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter operations for number fields.
 * @public API
 */
export interface NumberFilter {
  equals?: number;
  not?: number | NumberFilter;
  in?: Array<number>;
  notIn?: Array<number>;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOLEAN FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter operations for boolean fields.
 * @public API
 */
export interface BooleanFilter {
  equals?: boolean;
  not?: boolean | BooleanFilter;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATE FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter operations for date fields.
 * @public API
 */
export interface DateFilter {
  equals?: Date;
  not?: Date | DateFilter;
  in?: Array<Date>;
  notIn?: Array<Date>;
  lt?: Date;
  lte?: Date;
  gt?: Date;
  gte?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC FIELD FILTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Union type for all field filters.
 * @public API
 */
export type FieldFilter =
  | StringFilter
  | NumberFilter
  | BooleanFilter
  | DateFilter;

/**
 * Helper type to resolve the filter type for a field.
 * Uses NonNullable to properly handle optional fields (e.g., age?: number).
 * @internal
 */
type FieldFilterType<T> =
  NonNullable<T> extends string
    ? string | StringFilter | null
    : NonNullable<T> extends number
      ? number | NumberFilter | null
      : NonNullable<T> extends boolean
        ? boolean | BooleanFilter | null
        : NonNullable<T> extends Date
          ? Date | DateFilter | null
          : T;

/**
 * Generic where input that works with any entity type.
 * Supports field-level filters and logical operators.
 * Properly handles optional fields by using NonNullable.
 * @public API
 */
export type WhereInput<T> = {
  [K in keyof T]?: FieldFilterType<T[K]>;
} & {
  AND?: WhereInput<T> | Array<WhereInput<T>>;
  OR?: Array<WhereInput<T>>;
  NOT?: WhereInput<T> | Array<WhereInput<T>>;
};

// ═══════════════════════════════════════════════════════════════════════════
// ORDER BY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sort direction.
 * @public API
 */
export type SortOrder = "asc" | "desc";

/**
 * Order by input for sorting results.
 * @public API
 */
export type OrderByInput<T> = {
  [K in keyof T]?: SortOrder;
};

// ═══════════════════════════════════════════════════════════════════════════
// SELECT & INCLUDE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select specific fields to return.
 * @public API
 */
export type SelectInput<T> = {
  [K in keyof T]?: boolean;
};

/**
 * Include related entities.
 * @public API
 */
export type IncludeInput<T> = {
  // NonNullable so optional relation properties (posts?: Post[]) still
  // resolve to their element type instead of collapsing to undefined.
  [K in keyof T]?: NonNullable<T[K]> extends Array<infer U>
    ? boolean | FindManyArgs<U extends IEntity ? U : never>
    : NonNullable<T[K]> extends IEntity
      ? boolean | FindUniqueArgs<NonNullable<T[K]>>
      : never;
};

// ═══════════════════════════════════════════════════════════════════════════
// FIND ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for finding a single unique record.
 * @public API
 */
export interface FindUniqueArgs<T> {
  where: WhereUniqueInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
}

/**
 * Where input for unique lookups (requires unique field).
 * @public API
 */
export type WhereUniqueInput<T> = {
  id?: string;
} & Partial<T>;

/**
 * Arguments for finding the first matching record.
 * @public API
 */
export interface FindFirstArgs<T> {
  where?: WhereInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
  orderBy?: OrderByInput<T> | Array<OrderByInput<T>>;
  skip?: number;
}

/**
 * Arguments for finding multiple records.
 * @public API
 */
export interface FindManyArgs<T> {
  where?: WhereInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
  orderBy?: OrderByInput<T> | Array<OrderByInput<T>>;
  skip?: number;
  take?: number;
  cursor?: WhereUniqueInput<T>;
  distinct?: Array<keyof T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for creating a single record.
 * @public API
 */
export interface CreateArgs<T> {
  data: CreateInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
}

/**
 * Input data for creating a record.
 * @public API
 */
export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

/**
 * Arguments for creating multiple records.
 * @public API
 */
export interface CreateManyArgs<T> {
  data: Array<CreateInput<T>>;
  skipDuplicates?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for updating a single record.
 * @public API
 */
export interface UpdateArgs<T> {
  where: WhereUniqueInput<T>;
  data: UpdateInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
}

/**
 * Input data for updating a record.
 * @public API
 */
export type UpdateInput<T> = Partial<Omit<T, "id" | "createdAt">>;

/**
 * Arguments for updating multiple records.
 * @public API
 */
export interface UpdateManyArgs<T> {
  where: WhereInput<T>;
  data: UpdateInput<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPSERT ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for upserting (update or insert) a record.
 * @public API
 */
export interface UpsertArgs<T> {
  where: WhereUniqueInput<T>;
  create: CreateInput<T>;
  update: UpdateInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for deleting a single record.
 * @public API
 */
export interface DeleteArgs<T> {
  where: WhereUniqueInput<T>;
  select?: SelectInput<T>;
  include?: IncludeInput<T>;
}

/**
 * Arguments for deleting multiple records.
 * @public API
 */
export interface DeleteManyArgs<T> {
  where?: WhereInput<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COUNT & AGGREGATE ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for counting records.
 * @public API
 */
export interface CountArgs<T> {
  where?: WhereInput<T>;
  cursor?: WhereUniqueInput<T>;
  skip?: number;
  take?: number;
  orderBy?: OrderByInput<T> | Array<OrderByInput<T>>;
  select?: CountSelect<T>;
}

/**
 * Select specific fields for count.
 * @public API
 */
export type CountSelect<T> = {
  [K in keyof T]?: boolean;
} & {
  _all?: boolean;
};

/**
 * Arguments for aggregate operations.
 * @public API
 */
export interface AggregateArgs<T> {
  where?: WhereInput<T>;
  cursor?: WhereUniqueInput<T>;
  skip?: number;
  take?: number;
  orderBy?: OrderByInput<T> | Array<OrderByInput<T>>;
  _count?: boolean | CountSelect<T>;
  _avg?: NumericFieldsOnly<T>;
  _sum?: NumericFieldsOnly<T>;
  _min?: SelectInput<T>;
  _max?: SelectInput<T>;
}

/**
 * Select only numeric fields for avg/sum operations.
 * Uses NonNullable to properly handle optional number fields (e.g., age?: number).
 * @public API
 */
export type NumericFieldsOnly<T> = {
  [K in keyof T as NonNullable<T[K]> extends number ? K : never]?: boolean;
};

/**
 * Result of aggregate operations.
 * @public API
 */
export interface AggregateResult<T> {
  _count?: number | Partial<Record<keyof T | "_all", number>>;
  _avg?: Partial<Record<keyof T, number | null>>;
  _sum?: Partial<Record<keyof T, number | null>>;
  _min?: Partial<T>;
  _max?: Partial<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP BY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arguments for grouping records.
 * @public API
 */
export interface GroupByArgs<T> {
  where?: WhereInput<T>;
  by: Array<keyof T>;
  having?: WhereInput<T>;
  orderBy?: OrderByInput<T> | Array<OrderByInput<T>>;
  skip?: number;
  take?: number;
  _count?: boolean | CountSelect<T>;
  _avg?: NumericFieldsOnly<T>;
  _sum?: NumericFieldsOnly<T>;
  _min?: SelectInput<T>;
  _max?: SelectInput<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS RESULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of batch operations (createMany, updateMany, deleteMany).
 * @public API
 */
export interface BatchPayload {
  count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transaction client interface for nested transactions.
 * @public API
 */
export interface TransactionClient<T extends IEntity = IEntity> {
  findUnique(args: FindUniqueArgs<T>): Promise<T | null>;
  findFirst(args: FindFirstArgs<T>): Promise<T | null>;
  findMany(args?: FindManyArgs<T>): Promise<Array<T>>;
  create(args: CreateArgs<T>): Promise<T>;
  update(args: UpdateArgs<T>): Promise<T>;
  delete(args: DeleteArgs<T>): Promise<T>;
}
