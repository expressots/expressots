// Unit tests for: QueryEngine.executeDistinct()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  category: string;
}

describe("QueryEngine.executeDistinct() executeDistinct method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return all entities when distinct is undefined", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", category: "cat1" },
        { id: "2", name: "A", category: "cat2" },
      ];

      // Act
      const result = engine.executeDistinct(entities);

      // Assert
      expect(result.length).toBe(2);
    });

    it("should return all entities when distinct is empty array", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", category: "cat1" },
        { id: "2", name: "B", category: "cat2" },
      ];

      // Act
      const result = engine.executeDistinct(entities, []);

      // Assert
      expect(result.length).toBe(2);
    });

    it("should return distinct entities by single field", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", category: "cat1" },
        { id: "2", name: "A", category: "cat2" },
        { id: "3", name: "B", category: "cat1" },
      ];

      // Act
      const result = engine.executeDistinct(entities, ["name"]);

      // Assert
      expect(result.length).toBe(2);
      expect(result.map((e) => e.name)).toEqual(["A", "B"]);
    });

    it("should return distinct entities by multiple fields", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", category: "cat1" },
        { id: "2", name: "A", category: "cat1" },
        { id: "3", name: "A", category: "cat2" },
        { id: "4", name: "B", category: "cat1" },
      ];

      // Act
      const result = engine.executeDistinct(entities, ["name", "category"]);

      // Assert
      expect(result.length).toBe(3);
    });

    it("should keep first occurrence of duplicate", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A", category: "cat1" },
        { id: "2", name: "A", category: "cat2" },
      ];

      // Act
      const result = engine.executeDistinct(entities, ["name"]);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });
  });
});

