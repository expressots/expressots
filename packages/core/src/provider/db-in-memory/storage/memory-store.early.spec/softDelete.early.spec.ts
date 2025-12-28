// Unit tests for: MemoryStore softDelete functionality

import "reflect-metadata";
import { MemoryStore } from "../memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
  deletedAt?: Date;
}

describe("MemoryStore softDelete", () => {
  let store: MemoryStore<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test", { softDelete: true });
  });

  describe("findByIndex()", () => {
    it("should filter out soft-deleted entities when softDelete is enabled", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      const entity2 = store.insert({ name: "Jane", email: "jane@example.com" });
      (entity2 as any).deletedAt = new Date();

      // Act - use findByIndex to test softDelete filtering
      const result = store.findByIndex("name", "Jane");

      // Assert
      expect(result).toHaveLength(0); // Soft-deleted entity filtered out
    });

    it("should return all entities when softDelete is disabled", () => {
      // Arrange
      const storeNoSoftDelete = new MemoryStore<TestEntity>("test", {
        softDelete: false,
      });
      storeNoSoftDelete.insert({ name: "John", email: "john@example.com" });
      const entity2 = storeNoSoftDelete.insert({
        name: "Jane",
        email: "jane@example.com",
      });
      (entity2 as any).deletedAt = new Date();

      // Act
      const result = storeNoSoftDelete.findByIndex("name", "Jane");

      // Assert
      expect(result).toHaveLength(1); // Not filtered when softDelete is false
    });
  });

  describe("findAll()", () => {
    it("should filter out soft-deleted entities when softDelete is enabled", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      const entity2 = store.insert({ name: "Jane", email: "jane@example.com" });
      (entity2 as any).deletedAt = new Date();

      // Act
      const result = store.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John");
    });

    it("should return all entities when softDelete is disabled", () => {
      // Arrange
      const storeNoSoftDelete = new MemoryStore<TestEntity>("test", {
        softDelete: false,
      });
      storeNoSoftDelete.insert({ name: "John", email: "john@example.com" });
      const entity2 = storeNoSoftDelete.insert({
        name: "Jane",
        email: "jane@example.com",
      });
      (entity2 as any).deletedAt = new Date();

      // Act
      const result = storeNoSoftDelete.findAll();

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe("findFirst()", () => {
    it("should skip soft-deleted entities", () => {
      // Arrange
      const entity1 = store.insert({ name: "John", email: "john@example.com" });
      (entity1 as any).deletedAt = new Date();
      store.insert({ name: "Jane", email: "jane@example.com" });

      // Act
      const result = store.findFirst((e) => e.name.startsWith("J"));

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe("Jane");
    });

    it("should return undefined when all matching entities are soft-deleted", () => {
      // Arrange
      const entity1 = store.insert({ name: "John", email: "john@example.com" });
      (entity1 as any).deletedAt = new Date();

      // Act
      const result = store.findFirst((e) => e.name.startsWith("J"));

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("count()", () => {
    it("should exclude soft-deleted entities when softDelete is enabled", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      const entity2 = store.insert({ name: "Jane", email: "jane@example.com" });
      (entity2 as any).deletedAt = new Date();

      // Act
      const count = store.count();

      // Assert
      expect(count).toBe(1);
    });

    it("should count with predicate excluding soft-deleted", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      const entity2 = store.insert({ name: "Jane", email: "jane@example.com" });
      (entity2 as any).deletedAt = new Date();

      // Act
      const count = store.count((e) => e.name.startsWith("J"));

      // Assert
      expect(count).toBe(1); // Only John, Jane is soft-deleted
    });
  });

  describe("exists()", () => {
    it("should return false for soft-deleted entity", () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });
      (entity as any).deletedAt = new Date();

      // Act
      const exists = store.exists(entity.id!);

      // Assert
      expect(exists).toBe(false);
    });

    it("should return true for non-deleted entity", () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });

      // Act
      const exists = store.exists(entity.id!);

      // Assert
      expect(exists).toBe(true);
    });
  });
});

