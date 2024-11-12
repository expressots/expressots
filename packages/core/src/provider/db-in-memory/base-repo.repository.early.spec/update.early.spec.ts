// Unit tests for: update

import { BaseRepository } from "../base-repo.repository";
import { IMemoryDBEntity, InMemoryDB } from "../db-in-memory.provider";

// Mock class for InMemoryDB
class MockInMemoryDB {
  private tables: { [key: string]: IMemoryDBEntity[] } = {};

  getTable = jest.fn((tableName: string) => {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return this.tables[tableName];
  });

  printTable = jest.fn((tableName: string) => {
    console.log(this.tables[tableName]);
  });
}

describe("BaseRepository.update() update method", () => {
  let mockInMemoryDB: MockInMemoryDB;
  let repository: BaseRepository<IMemoryDBEntity>;

  beforeEach(() => {
    mockInMemoryDB = new MockInMemoryDB();
    repository = new BaseRepository<IMemoryDBEntity>("testTable" as any);
    (repository as any).inMemoryDB = mockInMemoryDB as any;
  });

  describe("Happy Path", () => {
    it("should update an existing entity successfully", () => {
      // Arrange
      const existingItem = { id: "1", name: "Item 1" };
      const updatedItem = { id: "1", name: "Updated Item 1" };
      mockInMemoryDB.getTable("testTable").push(existingItem);

      // Act
      const result = repository.update(updatedItem);

      // Assert
      expect(result).toEqual(updatedItem);
      expect(mockInMemoryDB.getTable("testTable")[0]).toEqual(updatedItem);
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });
  });

  describe("Edge Cases", () => {
      let repository: BaseRepository<any>;
      let mockInMemoryDB: InMemoryDB;
  
      beforeEach(() => {
          mockInMemoryDB = {
              getTable: jest.fn().mockReturnValue([]),
              printTable: jest.fn()
          } as unknown as InMemoryDB;
  
          repository = new BaseRepository<any>("testTable");
          (repository as any).inMemoryDB = mockInMemoryDB;
      });

    it("should handle updating an entity with no changes gracefully", () => {
      // Arrange
      const existingItem = { id: "3", name: "Item 3" };
      mockInMemoryDB.getTable("testTable").push(existingItem);

      // Act
      const result = repository.update(existingItem);

      // Assert
      expect(result).toEqual(existingItem);
      expect(mockInMemoryDB.getTable("testTable")[0]).toEqual(existingItem);
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });

    it("should handle updating an entity with additional properties", () => {
      // Arrange
      const existingItem = { id: "4", name: "Item 4" };
      const updatedItem = {
        id: "4",
        name: "Updated Item 4",
        extra: "Extra Property",
      };
      mockInMemoryDB.getTable("testTable").push(existingItem);

      // Act
      const result = repository.update(updatedItem as any);

      // Assert
      expect(result).toEqual(updatedItem);
      expect(mockInMemoryDB.getTable("testTable")[0]).toEqual(updatedItem);
      expect(mockInMemoryDB.printTable).toHaveBeenCalledWith("testTable");
    });
  });
});

// End of unit tests for: update
