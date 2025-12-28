// Unit tests for: MemoryStore transactions

import "reflect-metadata";
import { MemoryStore } from "../memory-store";
import { IEntity } from "../../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

describe("MemoryStore transactions", () => {
  let store: MemoryStore<TestEntity>;

  beforeEach(() => {
    store = new MemoryStore<TestEntity>("test");
  });

  describe("rollbackTransaction()", () => {
    it("should throw error when no transaction is active", () => {
      // Act & Assert
      expect(() => {
        store.rollbackTransaction();
      }).toThrow("No active transaction to rollback");
    });

    it("should restore data and rebuild indexes after rollback", () => {
      // Arrange
      const entity1 = store.insert({ name: "John", email: "john@example.com" });
      store.beginTransaction();
      const entity2 = store.insert({ name: "Jane", email: "jane@example.com" });
      store.update(entity1.id!, { name: "Updated" });

      // Act
      store.rollbackTransaction();

      // Assert
      const all = store.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe("John"); // Original name restored
      expect(store.findById(entity2.id!)).toBeUndefined(); // New entity removed
    });
  });

  describe("transaction()", () => {
    it("should rollback on error", async () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });

      // Act & Assert
      await expect(
        store.transaction(async () => {
          store.update(entity.id!, { name: "Updated" });
          throw new Error("Transaction error");
        }),
      ).rejects.toThrow("Transaction error");

      // Data should be rolled back
      const restored = store.findById(entity.id!);
      expect(restored?.name).toBe("John");
    });

    it("should commit on success", async () => {
      // Arrange
      const entity = store.insert({ name: "John", email: "john@example.com" });

      // Act
      await store.transaction(async () => {
        store.update(entity.id!, { name: "Updated" });
      });

      // Assert
      const updated = store.findById(entity.id!);
      expect(updated?.name).toBe("Updated");
    });
  });
});

