// Unit tests for: getBindingsSummary

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

describe("AppContainer.getBindingsSummary() getBindingsSummary method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({} as any);
    (appContainer as any).container = mockContainer;
  });

  describe("Happy Path", () => {
    it("should return correct summary statistics", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("Service1", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          activated: true,
        },
      ]);
      mockContainer._bindingDictionary._map.set("Service2", [
        {
          scope: "Singleton",
          type: "ConstantValue",
          cache: {},
          activated: true,
        },
      ]);
      mockContainer._bindingDictionary._map.set("Service3", [
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          activated: false,
        },
      ]);

      // Act
      const result = appContainer.getBindingsSummary();

      // Assert
      expect(result.total).toBe(3);
      expect(result.byScope).toEqual({
        Singleton: 2,
        Request: 1,
      });
      expect(result.byType).toEqual({
        Constructor: 2,
        ConstantValue: 1,
      });
      expect(result.cached).toBe(2);
      expect(result.activated).toBe(2);
    });

    it("should handle single binding", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("OnlyService", [
        {
          scope: "Transient",
          type: "Factory",
          cache: null,
          activated: false,
        },
      ]);

      // Act
      const result = appContainer.getBindingsSummary();

      // Assert
      expect(result.total).toBe(1);
      expect(result.byScope).toEqual({ Transient: 1 });
      expect(result.byType).toEqual({ Factory: 1 });
      expect(result.cached).toBe(0);
      expect(result.activated).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should return zero totals when no bindings exist", () => {
      // Act
      const result = appContainer.getBindingsSummary();

      // Assert
      expect(result.total).toBe(0);
      expect(result.byScope).toEqual({});
      expect(result.byType).toEqual({});
      expect(result.cached).toBe(0);
      expect(result.activated).toBe(0);
    });

    it("should handle multiple bindings for same service", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("MultiService", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          activated: true,
        },
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          activated: false,
        },
      ]);

      // Act
      const result = appContainer.getBindingsSummary();

      // Assert
      expect(result.total).toBe(2);
      expect(result.byScope).toEqual({
        Singleton: 1,
        Request: 1,
      });
    });
  });
});

// End of unit tests for: getBindingsSummary
