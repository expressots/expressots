// Unit tests for: QueryEngine.executeAggregate()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  age: number;
  score: number;
}

describe("QueryEngine.executeAggregate() executeAggregate method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should count all entities", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({ _count: true });

      // Assert
      expect(result._count).toBe(2);
    });

    it("should count with where clause", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({
        where: { age: { gte: 25 } },
        _count: true,
      });

      // Assert
      expect(result._count).toBe(1);
    });

    it("should calculate average", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({ _avg: { score: true } });

      // Assert
      expect(result._avg).toBeDefined();
      expect(result._avg?.score).toBe(150);
    });

    it("should calculate sum", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({ _sum: { score: true } });

      // Assert
      expect(result._sum).toBeDefined();
      expect(result._sum?.score).toBe(300);
    });

    it("should find minimum", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({ _min: { score: true } });

      // Assert
      expect(result._min).toBeDefined();
      expect(result._min?.score).toBe(100);
    });

    it("should find maximum", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({ _max: { score: true } });

      // Assert
      expect(result._max).toBeDefined();
      expect(result._max?.score).toBe(200);
    });

    it("should handle multiple aggregations", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({
        _count: true,
        _avg: { score: true },
        _sum: { score: true },
        _min: { score: true },
        _max: { score: true },
      });

      // Assert
      expect(result._count).toBe(2);
      expect(result._avg?.score).toBe(150);
      expect(result._sum?.score).toBe(300);
      expect(result._min?.score).toBe(100);
      expect(result._max?.score).toBe(200);
    });

    it("should handle field-specific count", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: 100 });
      await store.insert({ id: "2", name: "Test2", age: 30, score: 200 });

      // Act
      const result = engine.executeAggregate({
        _count: { name: true, age: true, _all: true },
      });

      // Assert
      expect(result._count).toBeDefined();
      expect((result._count as any)._all).toBe(2);
    });

    it("should return null for avg when no numeric values", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: null as any });

      // Act
      const result = engine.executeAggregate({ _avg: { score: true } });

      // Assert
      expect(result._avg?.score).toBeNull();
    });

    it("should return null for sum when no numeric values", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, score: null as any });

      // Act
      const result = engine.executeAggregate({ _sum: { score: true } });

      // Assert
      expect(result._sum?.score).toBeNull();
    });
  });
});

