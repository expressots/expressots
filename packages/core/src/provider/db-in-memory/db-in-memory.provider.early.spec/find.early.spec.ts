// Unit tests for: find

import { InMemoryDataTable } from "../db-in-memory.provider";
import { EntityNotFoundError } from "../db-in-memory.types";

// Mock classes to simulate the behavior of Map and other dependencies
class MockEntity {
  public id: string = "1";
  public name: string = "Test Entity";
}

interface MockMap {
  get: jest.Mock;
  has: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
}

describe("InMemoryDataTable.find() find method", () => {
  let mockMap: MockMap;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    // Initialize the mock map
    mockMap = {
      get: jest.fn(),
      has: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Create a new instance of InMemoryDataTable with the mock map
    dataTable = new InMemoryDataTable<MockEntity>("TestTable") as any;
    (dataTable as any).items = mockMap as any;
  });

  describe("Happy paths", () => {
    it("should return the entity when it exists", async () => {
      // Arrange: Set up the mock to return an entity
      const mockEntity = new MockEntity();
      mockMap.get.mockReturnValue(mockEntity as any);
      mockMap.has.mockReturnValue(true);

      // Act: Call the find method
      const result = await dataTable.find("1");

      // Assert: Verify the result is the expected entity
      expect(result).toBe(mockEntity);
      expect(mockMap.get).toHaveBeenCalledWith("1");
    });
  });

  describe("Edge cases", () => {
    it("should throw EntityNotFoundError when the entity does not exist", async () => {
      // Arrange: Set up the mock to simulate entity not found
      mockMap.get.mockReturnValue(undefined);
      mockMap.has.mockReturnValue(false);

      // Act & Assert: Call the find method and expect an error
      await expect(dataTable.find("2")).rejects.toThrow(EntityNotFoundError);
      expect(mockMap.get).toHaveBeenCalledWith("2");
    });

    it("should handle empty string as ID gracefully", async () => {
      // Arrange: Set up the mock to simulate entity not found
      mockMap.get.mockReturnValue(undefined);
      mockMap.has.mockReturnValue(false);

      // Act & Assert: Call the find method with an empty string and expect an error
      await expect(dataTable.find("")).rejects.toThrow(EntityNotFoundError);
      expect(mockMap.get).toHaveBeenCalledWith("");
    });
  });
});

// End of unit tests for: find
