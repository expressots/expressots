// Unit tests for: insert

import { IEntity } from "../db-in-memory.interface";
import { InMemoryDataTable } from "../db-in-memory.provider";
import { EntityAlreadyExistsError } from "../db-in-memory.types";

// Mock classes to simulate the behavior of Map and IEntity
class MockEntity implements IEntity {
  public id: string = "1";
  public name: string = "Test Entity";
}

class MockMap<K, V> {
  private map = new Map<K, V>();

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): this {
    this.map.set(key, value);
    return this;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }
}

describe("InMemoryDataTable.insert() insert method", () => {
  let dataTable: InMemoryDataTable<MockEntity>;
  let mockItems: MockMap<string, MockEntity>;

  beforeEach(() => {
    mockItems = new MockMap<string, MockEntity>() as any;
    dataTable = new InMemoryDataTable<MockEntity>("TestTable") as any;
    (dataTable as any).items = mockItems;
  });

  describe("Happy paths", () => {
    it("should insert a new entity successfully", async () => {
      const entity = new MockEntity();
      const result = await dataTable.insert(entity);

      expect(result).toEqual(entity);
      expect(mockItems.has(entity.id)).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should throw an error if the entity already exists", async () => {
      const entity = new MockEntity();
      mockItems.set(entity.id, entity);

      await expect(dataTable.insert(entity)).rejects.toThrow(
        EntityAlreadyExistsError,
      );
    });

    it("should handle insertion of an entity with an empty id", async () => {
      const entity = new MockEntity();
      entity.id = "";

      const result = await dataTable.insert(entity);

      expect(result).toEqual(entity);
      expect(mockItems.has(entity.id)).toBe(true);
    });

    it("should handle insertion of an entity with a null id", async () => {
      const entity = new MockEntity();
      entity.id = null as any;

      const result = await dataTable.insert(entity);

      expect(result).toEqual(entity);
      expect(mockItems.has(entity.id)).toBe(true);
    });
  });
});

// End of unit tests for: insert
