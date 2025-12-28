// Unit tests for: InMemoryDBProvider.transaction()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

describe("InMemoryDBProvider.transaction() transaction method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should execute transaction successfully", async () => {
      // Arrange
      const usersTable = provider.table<TestEntity>("users");
      const postsTable = provider.table<TestEntity>("posts");

      // Act
      const result = await provider.transaction(async (db) => {
        const user = await db.table<TestEntity>("users").create({
          data: { id: "1", name: "John", email: "john@example.com" },
        });
        await db.table<TestEntity>("posts").create({
          data: { id: "1", name: "Post", email: "post@example.com" },
        });
        return user;
      });

      // Assert
      expect(result).toBeTruthy();
      expect(result.name).toBe("John");
      const user = await usersTable.findUnique({ where: { id: "1" } });
      const post = await postsTable.findUnique({ where: { id: "1" } });
      expect(user).toBeTruthy();
      expect(post).toBeTruthy();
    });

    it("should return transaction result", async () => {
      // Act
      const result = await provider.transaction(async (db) => {
        return "success";
      });

      // Assert
      expect(result).toBe("success");
    });
  });

  describe("Error Handling", () => {
    it("should rollback transaction on error", async () => {
      // Arrange
      const usersTable = provider.table<TestEntity>("users");

      // Act & Assert
      await expect(
        provider.transaction(async (db) => {
          await db.table<TestEntity>("users").create({
            data: { id: "1", name: "John", email: "john@example.com" },
          });
          throw new Error("Transaction error");
        }),
      ).rejects.toThrow("Transaction error");

      // Assert - data should be rolled back
      const user = await usersTable.findUnique({ where: { id: "1" } });
      expect(user).toBeNull();
    });
  });
});
