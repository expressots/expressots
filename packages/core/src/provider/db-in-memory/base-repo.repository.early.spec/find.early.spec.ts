// Unit tests for: find

import { BaseRepository } from "../base-repo.repository";
import { IMemoryDBEntity } from "../db-in-memory.provider";

// Mock class for InMemoryDB
class MockInMemoryDB {
  private tables: { [key: string]: IMemoryDBEntity[] } = {};

  getTable = jest.fn((tableName: string) => {
    return this.tables[tableName] || [];
  });

  printTable = jest.fn(() => {
    // Mock implementation for printing table
  });
}

describe("BaseRepository.find() find method", () => {
  let mockInMemoryDB: MockInMemoryDB;
  let repository: BaseRepository<IMemoryDBEntity>;

  beforeEach(() => {
    mockInMemoryDB = new MockInMemoryDB();
    repository = new BaseRepository<IMemoryDBEntity>("testTable" as any);
    (repository as any).inMemoryDB = mockInMemoryDB as any;
  });

  describe("Happy Path", () => {
    it("should return the entity when it exists in the table", () => {
      // Arrange
      const entity = { id: "1", name: "Test Entity" };
      mockInMemoryDB.getTable.mockReturnValue([entity] as any);

      // Act
      const result = repository.find("1");

      // Assert
      expect(result).toEqual(entity);
      expect(mockInMemoryDB.getTable).toHaveBeenCalledWith("testTable");
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });
  });

  describe("Edge Cases", () => {
    it("should return null when the entity does not exist", () => {
      // Arrange
      mockInMemoryDB.getTable.mockReturnValue([] as any);

      // Act
      const result = repository.find("non-existent-id");

      // Assert
      expect(result).toBeNull();
      expect(mockInMemoryDB.getTable).toHaveBeenCalledWith("testTable");
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });

    it("should handle an empty table gracefully", () => {
      // Arrange
      mockInMemoryDB.getTable.mockReturnValue([] as any);

      // Act
      const result = repository.find("1");

      // Assert
      expect(result).toBeNull();
      expect(mockInMemoryDB.getTable).toHaveBeenCalledWith("testTable");
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });

    it("should handle a table with multiple entities and return the correct one", () => {
      // Arrange
      const entity1 = { id: "1", name: "Entity One" };
      const entity2 = { id: "2", name: "Entity Two" };
      mockInMemoryDB.getTable.mockReturnValue([entity1, entity2] as any);

      // Act
      const result = repository.find("2");

      // Assert
      expect(result).toEqual(entity2);
      expect(mockInMemoryDB.getTable).toHaveBeenCalledWith("testTable");
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });
  });
});

// End of unit tests for: find
