// Unit tests for: printTable

import { IMemoryDBEntity, InMemoryDB } from "../db-in-memory.provider";

describe("InMemoryDB.printTable() printTable method", () => {
  let db: InMemoryDB;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    db = new InMemoryDB();
    consoleSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    console.table = jest.fn(); // Mock console.table
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should print records of a non-empty table", () => {
      // Arrange: Add records to a table
      const tableName = "users";
      const records: IMemoryDBEntity[] = [{ id: "1" }, { id: "2" }];
      db.getTable(tableName).push(...records);

      // Act: Call printTable
      db.printTable(tableName);

      // Assert: Check if the records are printed
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Records in table '${tableName}':\n`),
      );
      expect(console.table).toHaveBeenCalledWith(records);
    });
  });

  describe("Edge Cases", () => {
    it("should notify when the table is empty", () => {
      // Arrange: Ensure the table is empty
      const tableName = "emptyTable";

      // Act: Call printTable
      db.printTable(tableName);

      // Assert: Check if the empty table message is printed
      expect(consoleSpy).toHaveBeenCalledWith(`Table '${tableName}' is empty.`);
    });

    it("should notify when no tables exist", () => {
      // Arrange: Clear all tables
      db["tables"] = {};

      // Act: Call printTable on a non-existent table
      db.printTable("nonExistentTable");

      // Assert: Check if the no tables exist message is printed
      expect(consoleSpy).toHaveBeenCalledWith(
        "Table 'nonExistentTable' is empty.",
      );
    });

    it("should handle printing a table with special characters in the name", () => {
      // Arrange: Add records to a table with special characters
      const tableName = "special!@#";
      const records: IMemoryDBEntity[] = [{ id: "1" }];
      db.getTable(tableName).push(...records);

      // Act: Call printTable
      db.printTable(tableName);

      // Assert: Check if the records are printed
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Records in table '${tableName}':\n`),
      );
      expect(console.table).toHaveBeenCalledWith(records);
    });
  });
});

// End of unit tests for: printTable
