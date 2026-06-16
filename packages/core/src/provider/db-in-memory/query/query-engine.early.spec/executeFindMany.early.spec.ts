// Unit tests for: QueryEngine.executeFindMany()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  age: number;
}

describe("QueryEngine.executeFindMany() executeFindMany method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return all entities when args is undefined", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20 });
      await store.insert({ id: "2", name: "Test2", age: 30 });

      // Act
      const result = engine.executeFindMany();

      // Assert
      expect(result.length).toBe(2);
    });

    it("should filter with where clause", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20 });
      await store.insert({ id: "2", name: "Test2", age: 30 });

      // Act
      const result = engine.executeFindMany({ where: { age: { gte: 25 } } });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].age).toBe(30);
    });

    it("should apply distinct", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test", age: 20 });
      await store.insert({ id: "2", name: "Test", age: 30 });

      // Act
      const result = engine.executeFindMany({ distinct: ["name"] });

      // Assert
      expect(result.length).toBe(1);
    });

    it("should apply orderBy", async () => {
      // Arrange
      await store.insert({ id: "1", name: "B", age: 20 });
      await store.insert({ id: "2", name: "A", age: 30 });

      // Act
      const result = engine.executeFindMany({ orderBy: { name: "asc" } });

      // Assert
      expect(result[0].name).toBe("A");
      expect(result[1].name).toBe("B");
    });

    it("should apply pagination", async () => {
      // Arrange
      await store.insert({ id: "1", name: "A", age: 20 });
      await store.insert({ id: "2", name: "B", age: 30 });
      await store.insert({ id: "3", name: "C", age: 40 });

      // Act
      const result = engine.executeFindMany({ skip: 1, take: 1 });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("B");
    });

    it("should apply select", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test", age: 20 });

      // Act
      const result = engine.executeFindMany({ select: { name: true } });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).not.toHaveProperty("age");
    });

    it("should combine all operations", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test", age: 20 });
      await store.insert({ id: "2", name: "Test", age: 30 });
      await store.insert({ id: "3", name: "Other", age: 25 });

      // Act
      const result = engine.executeFindMany({
        where: { age: { gte: 20 } },
        distinct: ["name"],
        orderBy: { name: "asc" },
        skip: 0,
        take: 1,
        select: { name: true },
      });

      // Assert
      expect(result.length).toBe(1);
    });
  });
});
