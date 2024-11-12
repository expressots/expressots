// Unit tests for: findAll

import { BaseRepository } from "../base-repo.repository";
import { IMemoryDBEntity } from "../db-in-memory.provider";

// Mock class for InMemoryDB
class MockInMemoryDB {
  private tables: { [key: string]: Array<IMemoryDBEntity> } = {};

  getTable(tableName: string): Array<IMemoryDBEntity> {
    return this.tables[tableName] || [];
  }

  printTable(): void {
    // Mock implementation, no operation needed
  }

  setTable(tableName: string, data: Array<IMemoryDBEntity>): void {
    this.tables[tableName] = data;
  }
}

describe("BaseRepository.findAll() findAll method", () => {
  let mockInMemoryDB: MockInMemoryDB;
  let repository: BaseRepository<IMemoryDBEntity>;

  beforeEach(() => {
    mockInMemoryDB = new MockInMemoryDB();
    repository = new BaseRepository<IMemoryDBEntity>("testTable") as any;
    (repository as any).inMemoryDB = mockInMemoryDB as any;
  });

  describe("Happy Path", () => {});

  describe("Edge Cases", () => {
    it("should return an empty array when the table is empty", () => {
      // Arrange
      mockInMemoryDB.setTable("testTable", []);

      // Act
      const result = repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle the case where the table does not exist", () => {
      // Arrange
      // No table is set in the mock DB

      // Act
      const result = repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: findAll
