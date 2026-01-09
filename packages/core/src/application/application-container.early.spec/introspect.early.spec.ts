// Unit tests for: introspect

import { AppContainer } from "../application-container";
import { ContainerIntrospection } from "../application.types";
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

describe("AppContainer.introspect() introspect method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({
      defaultScope: "Request",
      autoBindInjectable: true,
      skipBaseClassChecks: false,
    } as any);
    (appContainer as any).container = mockContainer;
  });

  describe("Happy Path", () => {
    it("should return complete introspection data", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("TestService", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          activated: true,
        },
      ]);

      // Act
      const result: ContainerIntrospection = appContainer.introspect();

      // Assert
      expect(result).toHaveProperty("bindings");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("options");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("containerId");
    });

    it("should include container options", () => {
      // Act
      const result = appContainer.introspect();

      // Assert
      expect(result.options.defaultScope).toBe("Request");
      expect(result.options.autoBindInjectable).toBe(true);
      expect(result.options.skipBaseClassChecks).toBe(false);
    });

    it("should include container ID", () => {
      // Act
      const result = appContainer.introspect();

      // Assert
      expect(result.containerId).toBe(123);
    });

    it("should include valid ISO timestamp", () => {
      // Act
      const result = appContainer.introspect();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it("should include bindings and summary", () => {
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
        { scope: "Request", type: "Factory", cache: null, activated: false },
      ]);

      // Act
      const result = appContainer.introspect();

      // Assert
      expect(result.bindings).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.byScope).toEqual({
        Singleton: 1,
        Request: 1,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty container", () => {
      // Act
      const result = appContainer.introspect();

      // Assert
      expect(result.bindings).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it("should return -1 containerId when container not created", () => {
      // Arrange
      const freshContainer = new AppContainer();

      // Act
      const result = freshContainer.introspect();

      // Assert
      expect(result.containerId).toBe(-1);
    });

    it("should be serializable to JSON", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("TestService", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          activated: true,
        },
      ]);

      // Act
      const result = appContainer.introspect();
      const serialized = JSON.stringify(result);
      const parsed = JSON.parse(serialized);

      // Assert
      expect(parsed.bindings).toHaveLength(1);
      expect(parsed.summary.total).toBe(1);
      expect(parsed.containerId).toBe(123);
    });
  });

  describe("Studio Integration", () => {
    it("should provide data suitable for ExpressoTS Studio", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("UserController", [
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          moduleId: 1,
          activated: false,
        },
      ]);
      mockContainer._bindingDictionary._map.set("AuthService", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          moduleId: 2,
          activated: true,
        },
      ]);

      // Act
      const result = appContainer.introspect();

      // Assert - All fields needed for Studio visualization
      expect(result.bindings[0]).toHaveProperty("serviceIdentifier");
      expect(result.bindings[0]).toHaveProperty("scope");
      expect(result.bindings[0]).toHaveProperty("type");
      expect(result.bindings[0]).toHaveProperty("cached");
      expect(result.bindings[0]).toHaveProperty("activated");
      expect(result.bindings[0]).toHaveProperty("moduleId");

      expect(result.summary).toHaveProperty("total");
      expect(result.summary).toHaveProperty("byScope");
      expect(result.summary).toHaveProperty("byType");
      expect(result.summary).toHaveProperty("cached");
      expect(result.summary).toHaveProperty("activated");
    });
  });
});

// End of unit tests for: introspect
