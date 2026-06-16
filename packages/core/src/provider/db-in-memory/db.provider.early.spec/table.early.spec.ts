// Unit tests for: InMemoryDBProvider.table()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

class TestEntityClass {
  name!: string;
  email!: string;
}

describe("InMemoryDBProvider.table() table method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should return table adapter for given table name", () => {
      // Act
      const table = provider.table<TestEntity>("users");

      // Assert
      expect(table).toBeDefined();
      expect(table.tableName).toBe("users");
    });

    it("should return same adapter for same table name", () => {
      // Act
      const table1 = provider.table<TestEntity>("users");
      const table2 = provider.table<TestEntity>("users");

      // Assert
      expect(table1).toBe(table2);
    });

    it("should return different adapters for different table names", () => {
      // Act
      const usersTable = provider.table<TestEntity>("users");
      const postsTable = provider.table<TestEntity>("posts");

      // Assert
      expect(usersTable).not.toBe(postsTable);
      expect(usersTable.tableName).toBe("users");
      expect(postsTable.tableName).toBe("posts");
    });

    it("should accept entity class for schema metadata", () => {
      // Act
      const table = provider.table<TestEntity>("users", TestEntityClass);

      // Assert
      expect(table).toBeDefined();
      expect(table.tableName).toBe("users");
    });
  });
});
