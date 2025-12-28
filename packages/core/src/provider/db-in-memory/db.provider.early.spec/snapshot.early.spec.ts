// Unit tests for: InMemoryDBProvider.snapshot() and restore()

import { InMemoryDBProvider } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

describe("InMemoryDBProvider.snapshot() and restore() methods", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("snapshot()", () => {
    it("should create snapshot of empty database", () => {
      // Act
      const snapshot = provider.snapshot();

      // Assert
      expect(snapshot).toBeTruthy();
      expect(typeof snapshot).toBe("string");
      expect(snapshot).toBe("{}");
    });

    it("should create snapshot with data", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const snapshot = provider.snapshot();

      // Assert
      expect(snapshot).toBeTruthy();
      expect(snapshot).toContain("test");
      expect(snapshot).toContain("Test");
    });
  });

  describe("restore()", () => {
    it("should restore empty snapshot", () => {
      // Act
      provider.restore("{}");

      // Assert
      const stats = provider.getStats();
      expect(stats.totalRecords).toBe(0);
    });

    it("should restore data from snapshot", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
      const snapshot = provider.snapshot();
      provider.clear();

      // Act
      provider.restore(snapshot);

      // Assert
      const restored = await table.findUnique({ where: { id: "1" } });
      expect(restored).toBeTruthy();
      expect(restored?.name).toBe("Test");
    });

    it("should restore multiple tables from snapshot", async () => {
      // Arrange
      const usersTable = provider.table<TestEntity>("users");
      const postsTable = provider.table<TestEntity>("posts");
      await usersTable.create({ data: { id: "1", name: "User", email: "user@test.com" } });
      await postsTable.create({ data: { id: "1", name: "Post", email: "post@test.com" } });
      const snapshot = provider.snapshot();
      provider.clear();

      // Act
      provider.restore(snapshot);

      // Assert
      const user = await usersTable.findUnique({ where: { id: "1" } });
      const post = await postsTable.findUnique({ where: { id: "1" } });
      expect(user).toBeTruthy();
      expect(post).toBeTruthy();
    });
  });
});

