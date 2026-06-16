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

    it("should throw error when rollbackTransaction is called without a transaction", () => {
      // Arrange
      const dataTable = new InMemoryDataTable<MockEntity>("testTable") as any;
      (dataTable as any).transactionStack = [];

      // Act & Assert
      expect(() => {
        (dataTable as any).rollbackTransaction();
      }).toThrow("No transaction to rollback.");
    });

    it("should restore items from snapshot on rollback", async () => {
      // Arrange
      const dataTable = new InMemoryDataTable<MockEntity>("testTable") as any;
      const originalItems = new Map<string, MockEntity>();
      const entity1 = new MockEntity();
      entity1.id = "1";
      originalItems.set("1", entity1);
      (dataTable as any).items = originalItems;
      (dataTable as any).transactionStack = [];

      // Begin transaction and modify items
      (dataTable as any).beginTransaction();
      const entity2 = new MockEntity();
      entity2.id = "2";
      (dataTable as any).items.set("2", entity2);

      // Act - rollback
      (dataTable as any).rollbackTransaction();

      // Assert - items should be restored to original state
      expect((dataTable as any).items.has("1")).toBe(true);
      expect((dataTable as any).items.has("2")).toBe(false);
    });
  });
});

// End of unit tests for: transaction
