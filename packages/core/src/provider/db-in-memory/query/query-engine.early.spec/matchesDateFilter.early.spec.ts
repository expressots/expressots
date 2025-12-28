// Unit tests for: QueryEngine.matchesDateFilter()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  createdAt: Date;
}

describe("QueryEngine.matchesDateFilter() matchesDateFilter method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Date Filter Operations", () => {
    it("should match equals filter", () => {
      // Arrange
      const date = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date, { equals: date });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match equals filter when different", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { equals: date2 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match not filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { not: date2 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match not filter when equal", () => {
      // Arrange
      const date = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date, { not: date });

      // Assert
      expect(result).toBe(false);
    });

    it("should match in filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      const date3 = new Date("2023-01-03");

      // Act
      const result = (engine as any).matchesDateFilter(date1, {
        in: [date1, date2, date3],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match in filter when not in array", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      const date3 = new Date("2023-01-03");

      // Act
      const result = (engine as any).matchesDateFilter(date1, {
        in: [date2, date3],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match notIn filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      const date3 = new Date("2023-01-03");

      // Act
      const result = (engine as any).matchesDateFilter(date1, {
        notIn: [date2, date3],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match notIn filter when in array", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, {
        notIn: [date1, date2],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match lt (less than) filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { lt: date2 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match lt filter when greater than or equal", () => {
      // Arrange
      const date1 = new Date("2023-01-02");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { lt: date2 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match lte (less than or equal) filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { lte: date2 });

      // Assert
      expect(result).toBe(true);
    });

    it("should match lte filter when equal", () => {
      // Arrange
      const date = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date, { lte: date });

      // Assert
      expect(result).toBe(true);
    });

    it("should match gt (greater than) filter", () => {
      // Arrange
      const date1 = new Date("2023-01-02");
      const date2 = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { gt: date2 });

      // Assert
      expect(result).toBe(true);
    });

    it("should match gte (greater than or equal) filter", () => {
      // Arrange
      const date1 = new Date("2023-01-02");
      const date2 = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date1, { gte: date2 });

      // Assert
      expect(result).toBe(true);
    });

    it("should match gte filter when equal", () => {
      // Arrange
      const date = new Date("2023-01-01");

      // Act
      const result = (engine as any).matchesDateFilter(date, { gte: date });

      // Assert
      expect(result).toBe(true);
    });

    it("should handle null/undefined values", () => {
      // Arrange
      const date = new Date("2023-01-01");

      // Act
      const result1 = (engine as any).matchesDateFilter(null, { equals: date });
      const result2 = (engine as any).matchesDateFilter(undefined, {
        equals: date,
      });

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should handle nested not filter", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      // Act
      const result = (engine as any).matchesDateFilter(date1, {
        not: { equals: date2 },
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});

