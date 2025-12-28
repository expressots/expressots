// Unit tests for: InMemoryDBProvider.getStats()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("InMemoryDBProvider.getStats() getStats method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should return stats for empty database", () => {
      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats.tableCount).toBe(0);
      expect(stats.totalRecords).toBe(0);
      expect(stats.tables).toEqual([]);
    });

    it("should return stats with tables and records", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { id: "1", name: "Test" } });
      await table.create({ data: { id: "2", name: "Test2" } });

      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats.tableCount).toBeGreaterThan(0);
      expect(stats.totalRecords).toBeGreaterThan(0);
      expect(stats.tables.length).toBeGreaterThan(0);
    });

    it("should include table details in stats", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { id: "1", name: "Test" } });

      // Act
      const stats = provider.getStats();

      // Assert
      const testTable = stats.tables.find((t) => t.tableName === "test");
      expect(testTable).toBeTruthy();
      expect(testTable?.recordCount).toBe(1);
      expect(testTable?.indexes).toBeDefined();
      expect(testTable?.memoryEstimate).toBeGreaterThanOrEqual(0);
    });
  });
});

