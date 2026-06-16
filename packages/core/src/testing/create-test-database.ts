/**
 * Database Testing Utilities
 *
 * @module testing
 *
 * Provides automatic test database setup/teardown with fixtures support.
 *
 * @example
 * ```typescript
 * const db = createTestDatabase({
 *   type: "in-memory",
 *   fixtures: [userFixtures, postFixtures]
 * });
 *
 * beforeEach(async () => {
 *   await db.reset();
 * });
 *
 * test("user repository creates user", async () => {
 *   const user = await userRepository.create({ name: "Test" });
 *   const dbUser = await db.findOne("users", { id: user.id });
 *   expect(dbUser).toMatchObject({ name: "Test" });
 * });
 * ```
 */

import {
  CreateTestDatabaseOptions,
  DatabaseFixture,
  ITestDatabase,
} from "./testing.interfaces.js";

/**
 * In-memory storage for test database.
 */
interface InMemoryStore {
  [table: string]: Array<Record<string, unknown>>;
}

/**
 * In-memory database implementation.
 */
class InMemoryDatabase implements ITestDatabase {
  private store: InMemoryStore = {};
  private fixtures: Array<DatabaseFixture> = [];
  private idCounters: Record<string, number> = {};

  constructor(fixtures: Array<DatabaseFixture> = []) {
    this.fixtures = fixtures;
    this.initialize();
  }

  /**
   * Initialize database with fixtures.
   */
  private initialize(): void {
    this.store = {};
    this.idCounters = {};

    for (const fixture of this.fixtures) {
      this.store[fixture.table] = [];

      if (fixture.data) {
        for (const item of fixture.data) {
          this.insertInternal(fixture.table, item as Record<string, unknown>);
        }
      }

      if (fixture.factory) {
        const generated = fixture.factory(10); // Default 10 items
        for (const item of generated) {
          this.insertInternal(fixture.table, item as Record<string, unknown>);
        }
      }
    }
  }

  /**
   * Internal insert without returning.
   */
  private insertInternal(table: string, data: Record<string, unknown>): void {
    if (!this.store[table]) {
      this.store[table] = [];
    }

    // Auto-generate ID if not present
    if (!data.id) {
      this.idCounters[table] = (this.idCounters[table] || 0) + 1;
      data.id = this.idCounters[table];
    } else if (typeof data.id === "number") {
      this.idCounters[table] = Math.max(this.idCounters[table] || 0, data.id);
    }

    this.store[table].push({ ...data });
  }

  /**
   * Reset database to initial state.
   */
  async reset(): Promise<void> {
    this.initialize();
  }

  /**
   * Clear all data.
   */
  async clear(): Promise<void> {
    for (const table of Object.keys(this.store)) {
      this.store[table] = [];
    }
    this.idCounters = {};
  }

  /**
   * Execute raw query (simulated for in-memory).
   * Supports basic SELECT, INSERT, UPDATE, DELETE.
   */
  async query<T>(sql: string, params: Array<unknown> = []): Promise<Array<T>> {
    // Basic SQL parser for in-memory database
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith("select")) {
      return this.executeSelect<T>(sql, params);
    }

    if (sqlLower.startsWith("insert")) {
      return this.executeInsert<T>(sql, params);
    }

    if (sqlLower.startsWith("update")) {
      return this.executeUpdate<T>(sql, params);
    }

    if (sqlLower.startsWith("delete")) {
      return this.executeDelete<T>(sql, params);
    }

    throw new Error(`Unsupported SQL operation: ${sql}`);
  }

  /**
   * Basic SELECT implementation.
   */
  private executeSelect<T>(sql: string, params: Array<unknown>): Array<T> {
    // Extract table name from "SELECT * FROM table_name"
    const match = sql.match(/from\s+(\w+)/i);
    if (!match) {
      throw new Error(`Cannot parse table name from: ${sql}`);
    }

    const table = match[1];
    let records = [...(this.store[table] || [])];

    // Handle WHERE clause
    const whereMatch = sql.match(/where\s+(.+?)(?:order|limit|$)/i);
    if (whereMatch && params.length > 0) {
      const whereClause = whereMatch[1];
      const conditions = whereClause.split(/\s+and\s+/i);

      let paramIndex = 0;
      for (const condition of conditions) {
        const condMatch = condition.match(/(\w+)\s*=\s*\$\d+/);
        if (condMatch && paramIndex < params.length) {
          const field = condMatch[1];
          const value = params[paramIndex++];
          records = records.filter((r) => r[field] === value);
        }
      }
    }

    return records as Array<T>;
  }

  /**
   * Basic INSERT implementation.
   */
  private executeInsert<T>(sql: string, params: Array<unknown>): Array<T> {
    const match = sql.match(/into\s+(\w+)/i);
    if (!match) {
      throw new Error(`Cannot parse table name from: ${sql}`);
    }

    const table = match[1];
    const data: Record<string, unknown> = {};

    // Extract column names
    const colMatch = sql.match(/\(([^)]+)\)/);
    if (colMatch) {
      const columns = colMatch[1].split(",").map((c) => c.trim());
      columns.forEach((col, i) => {
        if (i < params.length) {
          data[col] = params[i];
        }
      });
    }

    this.insertInternal(table, data);
    return [data as T];
  }

  /**
   * Basic UPDATE implementation.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private executeUpdate<T>(sql: string, _params: Array<unknown>): Array<T> {
    const match = sql.match(/update\s+(\w+)/i);
    if (!match) {
      throw new Error(`Cannot parse table name from: ${sql}`);
    }

    const table = match[1];
    const records = this.store[table] || [];

    // Very basic implementation - just returns count
    return [{ count: records.length }] as Array<T>;
  }

  /**
   * Basic DELETE implementation.
   */
  private executeDelete<T>(sql: string, params: Array<unknown>): Array<T> {
    const match = sql.match(/from\s+(\w+)/i);
    if (!match) {
      throw new Error(`Cannot parse table name from: ${sql}`);
    }

    const table = match[1];
    const originalCount = (this.store[table] || []).length;

    // Handle WHERE clause
    const whereMatch = sql.match(/where\s+(.+)/i);
    if (whereMatch && params.length > 0) {
      const whereClause = whereMatch[1];
      const condMatch = whereClause.match(/(\w+)\s*=\s*\$1/);
      if (condMatch) {
        const field = condMatch[1];
        const value = params[0];
        this.store[table] = (this.store[table] || []).filter(
          (r) => r[field] !== value,
        );
      }
    } else {
      this.store[table] = [];
    }

    const deletedCount = originalCount - (this.store[table]?.length || 0);
    return [{ count: deletedCount }] as Array<T>;
  }

  /**
   * Insert data into a table.
   */
  async insert<T>(table: string, data: T): Promise<T> {
    if (!this.store[table]) {
      this.store[table] = [];
    }

    const record = { ...data } as Record<string, unknown>;

    // Auto-generate ID
    if (!record.id) {
      this.idCounters[table] = (this.idCounters[table] || 0) + 1;
      record.id = this.idCounters[table];
    }

    // Add timestamps
    if (!record.createdAt) {
      record.createdAt = new Date();
    }
    if (!record.updatedAt) {
      record.updatedAt = new Date();
    }

    this.store[table].push(record);
    return record as T;
  }

  /**
   * Find records.
   */
  async find<T>(
    table: string,
    where?: Record<string, unknown>,
  ): Promise<Array<T>> {
    const records = this.store[table] || [];

    if (!where) {
      return records as Array<T>;
    }

    return records.filter((record) => {
      return Object.entries(where).every(([key, value]) => {
        return record[key] === value;
      });
    }) as Array<T>;
  }

  /**
   * Find one record.
   */
  async findOne<T>(
    table: string,
    where: Record<string, unknown>,
  ): Promise<T | null> {
    const results = await this.find<T>(table, where);
    return results[0] || null;
  }

  /**
   * Update records.
   */
  async update<T>(
    table: string,
    where: Record<string, unknown>,
    data: Partial<T>,
  ): Promise<number> {
    const records = this.store[table] || [];
    let updatedCount = 0;

    for (const record of records) {
      const matches = Object.entries(where).every(([key, value]) => {
        return record[key] === value;
      });

      if (matches) {
        Object.assign(record, data, { updatedAt: new Date() });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Delete records.
   */
  async delete(table: string, where: Record<string, unknown>): Promise<number> {
    const records = this.store[table] || [];
    const originalLength = records.length;

    this.store[table] = records.filter((record) => {
      return !Object.entries(where).every(([key, value]) => {
        return record[key] === value;
      });
    });

    return originalLength - this.store[table].length;
  }

  /**
   * Get all tables.
   */
  async getTables(): Promise<Array<string>> {
    return Object.keys(this.store);
  }

  /**
   * Count records.
   */
  async count(table: string, where?: Record<string, unknown>): Promise<number> {
    const results = await this.find(table, where);
    return results.length;
  }

  /**
   * Close database connection.
   */
  async close(): Promise<void> {
    this.store = {};
    this.idCounters = {};
  }

  /**
   * Get all data (for debugging).
   */
  getAllData(): InMemoryStore {
    return { ...this.store };
  }
}

/**
 * Create a test database instance.
 *
 * @layer public
 * @audience application-developers
 * @concept testing
 *
 * Provides automatic test database setup/teardown with fixtures.
 *
 * @param options - Database options
 * @returns Test database instance
 *
 * @example
 * ```typescript
 * // In-memory database with fixtures
 * const db = createTestDatabase({
 *   type: "in-memory",
 *   fixtures: [
 *     {
 *       table: "users",
 *       data: [
 *         { id: 1, name: "John", email: "john@test.com" },
 *         { id: 2, name: "Jane", email: "jane@test.com" }
 *       ]
 *     }
 *   ]
 * });
 *
 * // Reset between tests
 * beforeEach(async () => {
 *   await db.reset();
 * });
 *
 * // Use in tests
 * test("creates a user", async () => {
 *   const user = await db.insert("users", { name: "Test" });
 *   expect(user.id).toBeDefined();
 *
 *   const found = await db.findOne("users", { id: user.id });
 *   expect(found?.name).toBe("Test");
 * });
 * ```
 */
export function createTestDatabase(
  options: CreateTestDatabaseOptions = {},
): ITestDatabase {
  const { type = "in-memory", fixtures = [] } = options;

  switch (type) {
    case "in-memory":
      return new InMemoryDatabase(fixtures);

    case "sqlite":
      // SQLite implementation would go here
      console.warn(
        "SQLite test database not yet implemented. Using in-memory.",
      );
      return new InMemoryDatabase(fixtures);

    case "postgres":
    case "mysql":
      // External database implementations would go here
      console.warn(
        `${type} test database not yet implemented. Using in-memory.`,
      );
      return new InMemoryDatabase(fixtures);

    default:
      return new InMemoryDatabase(fixtures);
  }
}

/**
 * Create a fixture factory helper.
 *
 * @example
 * ```typescript
 * const userFactory = createFixtureFactory<User>({
 *   name: (i) => `User ${i}`,
 *   email: (i) => `user${i}@test.com`,
 *   role: "user"
 * });
 *
 * const users = userFactory(5);
 * // Creates 5 users with incremental names and emails
 * ```
 */
export function createFixtureFactory<
  T extends Record<string, unknown>,
>(template: {
  [K in keyof T]: T[K] | ((index: number) => T[K]);
}): (count: number) => Array<T> {
  return (count: number): Array<T> => {
    const items: Array<T> = [];

    for (let i = 0; i < count; i++) {
      const item: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(template)) {
        if (typeof value === "function") {
          item[key] = (value as (index: number) => unknown)(i);
        } else {
          item[key] = value;
        }
      }

      items.push(item as T);
    }

    return items;
  };
}

/**
 * Create fixtures from a template.
 *
 * @example
 * ```typescript
 * const userFixtures = fixture("users", [
 *   { id: 1, name: "Admin", role: "admin" },
 *   { id: 2, name: "User", role: "user" }
 * ]);
 * ```
 */
export function fixture<T>(
  table: string,
  data: Array<T>,
  factory?: (count: number) => Array<T>,
): DatabaseFixture<T> {
  return { table, data, factory };
}
