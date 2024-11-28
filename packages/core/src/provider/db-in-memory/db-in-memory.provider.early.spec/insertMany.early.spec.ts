// Unit tests for: insertMany

import { IEntity } from "../db-in-memory.interface";
import { InMemoryDataTable } from "../db-in-memory.provider";
import { EntityAlreadyExistsError } from "../db-in-memory.types";

// MockMap interface to simulate Map behavior
interface MockMap<K, V> {
  has: jest.Mock<boolean, [K]>;
  set: jest.Mock<void, [K, V]>;
  get: jest.Mock<V | undefined, [K]>;
  delete: jest.Mock<boolean, [K]>;
  values: jest.Mock<IterableIterator<V>>;
}

// Mock implementation of IEntity
class MockEntity implements IEntity {
  id: string = "1";
}

// Helper function to create a mock map
function createMockMap<K, V>(): MockMap<K, V> {
  return {
    has: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    values: jest.fn(),
  };
}

describe("InMemoryDataTable.insertMany() insertMany method", () => {
  let mockItems: MockMap<string, MockEntity>;
  let dataTable: InMemoryDataTable<MockEntity>;

  beforeEach(() => {
    mockItems = createMockMap<string, MockEntity>();
    dataTable = new InMemoryDataTable<MockEntity>("testTable") as any;
    (dataTable as any).items = mockItems as any;
  });

  // Happy path test: Successfully insert multiple items
  it("should insert multiple items successfully", async () => {
    const entities = [new MockEntity(), new MockEntity()];
    entities[0].id = "1";
    entities[1].id = "2";

    mockItems.has.mockReturnValue(false);

    const result = await dataTable.insertMany(entities);

    expect(result).toEqual(entities);
    expect(mockItems.set).toHaveBeenCalledTimes(2);
    expect(mockItems.set).toHaveBeenCalledWith("1", entities[0]);
    expect(mockItems.set).toHaveBeenCalledWith("2", entities[1]);
  });

  // Edge case test: Attempt to insert an item that already exists
  it("should throw an error when trying to insert an item that already exists", async () => {
    const entities = [new MockEntity()];
    entities[0].id = "1";

    mockItems.has.mockReturnValue(true);

    await expect(dataTable.insertMany(entities)).rejects.toThrow(
      EntityAlreadyExistsError,
    );
    expect(mockItems.set).not.toHaveBeenCalled();
  });

  // Edge case test: Insert an empty array of items
  it("should return an empty array when inserting an empty array of items", async () => {
    const entities: MockEntity[] = [];

    const result = await dataTable.insertMany(entities);

    expect(result).toEqual([]);
    expect(mockItems.set).not.toHaveBeenCalled();
  });
});

// End of unit tests for: insertMany
