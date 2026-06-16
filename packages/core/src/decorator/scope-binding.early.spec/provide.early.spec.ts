// Unit tests for: provide

import { fluentProvide, METADATA_KEY } from "../../di/binding-decorator";
import { provide } from "../scope-binding";

jest.mock("../../di/binding-decorator", () => {
  const originalDecorator = jest.fn((target) => target);
  const doneMock = jest.fn(() => originalDecorator);
  const fluentProvideMock = jest.fn(() => ({
    done: doneMock,
  }));
  return {
    fluentProvide: fluentProvideMock,
    __doneMock: doneMock,
    __originalDecorator: originalDecorator,
    METADATA_KEY: {
      scope: "expressots:provider:scope",
      source: "expressots:provider:source",
      providerMeta: "expressots:provider:meta",
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("provide() provide method", () => {
  describe("Happy Path", () => {
    it("should return a decorator function when called with a valid identifier", () => {
      // Arrange
      const identifier = "validIdentifier";

      // Act
      const result = provide(identifier);

      // Assert
      const {
        fluentProvide,
        __doneMock: doneMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(typeof result).toBe("function");
    });

    it("should store metadata when decorator is applied to a class", () => {
      // Arrange
      const identifier = "validIdentifier";
      class TestClass {}

      // Act
      const decorator = provide(identifier);
      const DecoratedClass = decorator(TestClass);

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, TestClass);
      const source = Reflect.getMetadata(METADATA_KEY.source, TestClass);

      expect(scope).toBe("Request");
      expect(source).toBe("user");
      expect(DecoratedClass).toBe(TestClass);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null identifier gracefully", () => {
      // Arrange
      const identifier = null;

      // Act
      const result = provide(identifier);

      // Assert
      const {
        fluentProvide,
        __doneMock: doneMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(typeof result).toBe("function");
    });

    it("should handle undefined identifier gracefully", () => {
      // Arrange
      const identifier = undefined;

      // Act
      const result = provide(identifier);

      // Assert
      const {
        fluentProvide,
        __doneMock: doneMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(typeof result).toBe("function");
    });

    it("should handle numeric identifier gracefully", () => {
      // Arrange
      const identifier = 123;

      // Act
      const result = provide(identifier);

      // Assert
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(typeof result).toBe("function");
    });

    it("should handle object identifier gracefully", () => {
      // Arrange
      const identifier = { key: "value" };

      // Act
      const result = provide(identifier);

      // Assert
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(typeof result).toBe("function");
    });
  });
});

// End of unit tests for: provide
