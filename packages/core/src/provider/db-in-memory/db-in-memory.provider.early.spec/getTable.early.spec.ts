// Unit tests for: getTable

import { IMemoryDBEntity, InMemoryDB } from "../db-in-memory.provider";

describe("InMemoryDB.getTable() getTable method", () => {
  let db: InMemoryDB;

  beforeEach(() => {
    db = new InMemoryDB();
  });

  describe("Happy Path", () => {
    it("should return an empty array when a new table is requested", () => {
      // Test to ensure that requesting a new table returns an empty array
      const tableName = "newTable";
      const result = db.getTable(tableName);
      expect(result).toEqual([]);
    });

    it("should return the same table when requested multiple times", () => {
      // Test to ensure that the same table is returned on multiple requests
      const tableName = "existingTable";
      const firstCall = db.getTable(tableName);
      const secondCall = db.getTable(tableName);
      expect(firstCall).toBe(secondCall);
    });

    it("should allow adding entities to a table and retrieve them", () => {
      // Test to ensure entities can be added to a table and retrieved
      const tableName = "entityTable";
      const entity: IMemoryDBEntity = { id: "1" };
      const table = db.getTable(tableName);
      table.push(entity);
      const result = db.getTable(tableName);
      expect(result).toContain(entity);
    });
  });

  describe("Edge Cases", () => {
    it("should handle table names with special characters", () => {
      // Test to ensure table names with special characters are handled
      const tableName = "special!@#$%^&*()_+";
      const result = db.getTable(tableName);
      expect(result).toEqual([]);
    });

    it("should handle very long table names", () => {
      // Test to ensure very long table names are handled
      const tableName = "a".repeat(1000);
      const result = db.getTable(tableName);
      expect(result).toEqual([]);
    });

    it("should handle empty string as table name", () => {
      // Test to ensure empty string as table name is handled
      const tableName = "";
      const result = db.getTable(tableName);
      expect(result).toEqual([]);
    });

    it("should handle undefined as table name", () => {
      // Test to ensure undefined as table name is handled
      const result = db.getTable(undefined as unknown as string);
      expect(result).toEqual([]);
    });

    it("should handle null as table name", () => {
      // Test to ensure null as table name is handled
      const result = db.getTable(null as unknown as string);
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: getTable
