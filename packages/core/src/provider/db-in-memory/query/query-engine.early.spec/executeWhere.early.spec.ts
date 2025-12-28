// Unit tests for: QueryEngine.executeWhere()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  age: number;
  active: boolean;
}

describe("QueryEngine.executeWhere() executeWhere method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return all entities when where is undefined", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, active: true });
      await store.insert({ id: "2", name: "Test2", age: 30, active: false });

      // Act
      const result = engine.executeWhere(undefined);

      // Assert
      expect(result.length).toBe(2);
    });

    it("should filter by simple equality", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, active: true });
      await store.insert({ id: "2", name: "Test2", age: 30, active: false });

      // Act
      const result = engine.executeWhere({ name: "Test1" });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Test1");
    });

    it("should filter by number equality", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, active: true });
      await store.insert({ id: "2", name: "Test2", age: 30, active: false });

      // Act
      const result = engine.executeWhere({ age: 20 });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].age).toBe(20);
    });

    it("should filter by boolean equality", async () => {
      // Arrange
      await store.insert({ id: "1", name: "Test1", age: 20, active: true });
      await store.insert({ id: "2", name: "Test2", age: 30, active: false });

      // Act
      const result = engine.executeWhere({ active: true });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].active).toBe(true);
    });
  });
});
