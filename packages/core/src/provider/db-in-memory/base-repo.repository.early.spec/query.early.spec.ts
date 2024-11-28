// Unit tests for: query

import { BaseRepository } from "../base-repo.repository";
import { IDataProvider, IDataTable, IEntity } from "../db-in-memory.interface";

// Mock interfaces
class MockIDataTable<T extends IEntity> implements IDataTable<T> {
  insert = jest.fn<Promise<T>, [T]>();
  update = jest.fn<Promise<T>, [T]>();
  delete = jest.fn<Promise<boolean>, [string]>();
  find = jest.fn<Promise<T>, [string]>();
  findAll = jest.fn<Promise<Array<T>>, []>();
  insertMany = jest.fn<Promise<Array<T>>, [Array<T>]>();
  query = jest.fn<Promise<Array<T>>, [(item: T) => boolean]>();
  transaction = jest.fn<Promise<void>, [() => Promise<void>]>();
}

class MockIDataProvider implements IDataProvider {
  name: string;
  version: string;
  author: string;
  repo: string;
  getTable = jest.fn<IDataTable<any>, [string]>();
}

describe("BaseRepository.query() query method", () => {
  let mockDataTable: MockIDataTable<IEntity>;
  let mockDataProvider: MockIDataProvider;
  let repository: BaseRepository<IEntity>;

  beforeEach(() => {
    mockDataTable = new MockIDataTable<IEntity>();
    mockDataProvider = new MockIDataProvider();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);
    repository = new BaseRepository<IEntity>(
      mockDataProvider as any,
      "TestEntity",
    );
  });

  describe("Happy paths", () => {
    it("should return all items that match the predicate", async () => {
      // Arrange
      const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
      mockDataTable.query.mockResolvedValue(items as any as never);

      // Act
      const result = await repository.query((item) => item.id === "1");

      // Assert
      expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
      expect(mockDataTable.query).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should return an empty array if no items match the predicate", async () => {
      // Arrange
      mockDataTable.query.mockResolvedValue([] as any as never);

      // Act
      const result = await repository.query(
        (item) => item.id === "non-existent",
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockDataTable.query).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("Edge cases", () => {
    it("should handle an empty data table gracefully", async () => {
      // Arrange
      mockDataTable.query.mockResolvedValue([] as any as never);

      // Act
      const result = await repository.query(() => true);

      // Assert
      expect(result).toEqual([]);
      expect(mockDataTable.query).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should handle a predicate that always returns false", async () => {
      // Arrange
      const items = [];
      mockDataTable.query.mockResolvedValue(items as any as never);

      // Act
      const result = await repository.query(() => false);

      // Assert
      expect(result).toEqual([]);
      expect(mockDataTable.query).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});

// End of unit tests for: query
