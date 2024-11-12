// Unit tests for: showTables

import { InMemoryDB } from "../db-in-memory.provider";

describe("InMemoryDB.showTables() showTables method", () => {
  let inMemoryDB: InMemoryDB;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    inMemoryDB = new InMemoryDB();
    consoleSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it('should print "No tables exist." when there are no tables', () => {
      // Arrange: Ensure no tables are present
      inMemoryDB["tables"] = {};

      // Act: Call showTables
      inMemoryDB.showTables();

      // Assert: Check the output
      expect(consoleSpy).toHaveBeenCalledWith("List of tables:");
    });

    it("should print the list of table names when tables exist", () => {
      // Arrange: Add some tables
      inMemoryDB["tables"] = {
        users: [],
        products: [],
      };

      // Act: Call showTables
      inMemoryDB.showTables();

      // Assert: Check the output
      expect(consoleSpy).toHaveBeenCalledWith("List of tables:");
      expect(consoleSpy).toHaveBeenCalledWith("\n- users");
      expect(consoleSpy).toHaveBeenCalledWith("\n- products");
    });
  });

  describe("Edge Cases", () => {
    it("should handle the case where tables object is undefined", () => {
      // Arrange: Set tables to undefined
      inMemoryDB["tables"] = undefined as any;

      // Act: Call showTables
      inMemoryDB.showTables();

      // Assert: Check the output
      expect(consoleSpy).toHaveBeenCalledWith("No tables exist.");
    });

    it("should handle the case where tables object is null", () => {
      // Arrange: Set tables to null
      inMemoryDB["tables"] = null as any;

      // Act: Call showTables
      inMemoryDB.showTables();

      // Assert: Check the output
      expect(consoleSpy).toHaveBeenCalledWith("No tables exist.");
    });

    it("should handle the case where a table name is an empty string", () => {
      // Arrange: Add a table with an empty string as a name
      inMemoryDB["tables"] = {
        "": [],
      };

      // Act: Call showTables
      inMemoryDB.showTables();

      // Assert: Check the output
      expect(consoleSpy).toHaveBeenCalledWith("List of tables:");
      expect(consoleSpy).toHaveBeenCalledWith("\n- ");
    });
  });
});

// End of unit tests for: showTables
