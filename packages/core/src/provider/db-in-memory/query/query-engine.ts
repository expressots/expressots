/**
 * Query Engine for ExpressoTS In-Memory Database
 *
 * Parses and executes Prisma-like queries against the MemoryStore.
 *
 * @module db-in-memory/query
 */

import { IEntity } from "../schema/entity.interface";
import { MemoryStore } from "../storage/memory-store";
import {
  WhereInput,
  OrderByInput,
  SortOrder,
  StringFilter,
  NumberFilter,
  BooleanFilter,
  DateFilter,
  FindManyArgs,
  SelectInput,
  AggregateArgs,
  AggregateResult,
} from "./query.types";

// ═══════════════════════════════════════════════════════════════════════════
// QUERY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query Engine for parsing and executing Prisma-like queries.
 *
 * Features:
 * - Type-safe where clauses with operators
 * - Logical operators (AND, OR, NOT)
 * - Sorting with multiple fields
 * - Pagination (skip, take, cursor)
 * - Field selection
 * - Aggregations
 *
 * @public API
 */
export class QueryEngine<T extends IEntity> {
  constructor(private store: MemoryStore<T>) {}

  /**
   * Execute a where clause and return matching entities.
   * @param where - Where clause
   * @returns Array of matching entities
   */
  executeWhere(where?: WhereInput<T>): Array<T> {
    if (!where) {
      return this.store.findAll();
    }

    return this.store.find((entity) => this.matchesWhere(entity, where));
  }

  /**
   * Check if an entity matches a where clause.
   * @param entity - Entity to check
   * @param where - Where clause
   * @returns True if entity matches
   */
  matchesWhere(entity: T, where: WhereInput<T>): boolean {
    // Handle logical operators
    if (where.AND) {
      const andClauses = Array.isArray(where.AND) ? where.AND : [where.AND];
      if (!andClauses.every((clause) => this.matchesWhere(entity, clause))) {
        return false;
      }
    }

    if (where.OR) {
      if (!where.OR.some((clause) => this.matchesWhere(entity, clause))) {
        return false;
      }
    }

    if (where.NOT) {
      const notClauses = Array.isArray(where.NOT) ? where.NOT : [where.NOT];
      if (notClauses.some((clause) => this.matchesWhere(entity, clause))) {
        return false;
      }
    }

    // Handle field conditions
    for (const key of Object.keys(where) as Array<keyof typeof where>) {
      if (key === "AND" || key === "OR" || key === "NOT") continue;

      const condition = where[key];
      const entityValue = (entity as Record<string, unknown>)[key as string];

      if (!this.matchesCondition(entityValue, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a value matches a condition.
   * @param value - Value to check
   * @param condition - Condition (value or filter object)
   * @returns True if value matches
   */
  private matchesCondition(value: unknown, condition: unknown): boolean {
    if (condition === undefined) {
      return true;
    }

    // Direct value comparison
    if (
      typeof condition !== "object" ||
      condition === null ||
      condition instanceof Date
    ) {
      return this.compareValues(value, condition);
    }

    // Filter object
    const filter = condition as Record<string, unknown>;

    // String filter
    if (this.isStringFilter(filter)) {
      return this.matchesStringFilter(value as string, filter as StringFilter);
    }

    // Number filter
    if (this.isNumberFilter(filter)) {
      return this.matchesNumberFilter(value as number, filter as NumberFilter);
    }

    // Boolean filter
    if (this.isBooleanFilter(filter)) {
      return this.matchesBooleanFilter(
        value as boolean,
        filter as BooleanFilter,
      );
    }

    // Date filter
    if (this.isDateFilter(filter)) {
      return this.matchesDateFilter(value as Date, filter as DateFilter);
    }

    // Object comparison
    return this.compareValues(value, condition);
  }

  /**
   * Compare two values for equality.
   */
  private compareValues(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    return a === b;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRING FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  private isStringFilter(filter: Record<string, unknown>): boolean {
    const keys = Object.keys(filter);
    const stringFilterKeys = [
      "equals",
      "not",
      "in",
      "notIn",
      "contains",
      "startsWith",
      "endsWith",
      "mode",
    ];
    return keys.some(
      (key) =>
        stringFilterKeys.includes(key) &&
        (typeof filter[key] === "string" ||
          (key === "in" && Array.isArray(filter[key])) ||
          (key === "notIn" && Array.isArray(filter[key])) ||
          key === "mode"),
    );
  }

  private matchesStringFilter(value: string, filter: StringFilter): boolean {
    const mode = filter.mode || "default";
    const normalize = (s: string): string =>
      mode === "insensitive" ? s.toLowerCase() : s;

    if (value === null || value === undefined) {
      return false;
    }

    const normalizedValue = normalize(String(value));

    if (filter.equals !== undefined) {
      if (normalizedValue !== normalize(filter.equals)) return false;
    }

    if (filter.not !== undefined) {
      if (typeof filter.not === "string") {
        if (normalizedValue === normalize(filter.not)) return false;
      } else {
        if (this.matchesStringFilter(value, filter.not)) return false;
      }
    }

    if (filter.in !== undefined) {
      if (!filter.in.map(normalize).includes(normalizedValue)) return false;
    }

    if (filter.notIn !== undefined) {
      if (filter.notIn.map(normalize).includes(normalizedValue)) return false;
    }

    if (filter.contains !== undefined) {
      if (!normalizedValue.includes(normalize(filter.contains))) return false;
    }

    if (filter.startsWith !== undefined) {
      if (!normalizedValue.startsWith(normalize(filter.startsWith)))
        return false;
    }

    if (filter.endsWith !== undefined) {
      if (!normalizedValue.endsWith(normalize(filter.endsWith))) return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMBER FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  private isNumberFilter(filter: Record<string, unknown>): boolean {
    const keys = Object.keys(filter);
    const numberFilterKeys = [
      "equals",
      "not",
      "in",
      "notIn",
      "lt",
      "lte",
      "gt",
      "gte",
    ];
    return keys.some(
      (key) =>
        numberFilterKeys.includes(key) &&
        (typeof filter[key] === "number" ||
          (key === "in" && Array.isArray(filter[key])) ||
          (key === "notIn" && Array.isArray(filter[key])) ||
          (key === "not" && typeof filter[key] === "object")),
    );
  }

  private matchesNumberFilter(value: number, filter: NumberFilter): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (filter.equals !== undefined) {
      if (value !== filter.equals) return false;
    }

    if (filter.not !== undefined) {
      if (typeof filter.not === "number") {
        if (value === filter.not) return false;
      } else {
        if (this.matchesNumberFilter(value, filter.not)) return false;
      }
    }

    if (filter.in !== undefined) {
      if (!filter.in.includes(value)) return false;
    }

    if (filter.notIn !== undefined) {
      if (filter.notIn.includes(value)) return false;
    }

    if (filter.lt !== undefined) {
      if (value >= filter.lt) return false;
    }

    if (filter.lte !== undefined) {
      if (value > filter.lte) return false;
    }

    if (filter.gt !== undefined) {
      if (value <= filter.gt) return false;
    }

    if (filter.gte !== undefined) {
      if (value < filter.gte) return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOLEAN FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  private isBooleanFilter(filter: Record<string, unknown>): boolean {
    const keys = Object.keys(filter);
    return keys.some(
      (key) =>
        (key === "equals" && typeof filter[key] === "boolean") ||
        (key === "not" &&
          (typeof filter[key] === "boolean" ||
            typeof filter[key] === "object")),
    );
  }

  private matchesBooleanFilter(
    value: boolean,
    filter: BooleanFilter,
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (filter.equals !== undefined) {
      if (value !== filter.equals) return false;
    }

    if (filter.not !== undefined) {
      if (typeof filter.not === "boolean") {
        if (value === filter.not) return false;
      } else {
        if (this.matchesBooleanFilter(value, filter.not)) return false;
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  private isDateFilter(filter: Record<string, unknown>): boolean {
    const keys = Object.keys(filter);
    const dateFilterKeys = ["equals", "not", "in", "notIn", "lt", "lte", "gt", "gte"];
    return keys.some(
      (key) =>
        dateFilterKeys.includes(key) &&
        (filter[key] instanceof Date ||
          (key === "in" && Array.isArray(filter[key])) ||
          (key === "notIn" && Array.isArray(filter[key])) ||
          (key === "not" && typeof filter[key] === "object")),
    );
  }

  private matchesDateFilter(value: Date, filter: DateFilter): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const valueTime = value.getTime();

    if (filter.equals !== undefined) {
      if (valueTime !== filter.equals.getTime()) return false;
    }

    if (filter.not !== undefined) {
      if (filter.not instanceof Date) {
        if (valueTime === filter.not.getTime()) return false;
      } else {
        if (this.matchesDateFilter(value, filter.not)) return false;
      }
    }

    if (filter.in !== undefined) {
      if (!filter.in.some((d) => d.getTime() === valueTime)) return false;
    }

    if (filter.notIn !== undefined) {
      if (filter.notIn.some((d) => d.getTime() === valueTime)) return false;
    }

    if (filter.lt !== undefined) {
      if (valueTime >= filter.lt.getTime()) return false;
    }

    if (filter.lte !== undefined) {
      if (valueTime > filter.lte.getTime()) return false;
    }

    if (filter.gt !== undefined) {
      if (valueTime <= filter.gt.getTime()) return false;
    }

    if (filter.gte !== undefined) {
      if (valueTime < filter.gte.getTime()) return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sort entities by order clauses.
   * @param entities - Entities to sort
   * @param orderBy - Order by clause(s)
   * @returns Sorted entities
   */
  executeOrderBy(
    entities: Array<T>,
    orderBy?: OrderByInput<T> | Array<OrderByInput<T>>,
  ): Array<T> {
    if (!orderBy) return entities;

    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

    return [...entities].sort((a, b) => {
      for (const order of orders) {
        for (const [field, direction] of Object.entries(order)) {
          const aValue = (a as Record<string, unknown>)[field];
          const bValue = (b as Record<string, unknown>)[field];

          const comparison = this.compareForSort(
            aValue,
            bValue,
            direction as SortOrder,
          );
          if (comparison !== 0) return comparison;
        }
      }
      return 0;
    });
  }

  private compareForSort(
    a: unknown,
    b: unknown,
    direction: SortOrder,
  ): number {
    const multiplier = direction === "desc" ? -1 : 1;

    if (a === null || a === undefined) return 1 * multiplier;
    if (b === null || b === undefined) return -1 * multiplier;

    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b) * multiplier;
    }

    if (typeof a === "number" && typeof b === "number") {
      return (a - b) * multiplier;
    }

    if (a instanceof Date && b instanceof Date) {
      return (a.getTime() - b.getTime()) * multiplier;
    }

    return 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply pagination to entities.
   * @param entities - Entities to paginate
   * @param skip - Number of entities to skip
   * @param take - Number of entities to take
   * @returns Paginated entities
   */
  executePagination(entities: Array<T>, skip?: number, take?: number): Array<T> {
    let result = entities;

    if (skip !== undefined && skip > 0) {
      result = result.slice(skip);
    }

    if (take !== undefined && take > 0) {
      result = result.slice(0, take);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTINCT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get distinct entities by specified fields.
   * @param entities - Entities to filter
   * @param distinct - Fields to check for distinctness
   * @returns Distinct entities
   */
  executeDistinct(entities: Array<T>, distinct?: Array<keyof T>): Array<T> {
    if (!distinct || distinct.length === 0) return entities;

    const seen = new Set<string>();
    const result: Array<T> = [];

    for (const entity of entities) {
      const key = distinct
        .map((field) => {
          const value = entity[field];
          return JSON.stringify(value);
        })
        .join("|");

      if (!seen.has(key)) {
        seen.add(key);
        result.push(entity);
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply field selection to entities.
   * @param entities - Entities to project
   * @param select - Fields to select
   * @returns Projected entities
   */
  executeSelect(entities: Array<T>, select?: SelectInput<T>): Array<Partial<T>> {
    if (!select) return entities;

    const selectedFields = Object.entries(select)
      .filter(([, included]) => included)
      .map(([field]) => field);

    if (selectedFields.length === 0) return entities;

    return entities.map((entity) => {
      const result: Partial<T> = {};
      for (const field of selectedFields) {
        (result as Record<string, unknown>)[field] = (
          entity as Record<string, unknown>
        )[field];
      }
      return result;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute aggregate operations.
   * @param args - Aggregate arguments
   * @returns Aggregate result
   */
  executeAggregate(args: AggregateArgs<T>): AggregateResult<T> {
    let entities = this.executeWhere(args.where);
    entities = this.executeOrderBy(entities, args.orderBy);
    entities = this.executePagination(entities, args.skip, args.take);

    const result: AggregateResult<T> = {};

    // Count
    if (args._count) {
      if (args._count === true) {
        result._count = entities.length;
      } else {
        const countResult: Record<string, number> = { _all: entities.length };
        for (const [field, include] of Object.entries(args._count)) {
          if (include && field !== "_all") {
            countResult[field] = entities.filter(
              (e) => (e as Record<string, unknown>)[field] !== null,
            ).length;
          }
        }
        result._count = countResult as Partial<Record<keyof T | "_all", number>>;
      }
    }

    // Avg
    if (args._avg) {
      result._avg = {};
      for (const [field, include] of Object.entries(args._avg)) {
        if (include) {
          const values = entities
            .map((e) => (e as Record<string, unknown>)[field])
            .filter((v): v is number => typeof v === "number");
          result._avg[field as keyof T] =
            values.length > 0
              ? values.reduce((a, b) => a + b, 0) / values.length
              : null;
        }
      }
    }

    // Sum
    if (args._sum) {
      result._sum = {};
      for (const [field, include] of Object.entries(args._sum)) {
        if (include) {
          const values = entities
            .map((e) => (e as Record<string, unknown>)[field])
            .filter((v): v is number => typeof v === "number");
          result._sum[field as keyof T] =
            values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
        }
      }
    }

    // Min
    if (args._min) {
      result._min = {} as Partial<T>;
      for (const [field, include] of Object.entries(args._min)) {
        if (include) {
          const values = entities
            .map((e) => (e as Record<string, unknown>)[field])
            .filter((v) => v !== null && v !== undefined);
          if (values.length > 0) {
            (result._min as Record<string, unknown>)[field] = values.reduce(
              (min, v) => (v < min ? v : min),
              values[0],
            );
          }
        }
      }
    }

    // Max
    if (args._max) {
      result._max = {} as Partial<T>;
      for (const [field, include] of Object.entries(args._max)) {
        if (include) {
          const values = entities
            .map((e) => (e as Record<string, unknown>)[field])
            .filter((v) => v !== null && v !== undefined);
          if (values.length > 0) {
            (result._max as Record<string, unknown>)[field] = values.reduce(
              (max, v) => (v > max ? v : max),
              values[0],
            );
          }
        }
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL QUERY EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a full findMany query.
   * @param args - FindMany arguments
   * @returns Array of matching entities
   */
  executeFindMany(args?: FindManyArgs<T>): Array<T> {
    if (!args) return this.store.findAll();

    let entities = this.executeWhere(args.where);
    entities = this.executeDistinct(entities, args.distinct);
    entities = this.executeOrderBy(entities, args.orderBy);
    entities = this.executePagination(entities, args.skip, args.take);

    if (args.select) {
      return this.executeSelect(entities, args.select) as Array<T>;
    }

    return entities;
  }
}

