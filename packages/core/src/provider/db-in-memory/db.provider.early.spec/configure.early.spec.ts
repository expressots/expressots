// Unit tests for: InMemoryDBProvider.configure()

import { InMemoryDBProvider, InMemoryDBConfig } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
}

describe("InMemoryDBProvider.configure() configure method", () => {
  let provider: InMemoryDBProvider;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should update configuration without reinitializing database", () => {
      // Arrange
      const config: Partial<InMemoryDBConfig> = {
        logging: true,
        maxRecordsPerTable: 500,
      };

      // Act
      provider.configure(config);

      // Assert
      expect(provider.getConfig().logging).toBe(true);
      expect(provider.getConfig().maxRecordsPerTable).toBe(500);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Configuration updated:",
        expect.objectContaining({ logging: true }),
      );
    });

    it("should merge partial config with existing config", () => {
      // Arrange
      provider.configure({ logging: true });
      const config: Partial<InMemoryDBConfig> = {
        maxRecordsPerTable: 1000,
      };

      // Act
      provider.configure(config);

      // Assert
      expect(provider.getConfig().logging).toBe(true);
      expect(provider.getConfig().maxRecordsPerTable).toBe(1000);
    });
  });

  describe("Structural Changes", () => {
    it("should reinitialize database when timestamps changes", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });
      consoleLogSpy.mockClear();
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });
      const snapshotBefore = provider.snapshot();

      // Act
      provider.configure({ timestamps: false });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Database reinitialized with new configuration",
      );
      // Data should be restored
      const snapshotAfter = provider.snapshot();
      expect(snapshotAfter).toBe(snapshotBefore);
    });

    it("should reinitialize database when softDelete changes", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });
      consoleLogSpy.mockClear();
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });

      // Act
      provider.configure({ softDelete: true });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Database reinitialized with new configuration",
      );
      expect(provider.getConfig().softDelete).toBe(true);
    });

    it("should reinitialize database when persist is set", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });
      consoleLogSpy.mockClear();
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });

      // Act
      provider.configure({
        persist: {
          storage: "file",
          path: "./test-db.json",
        },
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Database reinitialized with new configuration",
      );
    });

    it("should restore data after reinitialization", async () => {
      // Arrange
      const table = provider.table<TestEntity>("test");
      const entity = await table.create({ data: { name: "Test", id: "1" } });
      const snapshot = provider.snapshot();

      // Act
      provider.configure({ timestamps: false });

      // Assert
      const newTable = provider.table<TestEntity>("test");
      const restored = await newTable.findUnique({ where: { id: "1" } });
      expect(restored).toBeTruthy();
      expect(restored?.name).toBe("Test");
    });

    it("should handle restore failure gracefully", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });
      consoleLogSpy.mockClear();
      const table = provider.table<TestEntity>("test");
      await table.create({ data: { name: "Test", id: "1" } });

      // Ensure snapshot has data (not "{}")
      const snapshot = provider.snapshot();
      expect(snapshot).not.toBe("{}");

      // Mock InMemoryDatabase.prototype.restore to throw for new instances
      const { InMemoryDatabase } = await import("../adapter/in-memory.adapter");
      const originalRestore = InMemoryDatabase.prototype.restore;
      let restoreCallCount = 0;

      // Mock restore to throw on the first call (which will be on the new database instance)
      InMemoryDatabase.prototype.restore = jest
        .fn()
        .mockImplementation(function (this: any, json: string) {
          restoreCallCount++;
          // The first restore call will be on the new database instance created during configure
          if (restoreCallCount === 1) {
            throw new Error("Restore failed");
          }
          return originalRestore.call(this, json);
        });

      // Mock snapshot on the old database to return our snapshot
      const oldDatabase = provider.getDatabase();
      jest.spyOn(oldDatabase, "snapshot").mockReturnValue(snapshot);

      // Act
      provider.configure({ timestamps: false });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Could not restore data after config change, starting fresh",
      );

      // Cleanup
      InMemoryDatabase.prototype.restore = originalRestore;
    });

    it("should not restore empty snapshot", () => {
      // Arrange
      // Ensure database is empty (no tables created)
      const database = provider.getDatabase();
      const snapshot = database.snapshot();
      expect(snapshot).toBe("{}");
      const restoreSpy = jest.spyOn(database, "restore");

      // Act
      provider.configure({ timestamps: false });

      // Assert
      // When snapshot is "{}", restore should not be called
      expect(restoreSpy).not.toHaveBeenCalled();
      restoreSpy.mockRestore();
    });
  });
});
