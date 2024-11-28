// Unit tests for: find

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

describe("BaseRepository.find() find method", () => {
  let mockDataTable: MockIDataTable<IEntity>;
  let mockDataProvider: MockIDataProvider;
  let baseRepository: BaseRepository<IEntity>;

  beforeEach(() => {
    mockDataTable = new MockIDataTable<IEntity>();
    mockDataProvider = new MockIDataProvider();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);
    baseRepository = new BaseRepository<IEntity>(
      mockDataProvider as any,
      "TestEntity",
    );
  });

  describe("Happy paths", () => {
    it("should return the entity when found", async () => {
      // Arrange
      const mockEntity = { id: "123", name: "Test Entity" };
      mockDataTable.find.mockResolvedValue(mockEntity as any as never);

      // Act
      const result = await baseRepository.find("123");

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockDataTable.find).toHaveBeenCalledWith("123");
    });
  });

  describe("Edge cases", () => {
    it("should return null when the entity is not found", async () => {
      // Arrange
      mockDataTable.find.mockResolvedValue(null as any as never);

      // Act
      const result = await baseRepository.find("non-existent-id");

      // Assert
      expect(result).toBeNull();
      expect(mockDataTable.find).toHaveBeenCalledWith("non-existent-id");
    });

    it("should handle errors thrown by the data table", async () => {
      // Arrange
      const error = new Error("Database error");
      mockDataTable.find.mockRejectedValue(error as never);

      // Act & Assert
      await expect(baseRepository.find("123")).rejects.toThrow(
        "Database error",
      );
      expect(mockDataTable.find).toHaveBeenCalledWith("123");
    });
  });
});

// End of unit tests for: find
