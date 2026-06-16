// Unit tests for: InMemoryDBProvider.getDatabase()

import { InMemoryDBProvider } from "../db.provider";

describe("InMemoryDBProvider.getDatabase() getDatabase method", () => {
  let provider: InMemoryDBProvider;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
  });

  describe("Happy Path", () => {
    it("should return database instance", () => {
      // Act
      const database = provider.getDatabase();

      // Assert
      expect(database).toBeDefined();
      expect(database).toHaveProperty("table");
      expect(database).toHaveProperty("snapshot");
      expect(database).toHaveProperty("restore");
    });

    it("should return same database instance", () => {
      // Act
      const db1 = provider.getDatabase();
      const db2 = provider.getDatabase();

      // Assert
      expect(db1).toBe(db2);
    });
  });
});
