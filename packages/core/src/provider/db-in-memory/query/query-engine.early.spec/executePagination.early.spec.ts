// Unit tests for: QueryEngine.executePagination()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("QueryEngine.executePagination() executePagination method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return all entities when skip and take are undefined", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
      ];

      // Act
      const result = engine.executePagination(entities);

      // Assert
      expect(result.length).toBe(3);
    });

    it("should skip entities when skip is provided", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
      ];

      // Act
      const result = engine.executePagination(entities, 1);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("B");
      expect(result[1].name).toBe("C");
    });

    it("should take entities when take is provided", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
      ];

      // Act
      const result = engine.executePagination(entities, undefined, 2);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("A");
      expect(result[1].name).toBe("B");
    });

    it("should apply both skip and take", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
        { id: "4", name: "D" },
      ];

      // Act
      const result = engine.executePagination(entities, 1, 2);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("B");
      expect(result[1].name).toBe("C");
    });

    it("should handle skip 0", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ];

      // Act
      const result = engine.executePagination(entities, 0, 1);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("A");
    });

    it("should return all entities when take is 0", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ];

      // Act
      const result = engine.executePagination(entities, undefined, 0);

      // Assert
      // When take is 0, the implementation returns all entities (take > 0 check)
      expect(result.length).toBe(2);
    });

    it("should handle skip greater than array length", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ];

      // Act
      const result = engine.executePagination(entities, 10);

      // Assert
      expect(result.length).toBe(0);
    });
  });
});
