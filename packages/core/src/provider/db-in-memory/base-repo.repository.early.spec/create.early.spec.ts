// Unit tests for: create

import { BaseRepository } from "../base-repo.repository";
import { IMemoryDBEntity } from "../db-in-memory.provider";

// Mock class for InMemoryDB
class MockInMemoryDB {
  private tables: Record<string, IMemoryDBEntity[]> = {};

  getTable(tableName: string): IMemoryDBEntity[] {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return this.tables[tableName];
  }

  printTable(): void {
    // Mock implementation, no need to print anything
  }
}

describe("BaseRepository.create() create method", () => {
  let mockInMemoryDB: MockInMemoryDB;
  let repository: BaseRepository<IMemoryDBEntity>;

  beforeEach(() => {
    mockInMemoryDB = new MockInMemoryDB();
    repository = new BaseRepository<IMemoryDBEntity>("testTable") as any;
    (repository as any).inMemoryDB = mockInMemoryDB as any;
  });

  describe("Happy Path", () => {
    it("should create a new entity successfully", () => {
      const newItem: IMemoryDBEntity = { id: "1" };

      const result = repository.create(newItem);

      expect(result).toEqual(newItem);
      expect(mockInMemoryDB.getTable("testTable")).toContain(newItem);
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error if the entity already exists", () => {
      const existingItem: IMemoryDBEntity = { id: "1" };
      mockInMemoryDB.getTable("testTable").push(existingItem);

      expect(() => repository.create(existingItem)).toThrow(
        `Object with id ${existingItem.id} already exists`,
      );
    });

    it("should handle creating an entity with an empty id", () => {
      const newItem: IMemoryDBEntity = { id: "" };

      const result = repository.create(newItem);

      expect(result).toEqual(newItem);
      expect(mockInMemoryDB.getTable("testTable")).toContain(newItem);
    });

    it("should handle creating an entity with special characters in id", () => {
      const newItem: IMemoryDBEntity = { id: "!@#$" };

      const result = repository.create(newItem);

      expect(result).toEqual(newItem);
      expect(mockInMemoryDB.getTable("testTable")).toContain(newItem);
    });
  });
});

// End of unit tests for: create
