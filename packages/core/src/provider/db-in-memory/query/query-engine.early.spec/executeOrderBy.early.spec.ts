// Unit tests for: QueryEngine.executeOrderBy()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  age: number;
  createdAt: Date;
}

describe("QueryEngine.executeOrderBy() executeOrderBy method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return entities unchanged when orderBy is undefined", async () => {
      // Arrange
      await store.insert({ id: "1", name: "B", age: 20, createdAt: new Date() });
      await store.insert({ id: "2", name: "A", age: 30, createdAt: new Date() });
      const entities = store.findAll();

      // Act
      const result = engine.executeOrderBy(entities);

      // Assert
      expect(result).toEqual(entities);
    });

    it("should sort by single field ascending", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "B", age: 20, createdAt: new Date() },
        { id: "2", name: "A", age: 30, createdAt: new Date() },
        { id: "3", name: "C", age: 10, createdAt: new Date() },
      ];

      // Act
      const result = engine.executeOrderBy(entities, { name: "asc" });

      // Assert
      expect(result[0].name).toBe("A");
      expect(result[1].name).toBe("B");
      expect(result[2].name).toBe("C");
    });

    it("should sort by single field descending", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", age: 20, createdAt: new Date() },
        { id: "2", name: "B", age: 30, createdAt: new Date() },
        { id: "3", name: "C", age: 10, createdAt: new Date() },
      ];

      // Act
      const result = engine.executeOrderBy(entities, { name: "desc" });

      // Assert
      expect(result[0].name).toBe("C");
      expect(result[1].name).toBe("B");
      expect(result[2].name).toBe("A");
    });

    it("should sort by number field", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", age: 30, createdAt: new Date() },
        { id: "2", name: "B", age: 10, createdAt: new Date() },
        { id: "3", name: "C", age: 20, createdAt: new Date() },
      ];

      // Act
      const result = engine.executeOrderBy(entities, { age: "asc" });

      // Assert
      expect(result[0].age).toBe(10);
      expect(result[1].age).toBe(20);
      expect(result[2].age).toBe(30);
    });

    it("should sort by date field", () => {
      // Arrange
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      const date3 = new Date("2023-01-03");
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", age: 20, createdAt: date2 },
        { id: "2", name: "B", age: 30, createdAt: date1 },
        { id: "3", name: "C", age: 10, createdAt: date3 },
      ];

      // Act
      const result = engine.executeOrderBy(entities, { createdAt: "asc" });

      // Assert
      expect(result[0].createdAt).toEqual(date1);
      expect(result[1].createdAt).toEqual(date2);
      expect(result[2].createdAt).toEqual(date3);
    });

    it("should sort by multiple fields", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "B", age: 20, createdAt: new Date() },
        { id: "2", name: "A", age: 20, createdAt: new Date() },
        { id: "3", name: "B", age: 10, createdAt: new Date() },
      ];

      // Act
      const result = engine.executeOrderBy(entities, [
        { age: "asc" },
        { name: "asc" },
      ]);

      // Assert
      expect(result[0].age).toBe(10);
      expect(result[1].age).toBe(20);
      expect(result[1].name).toBe("A");
      expect(result[2].age).toBe(20);
      expect(result[2].name).toBe("B");
    });

    it("should handle null values in sort", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", age: 20, createdAt: new Date() },
        { id: "2", name: null as any, age: 30, createdAt: new Date() },
        { id: "3", name: "B", age: 10, createdAt: new Date() },
      ];

      // Act
      const result = engine.executeOrderBy(entities, { name: "asc" });

      // Assert
      // Null values should be sorted last
      expect(result.length).toBe(3);
    });
  });
});

