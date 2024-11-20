// Unit tests for: getControllersFromContainer

import { getControllersFromContainer } from "../utils";

class MockContainer {
  private bindings: Map<string, any[]> = new Map();

  isBound(type: string): boolean {
    return this.bindings.has(type);
  }

  getAll<T>(type: string): T[] {
    return this.bindings.get(type) || [];
  }

  bind(type: string, instance: any) {
    if (!this.bindings.has(type)) {
      this.bindings.set(type, []);
    }
    this.bindings.get(type)?.push(instance);
  }
}

describe("getControllersFromContainer() getControllersFromContainer method", () => {
  let mockContainer: MockContainer;

  beforeEach(() => {
    mockContainer = new MockContainer();
  });

  it("should return an empty array when no controllers are bound and forceControllers is false", () => {
    const result = getControllersFromContainer(mockContainer as any, false);

    expect(result).toEqual([]);
  });

  it("should throw an error when no controllers are bound and forceControllers is true", () => {
    expect(() => {
      getControllersFromContainer(mockContainer as any, true);
    }).toThrowError("No controller found! Please ensure that you have register at least one Controller.");
  });
});

// End of unit tests for: getControllersFromContainer
