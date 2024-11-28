// Unit tests for: update

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

describe("BaseRepository.update() update method", () => {
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
    it("should update an existing entity successfully", async () => {
      // Arrange
      const entity: IEntity = { id: "1" };
      mockDataTable.update.mockResolvedValue(entity as any as never);

      // Act
      const result = await baseRepository.update(entity);

      // Assert
      expect(mockDataTable.update).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe("Edge cases", () => {
    it("should handle update when entity does not exist", async () => {
      // Arrange
      const entity: IEntity = { id: "2" };
      mockDataTable.update.mockResolvedValue(null as any as never);

      // Act
      const result = await baseRepository.update(entity);

      // Assert
      expect(mockDataTable.update).toHaveBeenCalledWith(entity);
      expect(result).toBeNull();
    });

    it("should handle update when entity is null", async () => {
      // Arrange
      const entity = null;
      mockDataTable.update.mockResolvedValue(null as any as never);

      // Act
      const result = await baseRepository.update(entity as any);

      // Assert
      expect(mockDataTable.update).toHaveBeenCalledWith(entity);
      expect(result).toBeNull();
    });

    it("should handle update when update method throws an error", async () => {
      // Arrange
      const entity: IEntity = { id: "3" };
      const error = new Error("Update failed");
      mockDataTable.update.mockRejectedValue(error as never);

      // Act & Assert
      await expect(baseRepository.update(entity)).rejects.toThrow(
        "Update failed",
      );
      expect(mockDataTable.update).toHaveBeenCalledWith(entity);
    });
  });
});

// End of unit tests for: update
