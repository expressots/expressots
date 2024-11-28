// Unit tests for: delete

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

describe("BaseRepository.delete() delete method", () => {
  let mockDataTable: MockIDataTable<IEntity>;
  let mockDataProvider: MockIDataProvider;
  let repository: BaseRepository<IEntity>;

  beforeEach(() => {
    mockDataTable = new MockIDataTable<IEntity>();
    mockDataProvider = new MockIDataProvider();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);

    repository = new BaseRepository<IEntity>(
      mockDataProvider as any,
      "testTable",
    );
  });

  describe("Happy paths", () => {
    it("should delete an entity successfully", async () => {
      // Arrange
      const entityId = "123";
      mockDataTable.delete.mockResolvedValue(true as any as never);

      // Act
      const result = await repository.delete(entityId);

      // Assert
      expect(result).toBe(true);
      expect(mockDataTable.delete).toHaveBeenCalledWith(entityId);
    });
  });

  describe("Edge cases", () => {
    it("should return false if entity does not exist", async () => {
      // Arrange
      const nonExistentId = "999";
      mockDataTable.delete.mockResolvedValue(false as any as never);

      // Act
      const result = await repository.delete(nonExistentId);

      // Assert
      expect(result).toBe(false);
      expect(mockDataTable.delete).toHaveBeenCalledWith(nonExistentId);
    });

    it("should handle errors thrown by the data table", async () => {
      // Arrange
      const entityId = "123";
      const errorMessage = "Delete operation failed";
      mockDataTable.delete.mockRejectedValue(new Error(errorMessage) as never);

      // Act & Assert
      await expect(repository.delete(entityId)).rejects.toThrow(errorMessage);
      expect(mockDataTable.delete).toHaveBeenCalledWith(entityId);
    });
  });
});

// End of unit tests for: delete
