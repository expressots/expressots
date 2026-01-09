// Unit tests for: getBindingsInfo

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
    _map: new Map<unknown, Array<any>>(),
  };

  public bind = jest.fn();
  public load = jest.fn();
}

describe("AppContainer.getBindingsInfo() getBindingsInfo method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({} as any);
    (appContainer as any).container = mockContainer;
  });

  describe("Happy Path", () => {
    it("should return binding info array when bindings exist", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Singleton",
          type: "Instance",
          cache: {},
          moduleId: 1,
          activated: true,
        },
      ];
      mockContainer._bindingDictionary._map.set("TestService", mockBindings);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        serviceIdentifier: "TestService",
        scope: "Singleton",
        type: "Instance",
        cached: true,
        moduleId: 1,
        activated: true,
      });
    });

    it("should return multiple bindings from different services", () => {
      // Arrange
      const mockBindings1 = [
        {
          scope: "Singleton",
          type: "Instance",
          cache: {},
          moduleId: 1,
          activated: true,
        },
      ];
      const mockBindings2 = [
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          moduleId: 2,
          activated: false,
        },
      ];
      mockContainer._bindingDictionary._map.set("Service1", mockBindings1);
      mockContainer._bindingDictionary._map.set("Service2", mockBindings2);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result).toHaveLength(2);
    });

    it("should format class identifiers correctly", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: null,
          moduleId: 1,
          activated: false,
        },
      ];
      mockContainer._bindingDictionary._map.set(
        "[class MyController]",
        mockBindings,
      );

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result[0].serviceIdentifier).toBe("MyController");
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array when container not created", () => {
      // Arrange
      const freshContainer = new AppContainer();

      // Act
      const result = freshContainer.getBindingsInfo();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when no bindings exist", () => {
      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle bindings with null cache correctly", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Transient",
          type: "Factory",
          cache: null,
          moduleId: undefined,
          activated: false,
        },
      ];
      mockContainer._bindingDictionary._map.set("AnotherService", mockBindings);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result[0].cached).toBe(false);
    });

    it("should handle string Symbol identifiers", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Singleton",
          type: "ConstantValue",
          cache: {},
          moduleId: 1,
          activated: true,
        },
      ];
      mockContainer._bindingDictionary._map.set(
        "Symbol(MyToken)",
        mockBindings,
      );

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result[0].serviceIdentifier).toBe("Symbol(MyToken)");
    });

    it("should handle actual Symbol identifiers", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Singleton",
          type: "ConstantValue",
          cache: {},
          moduleId: 1,
          activated: true,
        },
      ];
      const symbolKey = Symbol.for("MySymbolService");
      mockContainer._bindingDictionary._map.set(symbolKey, mockBindings);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result[0].serviceIdentifier).toBe("Symbol(MySymbolService)");
    });

    it("should handle class constructor identifiers", () => {
      // Arrange
      class TestController {}
      const mockBindings = [
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          moduleId: 1,
          activated: false,
        },
      ];
      mockContainer._bindingDictionary._map.set(TestController, mockBindings);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      expect(result[0].serviceIdentifier).toBe("TestController");
    });

    it("should handle anonymous class constructors", () => {
      // Arrange
      const AnonymousClass = class {};
      const mockBindings = [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: null,
          moduleId: 1,
          activated: false,
        },
      ];
      mockContainer._bindingDictionary._map.set(AnonymousClass, mockBindings);

      // Act
      const result = appContainer.getBindingsInfo();

      // Assert
      // Anonymous classes have empty name, so fallback is used
      expect(result[0].serviceIdentifier).toBeDefined();
    });
  });
});

// End of unit tests for: getBindingsInfo
