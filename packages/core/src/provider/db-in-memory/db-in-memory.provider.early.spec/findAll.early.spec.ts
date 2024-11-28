// Unit tests for: findAll

import { IEntity } from "../db-in-memory.interface";
import { InMemoryDataTable } from "../db-in-memory.provider";

// Mock implementation for Map
class MockMap<K, V> {
  private map = new Map<K, V>();

  set(key: K, value: V): this {
    this.map.set(key, value);
    return this;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }
}

// Mock IEntity implementation
class MockEntity implements IEntity {
  id: string = "1";
  name: string = "Test Entity";
}

describe("InMemoryDataTable.findAll() findAll method", () => {
  let dataTable: InMemoryDataTable<MockEntity>;
  let mockItems: MockMap<string, MockEntity>;

  beforeEach(() => {
    mockItems = new MockMap<string, MockEntity>() as any;
    dataTable = new InMemoryDataTable<MockEntity>("TestTable") as any;
    (dataTable as any).items = mockItems;
  });

  describe("Happy Paths", () => {
    it("should return all items in the table", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      mockItems.set(entity1.id, entity1);
      mockItems.set(entity2.id, entity2);

      // Act
      const result = await dataTable.findAll();

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });

    it("should return an empty array when no items are present", async () => {
      // Act
      const result = await dataTable.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large number of items efficiently", async () => {
      // Arrange
      const largeNumber = 1000;
      for (let i = 0; i < largeNumber; i++) {
        const entity = new MockEntity();
        entity.id = i.toString();
        mockItems.set(entity.id, entity);
      }

      // Act
      const result = await dataTable.findAll();

      // Assert
      expect(result.length).toBe(largeNumber);
    });

    it("should handle items with similar properties but different IDs", async () => {
      // Arrange
      const entity1 = new MockEntity();
      const entity2 = new MockEntity();
      entity2.id = "2";
      entity2.name = "Test Entity";
      mockItems.set(entity1.id, entity1);
      mockItems.set(entity2.id, entity2);

      // Act
      const result = await dataTable.findAll();

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });
  });
});

// End of unit tests for: findAll
