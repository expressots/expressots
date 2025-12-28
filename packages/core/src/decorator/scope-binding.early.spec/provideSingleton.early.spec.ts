// Unit tests for: provideSingleton

import "reflect-metadata";
import { fluentProvide, METADATA_KEY } from "../../di/binding-decorator";
import { provideSingleton } from "../scope-binding";
import { ProviderSource } from "../../provider/provider.interface";

jest.mock("../../di/binding-decorator", () => {
  const originalDecorator = jest.fn((target) => target);
  const inSingletonScopeMock = jest.fn(() => ({
    done: jest.fn(() => originalDecorator),
  }));
  const fluentProvideMock = jest.fn(() => ({
    inSingletonScope: inSingletonScopeMock,
    done: jest.fn(() => originalDecorator),
  }));
  return {
    fluentProvide: fluentProvideMock,
    __inSingletonScopeMock: inSingletonScopeMock,
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

describe("provideSingleton() provideSingleton method", () => {
  describe("Happy Path", () => {
    it("should return a decorator function when called with a valid identifier", () => {
      // Arrange
      const identifier = "ServiceIdentifier";

      // Act
      const result = provideSingleton(identifier);

      // Assert
      const {
        fluentProvide,
        __inSingletonScopeMock: inSingletonScopeMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(inSingletonScopeMock).toHaveBeenCalled();
      expect(typeof result).toBe("function");
    });

    it("should store metadata with Singleton scope when decorator is applied", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      class TestClass {}

      // Act
      const decorator = provideSingleton(identifier);
      const DecoratedClass = decorator(TestClass);

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, TestClass);
      const source = Reflect.getMetadata(METADATA_KEY.source, TestClass);

      expect(scope).toBe("Singleton");
      expect(source).toBe("user");
      expect(DecoratedClass).toBe(TestClass);
    });

    it("should use custom source when provided", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const source: ProviderSource = "external";
      class TestClass {}

      // Act
      const decorator = provideSingleton(identifier, source);
      decorator(TestClass);

      // Assert
      const storedSource = Reflect.getMetadata(METADATA_KEY.source, TestClass);
      expect(storedSource).toBe("external");
    });

    it("should use builtin source when provided", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const source: ProviderSource = "builtin";
      class TestClass {}

      // Act
      const decorator = provideSingleton(identifier, source);
      decorator(TestClass);

      // Assert
      const storedSource = Reflect.getMetadata(METADATA_KEY.source, TestClass);
      expect(storedSource).toBe("builtin");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null identifier gracefully", () => {
      // Arrange
      const identifier = null;

      // Act
      const result = provideSingleton(identifier);

      // Assert
      const { fluentProvide } = require("../../di/binding-decorator");
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(typeof result).toBe("function");
    });

    it("should handle undefined identifier gracefully", () => {
      // Arrange
      const identifier = undefined;

      // Act
      const result = provideSingleton(identifier);

      // Assert
      const { fluentProvide } = require("../../di/binding-decorator");
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(typeof result).toBe("function");
    });
  });
});

// End of unit tests for: provideSingleton
