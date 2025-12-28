// Unit tests for: InMemoryDBProvider.clear()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("InMemoryDBProvider.clear() clear method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should clear all tables", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { id: "1", name: "Test" } });
      await table.create({ data: { id: "2", name: "Test2" } });

      // Act
      provider.clear();

      // Assert
      const stats = provider.getStats();
      expect(stats.totalRecords).toBe(0);
    });

    it("should clear multiple tables", async () => {
      // Arrange
      const table1 = provider.table<TestEntity>("test1");
      const table2 = provider.table<TestEntity>("test2");
      await table1.create({ data: { id: "1", name: "Test1" } });
      await table2.create({ data: { id: "1", name: "Test2" } });

      // Act
      provider.clear();

      // Assert
      const stats = provider.getStats();
      expect(stats.totalRecords).toBe(0);
      // clear() clears records but doesn't remove tables, so tableCount remains
      expect(stats.tableCount).toBe(2);
    });

    it("should clear empty database without error", () => {
      // Act & Assert
      expect(() => provider.clear()).not.toThrow();
    });
  });
});
