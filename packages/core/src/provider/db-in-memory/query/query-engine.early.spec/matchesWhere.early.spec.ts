// Unit tests for: QueryEngine.matchesWhere()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  age: number;
  active: boolean;
}

describe("QueryEngine.matchesWhere() matchesWhere method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("Logical Operators", () => {
    it("should match AND conditions", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        AND: [{ name: "Test" }, { age: 25 }],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match AND when one condition fails", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        AND: [{ name: "Test" }, { age: 30 }],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match OR conditions", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        OR: [{ name: "Wrong" }, { age: 25 }],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match OR when all conditions fail", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        OR: [{ name: "Wrong" }, { age: 30 }],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match NOT conditions", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        NOT: { name: "Wrong" },
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match NOT when condition matches", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        NOT: { name: "Test" },
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should handle single AND clause (not array)", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        AND: { name: "Test" },
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should handle single NOT clause (not array)", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test", age: 25, active: true };

      // Act
      const result = (engine as any).matchesWhere(entity, {
        NOT: { name: "Wrong" },
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});

