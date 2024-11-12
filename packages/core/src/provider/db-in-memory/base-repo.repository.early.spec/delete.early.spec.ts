// Unit tests for: delete

import { BaseRepository } from "../base-repo.repository";
import { IMemoryDBEntity } from "../db-in-memory.provider";

// Mock class for InMemoryDB
class MockInMemoryDB {
  private tables: { [key: string]: IMemoryDBEntity[] } = {};

  getTable(tableName: string): IMemoryDBEntity[] {
    return this.tables[tableName] || [];
  }

  printTable(): void {
    // Mock implementation, no operation needed
  }
}

describe("BaseRepository.delete() delete method", () => {
  let mockInMemoryDB: MockInMemoryDB;
  let repository: BaseRepository<IMemoryDBEntity>;

  beforeEach(() => {
    mockInMemoryDB = new MockInMemoryDB();
    repository = new BaseRepository<IMemoryDBEntity>("testTable") as any;
    (repository as any).inMemoryDB = mockInMemoryDB as any;
  });

  describe("Happy Path", () => {
    it("should delete an existing entity and return true", () => {
      // Arrange
      const entity = { id: "1" };
      mockInMemoryDB.getTable("testTable").push(entity);

      // Act
      const result = repository.delete("1");

      // Assert
      expect(mockInMemoryDB.getTable("testTable")).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    

    it("should handle deletion from an empty table gracefully", () => {
      // Act
      const result = repository.delete("1");

      // Assert
      expect(result).toBe(false);
      expect(mockInMemoryDB.getTable("testTable")).toHaveLength(0);
    });
  });
});

// End of unit tests for: delete
