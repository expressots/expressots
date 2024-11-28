// Unit tests for: transaction

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

// Sample entity for testing
interface MockEntity extends IEntity {
  id: string;
  name: string;
}

describe("BaseRepository.transaction() transaction method", () => {
  let mockDataTable: MockIDataTable<MockEntity>;
  let mockDataProvider: MockIDataProvider;
  let repository: BaseRepository<MockEntity>;

  beforeEach(() => {
    mockDataTable = new MockIDataTable<MockEntity>();
    mockDataProvider = new MockIDataProvider();
    mockDataProvider.getTable.mockReturnValue(mockDataTable as any);
    repository = new BaseRepository<MockEntity>(
      mockDataProvider as any,
      "MockEntity",
    );
  });

  describe("Happy paths", () => {
    it("should successfully execute actions within a transaction", async () => {
      // Arrange
      const actions = jest.fn().mockResolvedValue(undefined);
      mockDataTable.transaction.mockResolvedValue(undefined);

      // Act
      await repository.transaction(actions);

      // Assert
      expect(mockDataTable.transaction).toHaveBeenCalledWith(actions);
    });
  });

  describe("Edge cases", () => {
    it("should handle errors thrown within the transaction actions", async () => {
      // Arrange
      const error = new Error("Transaction failed");
      const actions = jest.fn().mockRejectedValue(error);
      mockDataTable.transaction.mockRejectedValue(error as never);

      // Act & Assert
      await expect(repository.transaction(actions)).rejects.toThrow(
        "Transaction failed",
      );
      expect(mockDataTable.transaction).toHaveBeenCalledWith(actions);
    });

    it("should handle empty actions gracefully", async () => {
      // Arrange
      const actions = jest.fn().mockResolvedValue(undefined);
      mockDataTable.transaction.mockResolvedValue(undefined);

      // Act
      await repository.transaction(actions);

      // Assert
      expect(mockDataTable.transaction).toHaveBeenCalledWith(actions);
    });
  });
});

// End of unit tests for: transaction
