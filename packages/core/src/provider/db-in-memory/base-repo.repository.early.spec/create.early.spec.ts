// Unit tests for: create

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

describe("BaseRepository.create() create method", () => {
  let mockDataProvider: MockIDataProvider;
  let mockDataTable: MockIDataTable<IEntity>;
  let baseRepository: BaseRepository<IEntity>;

  beforeEach(() => {
    mockDataProvider = new MockIDataProvider();
    mockDataTable = new MockIDataTable<IEntity>();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);
    baseRepository = new BaseRepository<IEntity>(
      mockDataProvider as any,
      "TestEntity",
    );
  });

  describe("Happy paths", () => {
    it("should insert an item successfully", async () => {
      // Arrange
      const item: IEntity = { id: "1" };
      mockDataTable.insert.mockResolvedValue(item as any as never);

      // Act
      const result = await baseRepository.create(item);

      // Assert
      expect(mockDataTable.insert).toHaveBeenCalledWith(item);
      expect(result).toEqual(item);
    });
  });

  describe("Edge cases", () => {
    it("should handle insertion of an item with missing fields gracefully", async () => {
      // Arrange
      const item: Partial<IEntity> = { id: undefined } as any;
      mockDataTable.insert.mockResolvedValue(item as any as never);

      // Act
      const result = await baseRepository.create(item as IEntity);

      // Assert
      expect(mockDataTable.insert).toHaveBeenCalledWith(item);
      expect(result).toEqual(item);
    });

    it("should handle insertion failure gracefully", async () => {
      // Arrange
      const item: IEntity = { id: "1" };
      mockDataTable.insert.mockRejectedValue(
        new Error("Insertion failed") as never,
      );

      // Act & Assert
      await expect(baseRepository.create(item)).rejects.toThrow(
        "Insertion failed",
      );
      expect(mockDataTable.insert).toHaveBeenCalledWith(item);
    });
  });
});

// End of unit tests for: create
