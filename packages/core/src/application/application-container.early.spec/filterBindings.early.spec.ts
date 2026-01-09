// Unit tests for: filterBindings

import { AppContainer } from "../application-container";
import "reflect-metadata";

// Mocking the buildProviderModule function
jest.mock("../../di/binding-decorator", () => {
  const actual = jest.requireActual("../../di/binding-decorator");
  return {
    ...actual,
    buildProviderModule: jest.fn(),
  };
});

// Mock classes
class MockContainer {
  public id = 123;
  public _bindingDictionary = {
    _map: new Map<string, Array<any>>(),
  };

  public bind = jest.fn();
  public load = jest.fn();
}

describe("AppContainer.filterBindings() filterBindings method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({} as any);
    (appContainer as any).container = mockContainer;

    // Setup test data
    mockContainer._bindingDictionary._map.set("UserController", [
      {
        scope: "Singleton",
        type: "Constructor",
        cache: {},
        activated: true,
      },
    ]);
    mockContainer._bindingDictionary._map.set("AuthService", [
      { scope: "Request", type: "Constructor", cache: null, activated: false },
    ]);
    mockContainer._bindingDictionary._map.set("Config", [
      {
        scope: "Singleton",
        type: "ConstantValue",
        cache: {},
        activated: true,
      },
    ]);
    mockContainer._bindingDictionary._map.set("Logger", [
      {
        scope: "Transient",
        type: "Factory",
        cache: null,
        activated: false,
      },
    ]);
  });

  describe("Happy Path", () => {
    it("should filter by scope", () => {
      // Act
      const result = appContainer.filterBindings({ scope: "Singleton" });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((b) => b.scope === "Singleton")).toBe(true);
    });

    it("should filter by type", () => {
      // Act
      const result = appContainer.filterBindings({ type: "Constructor" });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((b) => b.type === "Constructor")).toBe(true);
    });

    it("should filter by cached status", () => {
      // Act
      const cached = appContainer.filterBindings({ cached: true });
      const notCached = appContainer.filterBindings({ cached: false });

      // Assert
      expect(cached).toHaveLength(2);
      expect(notCached).toHaveLength(2);
    });

    it("should filter by activated status", () => {
      // Act
      const activated = appContainer.filterBindings({ activated: true });
      const notActivated = appContainer.filterBindings({ activated: false });

      // Assert
      expect(activated).toHaveLength(2);
      expect(notActivated).toHaveLength(2);
    });

    it("should filter by identifier pattern (case-insensitive)", () => {
      // Act
      const result = appContainer.filterBindings({ identifier: "controller" });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].serviceIdentifier).toBe("UserController");
    });

    it("should combine multiple filters", () => {
      // Act
      const result = appContainer.filterBindings({
        scope: "Singleton",
        cached: true,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((b) => b.scope === "Singleton" && b.cached)).toBe(
        true,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should return all bindings when no filters specified", () => {
      // Act
      const result = appContainer.filterBindings({});

      // Assert
      expect(result).toHaveLength(4);
    });

    it("should return empty array when no matches", () => {
      // Act
      const result = appContainer.filterBindings({ scope: "NonExistent" });

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle empty identifier pattern", () => {
      // Act - empty string matches all
      const result = appContainer.filterBindings({ identifier: "" });

      // Assert
      expect(result).toHaveLength(4);
    });
  });
});

// End of unit tests for: filterBindings
