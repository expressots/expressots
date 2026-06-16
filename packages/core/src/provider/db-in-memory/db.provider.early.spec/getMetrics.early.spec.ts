// Unit tests for: InMemoryDBProvider.getMetrics()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("InMemoryDBProvider.getMetrics() getMetrics method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should return metrics with zero queries", () => {
      // Act
      const metrics = provider.getMetrics();

      // Assert
      expect(metrics["db.tables"]).toBe(0);
      expect(metrics["db.records.total"]).toBe(0);
      expect(metrics["db.queries.total"]).toBe(0);
      expect(metrics["db.queries.avgMs"]).toBe(0);
    });

    it("should return metrics with tables and records", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });
      await table.create({ data: { name: "Test2", id: "2" } });

      // Act
      const metrics = provider.getMetrics();

      // Assert
      expect(metrics["db.tables"]).toBeGreaterThan(0);
      expect(metrics["db.records.total"]).toBeGreaterThan(0);
    });

    it("should include per-table metrics", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });

      // Act
      const metrics = provider.getMetrics();

      // Assert
      expect(metrics["db.table.test.records"]).toBe(1);
      expect(metrics["db.table.test.memory"]).toBeGreaterThanOrEqual(0);
    });

    it("should calculate average query time when queries exist", () => {
      // Arrange
      (provider as any).queryCount = 10;
      (provider as any).totalQueryTime = 100;

      // Act
      const metrics = provider.getMetrics();

      // Assert
      expect(metrics["db.queries.total"]).toBe(10);
      expect(metrics["db.queries.avgMs"]).toBe(10);
    });
  });
});
