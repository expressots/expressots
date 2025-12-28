// Unit tests for: MemoryStore CRUD operations

import "reflect-metadata";
import { MemoryStore, EntityNotFoundError, EntityAlreadyExistsError, UniqueConstraintError } from "../memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
  deletedAt?: Date;
}

describe("MemoryStore CRUD operations", () => {
  let store: MemoryStore<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
  });

  describe("insertMany()", () => {
    it("should insert multiple entities", () => {
      // Arrange
      const entities = [
        { name: "John", email: "john@example.com" },
        { name: "Jane", email: "jane@example.com" },
      ];

      // Act
      const results = store.insertMany(entities);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("John");
      expect(results[1].name).toBe("Jane");
    });

    it("should skip duplicates when skipDuplicates is true", () => {
      // Arrange
      const entity1 = store.insert({ name: "John", email: "john@example.com" });
      const entities = [
        { id: entity1.id, name: "Duplicate", email: "duplicate@example.com" },
        { name: "Jane", email: "jane@example.com" },
      ];

      // Act
      const results = store.insertMany(entities, true);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Jane");
    });

    it("should throw error on duplicate when skipDuplicates is false", () => {
      // Arrange
      const entity1 = store.insert({ name: "John", email: "john@example.com" });
      const entities = [
        { id: entity1.id, name: "Duplicate", email: "duplicate@example.com" },
      ];

      // Act & Assert
      expect(() => {
        store.insertMany(entities, false);
      }).toThrow(EntityAlreadyExistsError);
    });

    it("should skip unique constraint violations when skipDuplicates is true", () => {
      // Arrange
      // Create a store with unique constraint on email
      const storeWithUnique = new MemoryStore<TestEntity>("test");
      // Manually create index and mark email as unique (simulating schema metadata)
      (storeWithUnique as any).indexManager.createIndex("email");
      (storeWithUnique as any).indexManager.markUnique("email");
      
      storeWithUnique.insert({ name: "John", email: "john@example.com" });
      const entities = [
        { name: "Duplicate", email: "john@example.com" }, // Duplicate email
        { name: "Jane", email: "jane@example.com" },
      ];

      // Act
      const results = storeWithUnique.insertMany(entities, true);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Jane");
    });
  });

  describe("update()", () => {
    it("should throw EntityNotFoundError when entity does not exist", () => {
      // Act & Assert
      expect(() => {
        store.update("non-existent-id", { name: "Updated" });
      }).toThrow(EntityNotFoundError);
    });

    it("should update existing entity", () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });

      // Act
      const updated = store.update(entity.id!, { name: "Updated" });

      // Assert
      expect(updated.name).toBe("Updated");
      expect(updated.email).toBe("john@example.com");
    });
  });

  describe("updateMany()", () => {
    it("should update multiple entities matching predicate", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      store.insert({ name: "Jane", email: "jane@example.com" });
      store.insert({ name: "Bob", email: "bob@example.com" });

      // Act
      const count = store.updateMany(
        (e) => e.name.startsWith("J"),
        { email: "updated@example.com" },
      );

      // Assert
      expect(count).toBe(2);
      const all = store.findAll();
      const john = all.find((e) => e.name === "John");
      const jane = all.find((e) => e.name === "Jane");
      const bob = all.find((e) => e.name === "Bob");
      expect(john?.email).toBe("updated@example.com");
      expect(jane?.email).toBe("updated@example.com");
      expect(bob?.email).toBe("bob@example.com");
    });

    it("should return 0 when no entities match predicate", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });

      // Act
      const count = store.updateMany(
        (e) => e.name === "NonExistent",
        { email: "updated@example.com" },
      );

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("delete()", () => {
    it("should throw EntityNotFoundError when entity does not exist", () => {
      // Act & Assert
      expect(() => {
        store.delete("non-existent-id");
      }).toThrow(EntityNotFoundError);
    });

    it("should perform soft delete when softDelete is enabled", () => {
      // Arrange
      const storeWithSoftDelete = new MemoryStore<TestEntity>("test", {
        softDelete: true,
      });
      const entity = storeWithSoftDelete.insert({
        name: "John",
        email: "john@example.com",
      });

      // Act
      const deleted = storeWithSoftDelete.delete(entity.id!);

      // Assert
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      expect(storeWithSoftDelete.findById(entity.id!)).toBeUndefined();
    });

    it("should perform hard delete when softDelete is disabled", () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });

      // Act
      const deleted = store.delete(entity.id!);

      // Assert
      expect(deleted).toEqual(entity);
      expect(store.findById(entity.id!)).toBeUndefined();
    });
  });

  describe("deleteMany()", () => {
    it("should delete all entities when no predicate provided", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      store.insert({ name: "Jane", email: "jane@example.com" });

      // Act
      const count = store.deleteMany();

      // Assert
      expect(count).toBe(2);
      expect(store.findAll()).toHaveLength(0);
    });

    it("should delete entities matching predicate", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });
      store.insert({ name: "Jane", email: "jane@example.com" });
      store.insert({ name: "Bob", email: "bob@example.com" });

      // Act
      const count = store.deleteMany((e) => e.name.startsWith("J"));

      // Assert
      expect(count).toBe(2);
      const remaining = store.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe("Bob");
    });

    it("should return 0 when no entities match predicate", () => {
      // Arrange
      store.insert({ name: "John", email: "john@example.com" });

      // Act
      const count = store.deleteMany((e) => e.name === "NonExistent");

      // Assert
      expect(count).toBe(0);
      expect(store.findAll()).toHaveLength(1);
    });
  });

  describe("findByIndex()", () => {
    let storeWithIndex: MemoryStore<TestEntity>;

    beforeEach(() => {
      // Create a new store and set up index before inserting entities
      storeWithIndex = new MemoryStore<TestEntity>("test");
      (storeWithIndex as any).indexManager.createIndex("email");
    });

    it("should filter out soft-deleted entities when softDelete is enabled", () => {
      // Arrange
      const storeWithSoftDelete = new MemoryStore<TestEntity>("test", {
        softDelete: true,
      });
      (storeWithSoftDelete as any).indexManager.createIndex("email");
      
      const entity1 = storeWithSoftDelete.insert({
        name: "John",
        email: "john@example.com",
      });
      const entity2 = storeWithSoftDelete.insert({
        name: "Jane",
        email: "jane@example.com",
      });
      (entity2 as any).deletedAt = new Date();

      // Act
      const results = storeWithSoftDelete.findByIndex("email", "jane@example.com");

      // Assert
      expect(results).toHaveLength(0);
    });

    it("should return all matching entities when softDelete is disabled", () => {
      // Arrange
      const entity1 = storeWithIndex.insert({
        name: "John",
        email: "john@example.com",
      });
      const entity2 = storeWithIndex.insert({
        name: "Jane",
        email: "jane@example.com",
      });
      (entity2 as any).deletedAt = new Date();

      // Act
      const results = storeWithIndex.findByIndex("email", "jane@example.com");

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Jane");
    });

    it("should fall back to scan when field is not indexed", () => {
      // Arrange
      const storeNoIndex = new MemoryStore<TestEntity>("test");
      storeNoIndex.insert({ name: "John", email: "john@example.com" });
      storeNoIndex.insert({ name: "Jane", email: "jane@example.com" });

      // Act
      const results = storeNoIndex.findByIndex("name", "John");

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("John");
    });
  });
});

