// Unit tests for: provideInScope

import "reflect-metadata";
import { fluentProvide, METADATA_KEY } from "../../di/binding-decorator";
import { provideInScope } from "../scope-binding";
import { ProviderSource } from "../../provider/provider.interface";

jest.mock("../../di/binding-decorator", () => {
  const originalDecorator = jest.fn((target) => target);
  const inScopeMock = jest.fn(() => ({ done: jest.fn(() => originalDecorator) }));
  const fluentProvideMock = jest.fn(() => ({
    inScope: inScopeMock,
    done: jest.fn(() => originalDecorator),
  }));
  return {
    fluentProvide: fluentProvideMock,
    __inScopeMock: inScopeMock,
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

describe("provideInScope() provideInScope method", () => {
  describe("Happy Path", () => {
    it("should return a decorator function when called with valid identifier and scope", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "tenant";

      // Act
      const result = provideInScope(identifier, scopeName);

      // Assert
      const {
        fluentProvide,
        __inScopeMock: inScopeMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(inScopeMock).toHaveBeenCalledWith(scopeName);
      expect(typeof result).toBe("function");
    });

    it("should store metadata with custom scope when decorator is applied", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "tenant";
      class TestClass {}

      // Act
      const decorator = provideInScope(identifier, scopeName);
      const DecoratedClass = decorator(TestClass);

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, TestClass);
      const source = Reflect.getMetadata(METADATA_KEY.source, TestClass);

      expect(scope).toBe(scopeName);
      expect(source).toBe("user");
      expect(DecoratedClass).toBe(TestClass);
    });

    it("should use custom source when provided", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "transaction";
      const source: ProviderSource = "external";
      class TestClass {}

      // Act
      const decorator = provideInScope(identifier, scopeName, source);
      decorator(TestClass);

      // Assert
      const storedSource = Reflect.getMetadata(METADATA_KEY.source, TestClass);
      expect(storedSource).toBe("external");
    });

    it("should handle transaction scope", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "transaction";
      class TestClass {}

      // Act
      const decorator = provideInScope(identifier, scopeName);
      decorator(TestClass);

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, TestClass);
      expect(scope).toBe("transaction");
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when scopeName is Singleton", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "Singleton";

      // Act & Assert
      expect(() => provideInScope(identifier, scopeName)).toThrow(
        'Cannot use built-in scope name "Singleton" as custom scope. Use the corresponding decorator instead (e.g., provideSingleton()).',
      );
    });

    it("should throw error when scopeName is Request", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "Request";

      // Act & Assert
      expect(() => provideInScope(identifier, scopeName)).toThrow(
        'Cannot use built-in scope name "Request" as custom scope. Use the corresponding decorator instead (e.g., provideSingleton()).',
      );
    });

    it("should throw error when scopeName is Transient", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "Transient";

      // Act & Assert
      expect(() => provideInScope(identifier, scopeName)).toThrow(
        'Cannot use built-in scope name "Transient" as custom scope. Use the corresponding decorator instead (e.g., provideSingleton()).',
      );
    });

    it("should handle empty string scope name", () => {
      // Arrange
      const identifier = "ServiceIdentifier";
      const scopeName = "";

      // Act
      const result = provideInScope(identifier, scopeName);

      // Assert
      expect(typeof result).toBe("function");
    });
  });
});

// End of unit tests for: provideInScope

