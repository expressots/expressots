// Unit tests for: query

import { IEntity } from "../db-in-memory.interface";
import { InMemoryDataTable } from "../db-in-memory.provider";

// Mock classes to simulate the behavior of Map and IEntity
class MockEntity implements IEntity {
  public id: string = "1";
  public name: string = "Test Entity";
}

interface MockMap {
  set: jest.Mock;
  get: jest.Mock;
  has: jest.Mock;
  delete: jest.Mock;
  values: jest.Mock;
}

describe("InMemoryDataTable.query() query method", () => {
  let mockItems: MockMap;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    // Initialize the mock map
    mockItems = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      values: jest.fn(),
    } as any;

    // Initialize the data table with the mock map
    dataTable = new InMemoryDataTable<MockEntity>("TestTable");
    (dataTable as any).items = mockItems;
  });

  describe("Happy paths", () => {
    it("should return all entities that match the predicate", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      entity2.name = "Another Entity";

      mockItems.values.mockReturnValue([entity1, entity2] as any);

      // Act
      const result = await dataTable.query((item) =>
        item.name.includes("Entity"),
      );

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });

    it("should return an empty array if no entities match the predicate", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      entity2.name = "Another Entity";

      mockItems.values.mockReturnValue([entity1, entity2] as any);

      // Act
      const result = await dataTable.query((item) =>
        item.name.includes("Nonexistent"),
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("Edge cases", () => {
    it("should handle an empty data table gracefully", async () => {
      // Arrange
      mockItems.values.mockReturnValue([] as any);

      // Act
      const result = await dataTable.query((item) =>
        item.name.includes("Entity"),
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle a predicate that always returns false", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      entity2.name = "Another Entity";

      mockItems.values.mockReturnValue([entity1, entity2] as any);

      // Act
      const result = await dataTable.query(() => false);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle a predicate that always returns true", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      entity2.name = "Another Entity";

      mockItems.values.mockReturnValue([entity1, entity2] as any);

      // Act
      const result = await dataTable.query(() => true);

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });
  });
});

// End of unit tests for: query
