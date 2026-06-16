// Unit tests for: getFormattedBindingsView

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

describe("AppContainer.getFormattedBindingsView() getFormattedBindingsView method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({} as any);
    (appContainer as any).container = mockContainer;
  });

  describe("Happy Path", () => {
    it("should return formatted string with header and bindings", () => {
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
      const result = appContainer.getFormattedBindingsView();

      // Assert
      expect(result).toContain("CONTAINER BINDINGS");
      expect(result).toContain("Total: 1 bindings");
      expect(result).toContain("TestService");
      expect(result).toContain("Singleton");
      expect(result).toContain("Constructor");
    });

    it("should include summary statistics", () => {
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
      const result = appContainer.getFormattedBindingsView();

      // Assert
      expect(result).toContain("Total: 2 bindings");
      expect(result).toContain("By Scope:");
      expect(result).toContain("Singleton(1)");
      expect(result).toContain("Request(1)");
      expect(result).toContain("Cached: 1");
      expect(result).toContain("Activated: 1");
    });

    it("should apply filter when provided", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("SingletonService", [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: {},
          activated: true,
        },
      ]);
      mockContainer._bindingDictionary._map.set("RequestService", [
        {
          scope: "Request",
          type: "Constructor",
          cache: null,
          activated: false,
        },
      ]);

      // Act
      const result = appContainer.getFormattedBindingsView({
        scope: "Singleton",
      });

      // Assert
      expect(result).toContain("SingletonService");
      // Note: The formatted view still shows overall summary, but filtered bindings list
    });

    it("should truncate long service identifiers", () => {
      // Arrange
      const longName =
        "VeryLongServiceIdentifierThatExceedsFiftyCharactersAndNeedsTruncation";
      mockContainer._bindingDictionary._map.set(longName, [
        {
          scope: "Singleton",
          type: "Constructor",
          cache: null,
          activated: false,
        },
      ]);

      // Act
      const result = appContainer.getFormattedBindingsView();

      // Assert
      expect(result).toContain("...");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty container gracefully", () => {
      // Act
      const result = appContainer.getFormattedBindingsView();

      // Assert
      expect(result).toContain("Total: 0 bindings");
      expect(result).toContain("CONTAINER BINDINGS");
    });

    it("should show Yes/No for cached status", () => {
      // Arrange
      mockContainer._bindingDictionary._map.set("CachedService", [
        { scope: "Singleton", type: "Constructor", cache: {}, activated: true },
      ]);
      mockContainer._bindingDictionary._map.set("UncachedService", [
        { scope: "Transient", type: "Factory", cache: null, activated: false },
      ]);

      // Act
      const result = appContainer.getFormattedBindingsView();

      // Assert
      expect(result).toContain("Yes");
      expect(result).toContain("No");
    });
  });
});

// End of unit tests for: getFormattedBindingsView
