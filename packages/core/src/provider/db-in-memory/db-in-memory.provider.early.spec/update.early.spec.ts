// Unit tests for: update

import { InMemoryDataTable } from "../db-in-memory.provider";
import { EntityNotFoundError } from "../db-in-memory.types";

// Mock classes to simulate the behavior of Map and other dependencies
class MockEntity {
  public id: string = "1";
  public name: string = "Test Entity";
}

interface MockMap {
  has: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
}

describe("InMemoryDataTable.update() update method", () => {
  let mockMap: MockMap;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    // Initialize the mock map
    mockMap = {
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Create a new instance of InMemoryDataTable with the mock map
    dataTable = new InMemoryDataTable<MockEntity>("TestTable") as any;
    (dataTable as any).items = mockMap as any;
  });

  describe("Happy paths", () => {
    it("should update an existing entity successfully", async () => {
      // Arrange
      const entity = new MockEntity();
      mockMap.has.mockReturnValue(true);
      mockMap.set.mockReturnValue(undefined);

      // Act
      const result = await dataTable.update(entity);

      // Assert
      expect(result).toBe(entity);
      expect(mockMap.has).toHaveBeenCalledWith(entity.id);
      expect(mockMap.set).toHaveBeenCalledWith(entity.id, entity);
    });
  });

  describe("Edge cases", () => {
    it("should throw EntityNotFoundError if the entity does not exist", async () => {
      // Arrange
      const entity = new MockEntity();
      mockMap.has.mockReturnValue(false);

      // Act & Assert
      await expect(dataTable.update(entity)).rejects.toThrow(
        EntityNotFoundError,
      );
      expect(mockMap.has).toHaveBeenCalledWith(entity.id);
      expect(mockMap.set).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: update
