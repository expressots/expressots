// Unit tests for: viewContainerBindings

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

// Mock classes and interfaces
class MockContainer {
  public _bindingDictionary = {
    _map: new Map<string, Array<any>>(),
  };

  public bind = jest.fn();
  public load = jest.fn();
}

describe("AppContainer.viewContainerBindings() viewContainerBindings method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer({} as any);
    (appContainer as any).container = mockContainer;
  });

  describe("Happy Path", () => {
    it("should print the binding dictionary as a table when bindings exist", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Singleton",
          type: "Instance",
          cache: {},
        },
      ];
      mockContainer._bindingDictionary._map.set("TestService", mockBindings);

      console.table = jest.fn();

      // Act
      appContainer.viewContainerBindings();

      // Assert
      expect(console.table).toHaveBeenCalledWith([
        {
          "Service Identifier": "TestService",
          Scope: "Singleton",
          Type: "Instance",
          Cache: "Yes",
        },
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty binding dictionary gracefully", () => {
      // Arrange
      console.table = jest.fn();

      // Act
      appContainer.viewContainerBindings();

      // Assert
      expect(console.table).toHaveBeenCalledWith([]);
    });

    it("should handle bindings with null cache correctly", () => {
      // Arrange
      const mockBindings = [
        {
          scope: "Transient",
          type: "Factory",
          cache: null,
        },
      ];
      mockContainer._bindingDictionary._map.set("AnotherService", mockBindings);

      console.table = jest.fn();

      // Act
      appContainer.viewContainerBindings();

      // Assert
      expect(console.table).toHaveBeenCalledWith([
        {
          "Service Identifier": "AnotherService",
          Scope: "Transient",
          Type: "Factory",
          Cache: "No",
        },
      ]);
    });
  });
});

// End of unit tests for: viewContainerBindings
