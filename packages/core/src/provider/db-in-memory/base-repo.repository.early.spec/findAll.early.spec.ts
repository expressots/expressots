// Unit tests for: findAll

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

describe("BaseRepository.findAll() findAll method", () => {
  let mockDataProvider: MockIDataProvider;
  let mockDataTable: MockIDataTable<IEntity>;
  let baseRepository: BaseRepository<IEntity>;

  beforeEach(() => {
    mockDataProvider = new MockIDataProvider();
    mockDataTable = new MockIDataTable<IEntity>();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);
    baseRepository = new BaseRepository<IEntity>(
      mockDataProvider as any,
      "testTable",
    );
  });

  describe("Happy paths", () => {
    it("should return all entities when findAll is called", async () => {
      // Arrange
      const entities = [{ id: "1" }, { id: "2" }] as IEntity[];
      mockDataTable.findAll.mockResolvedValue(entities as any as never);

      // Act
      const result = await baseRepository.findAll();

      // Assert
      expect(result).toEqual(entities);
      expect(mockDataTable.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should return an empty array when no entities are present", async () => {
      // Arrange
      mockDataTable.findAll.mockResolvedValue([] as any as never);

      // Act
      const result = await baseRepository.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(mockDataTable.findAll).toHaveBeenCalledTimes(1);
    });

    it("should handle errors thrown by the data table", async () => {
      // Arrange
      const error = new Error("Database error");
      mockDataTable.findAll.mockRejectedValue(error as never);

      // Act & Assert
      await expect(baseRepository.findAll()).rejects.toThrow("Database error");
      expect(mockDataTable.findAll).toHaveBeenCalledTimes(1);
    });
  });
});

// End of unit tests for: findAll
