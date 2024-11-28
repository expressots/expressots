// Unit tests for: transaction

import { InMemoryDataTable } from "../db-in-memory.provider";

// Mock interfaces
interface MockMap<K, V> {
  set: jest.Mock;
  get: jest.Mock;
  has: jest.Mock;
  delete: jest.Mock;
  values: jest.Mock;
  clear: jest.Mock;
}

class MockEntity {
  public id: string = "1";
}

// Mock implementation of Map
class MockMapImplementation<K, V> implements MockMap<K, V> {
  set = jest.fn();
  get = jest.fn();
  has = jest.fn();
  delete = jest.fn();
  values = jest.fn();
  clear = jest.fn();
}

describe("InMemoryDataTable.transaction() transaction method", () => {
  let mockItems: MockMap<string, MockEntity>;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    mockItems = new MockMapImplementation<string, MockEntity>() as any;
    dataTable = new InMemoryDataTable<MockEntity>("testTable") as any;
    (dataTable as any).items = mockItems;
    jest
      .spyOn(dataTable, "transaction")
      .mockImplementation(async (actions: () => Promise<void>) => {
        await actions();
      });
  });

  describe("Happy paths", () => {
    it("should commit transaction successfully", async () => {
      // Arrange
      const actions = jest.fn().mockResolvedValue(undefined);

      // Act
      await dataTable.transaction(actions);

      // Assert
      expect(actions).toHaveBeenCalled();
      expect(mockItems.set).not.toHaveBeenCalled(); // Assuming no changes were made
    });
  });

  describe("Edge cases", () => {
    it("should rollback transaction on error", async () => {
      // Arrange
      const actions = jest.fn().mockRejectedValue(new Error("Test error"));
      const beginTransactionSpy = jest.spyOn(
        dataTable as any,
        "beginTransaction",
      );
      const rollbackTransactionSpy = jest.spyOn(
        dataTable as any,
        "rollbackTransaction",
      );

      // Act & Assert
      await expect(dataTable.transaction(actions)).rejects.toThrow(
        "Test error",
      );

      expect(actions).toHaveBeenCalled();
    });

    it("should throw error if rollback is called without a transaction", async () => {
      // Arrange
      const rollbackTransactionSpy = jest.spyOn(
        dataTable as any,
        "rollbackTransaction",
      );

      // Act & Assert
      await dataTable.transaction(async () => {});
      expect(rollbackTransactionSpy).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: transaction
