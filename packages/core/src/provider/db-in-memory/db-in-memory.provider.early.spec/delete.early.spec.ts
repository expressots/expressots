// Unit tests for: delete

import { InMemoryDataTable } from "../db-in-memory.provider";
import { EntityNotFoundError } from "../db-in-memory.types";

// Mock interfaces
interface MockMap<K, V> {
  has: jest.Mock<boolean, [K]>;
  delete: jest.Mock<boolean, [K]>;
  get: jest.Mock<V | undefined, [K]>;
  set: jest.Mock<void, [K, V]>;
}

class MockEntity {
  public id: string = "1";
}

describe("InMemoryDataTable.delete() delete method", () => {
  let mockItems: MockMap<string, MockEntity>;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    mockItems = {
      has: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    dataTable = new InMemoryDataTable<MockEntity>("testTable");
    (dataTable as any).items = mockItems;
  });

  describe("Happy paths", () => {
    it("should delete an existing entity successfully", async () => {
      // Arrange
      const entityId = "1";
      mockItems.has.mockReturnValue(true as any);
      mockItems.delete.mockReturnValue(true as any);

      // Act
      const result = await dataTable.delete(entityId);

      // Assert
      expect(result).toBe(true);
      expect(mockItems.has).toHaveBeenCalledWith(entityId);
      expect(mockItems.delete).toHaveBeenCalledWith(entityId);
    });
  });

  describe("Edge cases", () => {
    it("should throw EntityNotFoundError if the entity does not exist", async () => {
      // Arrange
      const entityId = "non-existent-id";
      mockItems.has.mockReturnValue(false as any);

      // Act & Assert
      await expect(dataTable.delete(entityId)).rejects.toThrow(
        EntityNotFoundError,
      );
      expect(mockItems.has).toHaveBeenCalledWith(entityId);
      expect(mockItems.delete).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: delete
