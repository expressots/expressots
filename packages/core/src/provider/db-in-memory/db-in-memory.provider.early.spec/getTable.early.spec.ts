// Unit tests for: getTable

import { IEntity } from "../db-in-memory.interface";
import {
  InMemoryDataProvider,
  InMemoryDataTable,
} from "../db-in-memory.provider";

describe("InMemoryDataProvider.getTable() getTable method", () => {
  let dataProvider: InMemoryDataProvider;

  beforeEach(() => {
    dataProvider = new InMemoryDataProvider();
  });

  describe("Happy Paths", () => {
    it("should return a new table when it does not exist", () => {
      // Arrange
      const tableName = "TestTable";

      // Act
      const table = dataProvider.getTable<IEntity>(tableName);

      // Assert
      expect(table).toBeInstanceOf(InMemoryDataTable);
      expect((table as InMemoryDataTable<IEntity>).findAll()).resolves.toEqual(
        [],
      );
    });

    it("should return the same table instance for subsequent calls with the same table name", () => {
      // Arrange
      const tableName = "TestTable";

      // Act
      const firstCallTable = dataProvider.getTable<IEntity>(tableName);
      const secondCallTable = dataProvider.getTable<IEntity>(tableName);

      // Assert
      expect(firstCallTable).toBe(secondCallTable);
    });
  });

  describe("Edge Cases", () => {
    it("should handle table names with special characters", () => {
      // Arrange
      const tableName = "Table@123!";

      // Act
      const table = dataProvider.getTable<IEntity>(tableName);

      // Assert
      expect(table).toBeInstanceOf(InMemoryDataTable);
    });

    it("should handle empty string as table name", () => {
      // Arrange
      const tableName = "";

      // Act
      const table = dataProvider.getTable<IEntity>(tableName);

      // Assert
      expect(table).toBeInstanceOf(InMemoryDataTable);
    });

    it("should handle very long table names", () => {
      // Arrange
      const tableName = "a".repeat(1000);

      // Act
      const table = dataProvider.getTable<IEntity>(tableName);

      // Assert
      expect(table).toBeInstanceOf(InMemoryDataTable);
    });
  });
});

// End of unit tests for: getTable
