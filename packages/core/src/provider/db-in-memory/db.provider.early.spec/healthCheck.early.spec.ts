// Unit tests for: InMemoryDBProvider.healthCheck()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("InMemoryDBProvider.healthCheck() healthCheck method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should return healthy status with empty database", () => {
      // Act
      const result = provider.healthCheck();

      // Assert
      expect(result.status).toBe("healthy");
      expect(result.message).toContain("0 tables");
      expect(result.message).toContain("0 total records");
      expect(result.details).toEqual({
        tables: 0,
        records: 0,
        uptime: 0,
      });
    });

    it("should return healthy status with tables and records", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });
      await table.create({ data: { name: "Test2", id: "2" } });

      // Act
      const result = provider.healthCheck();

      // Assert
      expect(result.status).toBe("healthy");
      expect(result.details.tables).toBeGreaterThan(0);
      expect(result.details.records).toBeGreaterThan(0);
    });

    it("should calculate uptime when bootstrap was called", async () => {
      // Arrange
      await provider.bootstrap();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const result = provider.healthCheck();

      // Assert
      expect(result.details.uptime).toBeGreaterThan(0);
    });

    it("should return zero uptime when bootstrap was not called", () => {
      // Act
      const result = provider.healthCheck();

      // Assert
      expect(result.details.uptime).toBe(0);
    });
  });
});

