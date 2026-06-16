// Unit tests for: QueryEngine.executeSelect()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
  age: number;
}

describe("QueryEngine.executeSelect() executeSelect method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Happy Path", () => {
    it("should return all fields when select is undefined", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "Test", email: "test@test.com", age: 25 },
      ];

      // Act
      const result = engine.executeSelect(entities);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("age");
    });

    it("should select only specified fields", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "Test", email: "test@test.com", age: 25 },
      ];

      // Act
      const result = engine.executeSelect(entities, { name: true, age: true });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("age");
      expect(result[0]).not.toHaveProperty("email");
    });

    it("should exclude fields set to false", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "Test", email: "test@test.com", age: 25 },
      ];

      // Act
      const result = engine.executeSelect(entities, {
        name: true,
        email: false,
        age: true,
      });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("age");
      expect(result[0]).not.toHaveProperty("email");
    });

    it("should handle multiple entities", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "Test1", email: "test1@test.com", age: 25 },
        { id: "2", name: "Test2", email: "test2@test.com", age: 30 },
      ];

      // Act
      const result = engine.executeSelect(entities, { name: true });

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).not.toHaveProperty("email");
      expect(result[1]).toHaveProperty("name");
    });

    it("should return all entities when all fields are false", () => {
      // Arrange
      const entities: Array<TestEntity> = [
        { id: "1", name: "Test", email: "test@test.com", age: 25 },
      ];

      // Act
      const result = engine.executeSelect(entities, {
        name: false,
        email: false,
        age: false,
      });

      // Assert
      // When all selected fields are false, the implementation returns all entities
      // (selectedFields.length === 0 check)
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("age");
    });
  });
});
