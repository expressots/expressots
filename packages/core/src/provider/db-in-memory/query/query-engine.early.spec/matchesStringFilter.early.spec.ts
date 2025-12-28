// Unit tests for: QueryEngine.matchesStringFilter()

import { QueryEngine } from "../query-engine";
import { MemoryStore } from "../../storage/memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("QueryEngine.matchesStringFilter() matchesStringFilter method", () => {
  let store: MemoryStore<TestEntity>;
  let engine: QueryEngine<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
    engine = new QueryEngine(store);
  });

  describe("String Filter Operations", () => {
    it("should match equals filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", { equals: "Test" });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match equals filter when different", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", { equals: "Wrong" });

      // Assert
      expect(result).toBe(false);
    });

    it("should match not filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", { not: "Wrong" });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match not filter when equal", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", { not: "Test" });

      // Assert
      expect(result).toBe(false);
    });

    it("should match in filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        in: ["Test", "Other"],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match in filter when not in array", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        in: ["Wrong", "Other"],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match notIn filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        notIn: ["Wrong", "Other"],
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match notIn filter when in array", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        notIn: ["Test", "Other"],
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match contains filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("TestString", {
        contains: "Test",
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match contains filter when not contained", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        contains: "Wrong",
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match startsWith filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("TestString", {
        startsWith: "Test",
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match startsWith filter when not starting with", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        startsWith: "Wrong",
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should match endsWith filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("StringTest", {
        endsWith: "Test",
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should not match endsWith filter when not ending with", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        endsWith: "Wrong",
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should handle case-insensitive mode", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("TEST", {
        equals: "test",
        mode: "insensitive",
      });

      // Assert
      expect(result).toBe(true);
    });

    it("should handle null/undefined values", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result1 = (engine as any).matchesStringFilter(null, { equals: "Test" });
      const result2 = (engine as any).matchesStringFilter(undefined, {
        equals: "Test",
      });

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should handle nested not filter", () => {
      // Arrange
      const entity: TestEntity = { id: "1", name: "Test" };

      // Act
      const result = (engine as any).matchesStringFilter("Test", {
        not: { equals: "Wrong" },
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});

