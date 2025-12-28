// Unit tests for: QueryEngine.matchesNumberFilter()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  age: number;
}

describe("QueryEngine.matchesNumberFilter() matchesNumberFilter method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Number Filter Operations", () => {
    it("should match equals filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { equals: 25 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match equals filter when different", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { equals: 30 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match not filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { not: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match not filter when equal", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { not: 25 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match in filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        in: [20, 25, 30],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match in filter when not in array", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        in: [20, 30, 40],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match notIn filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        notIn: [20, 30],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match notIn filter when in array", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        notIn: [20, 25, 30],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match lt (less than) filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { lt: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match lt filter when greater than or equal", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(30, { lt: 30 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match lte (less than or equal) filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { lte: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should match lte filter when equal", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(30, { lte: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match lte filter when greater", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(35, { lte: 30 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match gt (greater than) filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(35, { gt: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match gt filter when less than or equal", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(30, { gt: 30 });

      // Assert
      expect(result).toBe(false);
    });

    it("should match gte (greater than or equal) filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(35, { gte: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should match gte filter when equal", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(30, { gte: 30 });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match gte filter when less", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, { gte: 30 });

      // Assert
      expect(result).toBe(false);
    });

    it("should handle null/undefined values", () => {
      // Act
      const result1 = (engine as any).matchesNumberFilter(null, { equals: 25 });
      const result2 = (engine as any).matchesNumberFilter(undefined, {
        equals: 25,
      });

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should handle nested not filter", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        not: { equals: 30 },
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should handle multiple filters", () => {
      // Act
      const result = (engine as any).matchesNumberFilter(25, {
        gte: 20,
        lte: 30,
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});
