// Unit tests for: QueryEngine.matchesBooleanFilter()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  active: boolean;
}

describe("QueryEngine.matchesBooleanFilter() matchesBooleanFilter method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Boolean Filter Operations", () => {
    it("should match equals filter", () => {
      // Act
      const result = (engine as any).matchesBooleanFilter(true, { equals: true });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match equals filter when different", () => {
      // Act
      const result = (engine as any).matchesBooleanFilter(true, { equals: false });

      // Assert
      expect(result).toBe(false);
    });

    it("should match not filter", () => {
      // Act
      const result = (engine as any).matchesBooleanFilter(true, { not: false });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match not filter when equal", () => {
      // Act
      const result = (engine as any).matchesBooleanFilter(true, { not: true });

      // Assert
      expect(result).toBe(false);
    });

    it("should handle null/undefined values", () => {
      // Act
      const result1 = (engine as any).matchesBooleanFilter(null, { equals: true });
      const result2 = (engine as any).matchesBooleanFilter(undefined, {
        equals: true,
      });

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should handle nested not filter", () => {
      // Act
      const result = (engine as any).matchesBooleanFilter(true, {
        not: { equals: false },
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});

