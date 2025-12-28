// Unit tests for: Provider decorator

import "reflect-metadata";
import { fluentProvide, METADATA_KEY } from "../../di/binding-decorator";
import { Provider, ProviderOptions } from "../scope-binding";
import { ProviderSource } from "../../provider/provider.interface";

jest.mock("../../di/binding-decorator", () => {
  const originalDecorator = jest.fn((target) => target);
  const inSingletonScopeMock = jest.fn(() => ({
    done: jest.fn(() => originalDecorator),
  }));
  const inTransientScopeMock = jest.fn(() => ({
    done: jest.fn(() => originalDecorator),
  }));
  const inScopeMock = jest.fn(() => ({
    done: jest.fn(() => originalDecorator),
  }));
  const doneMock = jest.fn(() => originalDecorator);
  const fluentProvideMock = jest.fn(() => ({
    inSingletonScope: inSingletonScopeMock,
    inTransientScope: inTransientScopeMock,
    inScope: inScopeMock,
    done: doneMock,
  }));
  return {
    fluentProvide: fluentProvideMock,
    __inSingletonScopeMock: inSingletonScopeMock,
    __inTransientScopeMock: inTransientScopeMock,
    __inScopeMock: inScopeMock,
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

describe("Provider() Provider decorator", () => {
  describe("Happy Path", () => {
    it("should apply decorator with default options", () => {
      // Arrange
      class TestClass {}

      // Act
      @Provider()
      class DecoratedClass {}

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      const source = Reflect.getMetadata(METADATA_KEY.source, DecoratedClass);

      expect(scope).toBe("Request");
      expect(source).toBe("external");
    });

    it("should apply decorator with Singleton scope", () => {
      // Arrange
      const options: ProviderOptions = { scope: "Singleton" };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const {
        fluentProvide,
        __inSingletonScopeMock: inSingletonScopeMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(DecoratedClass);
      expect(inSingletonScopeMock).toHaveBeenCalled();

      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Singleton");
    });

    it("should apply decorator with Transient scope", () => {
      // Arrange
      const options: ProviderOptions = { scope: "Transient" };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const {
        fluentProvide,
        __inTransientScopeMock: inTransientScopeMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(DecoratedClass);
      expect(inTransientScopeMock).toHaveBeenCalled();

      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Transient");
    });

    it("should apply decorator with Request scope", () => {
      // Arrange
      const options: ProviderOptions = { scope: "Request" };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const {
        fluentProvide,
        __doneMock: doneMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(DecoratedClass);
      expect(doneMock).toHaveBeenCalled();

      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Request");
    });

    it("should apply decorator with custom scope", () => {
      // Arrange
      const options: ProviderOptions = { scope: "tenant" };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const {
        fluentProvide,
        __inScopeMock: inScopeMock,
      } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(DecoratedClass);
      expect(inScopeMock).toHaveBeenCalledWith("tenant");

      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("tenant");
    });

    it("should store provider metadata", () => {
      // Arrange
      const options: ProviderOptions = {
        scope: "Singleton",
        name: "Test Provider",
        version: "1.0.0",
        description: "Test description",
        author: "Test Author",
        repo: "https://github.com/test/repo",
        source: "user",
        dependencies: ["Dep1", "Dep2"],
        priority: 10,
      };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const metadata = Reflect.getMetadata(
        METADATA_KEY.providerMeta,
        DecoratedClass,
      );
      expect(metadata).toEqual(options);
    });

    it("should use custom source when provided", () => {
      // Arrange
      const options: ProviderOptions = {
        scope: "Singleton",
        source: "builtin",
      };

      // Act
      @Provider(options)
      class DecoratedClass {}

      // Assert
      const source = Reflect.getMetadata(METADATA_KEY.source, DecoratedClass);
      expect(source).toBe("builtin");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options object", () => {
      // Act
      @Provider({})
      class DecoratedClass {}

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Request");
    });

    it("should handle undefined options", () => {
      // Act
      @Provider(undefined as any)
      class DecoratedClass {}

      // Assert
      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Request");
    });

    it("should handle partial options", () => {
      // Arrange
      const options: Partial<ProviderOptions> = {
        name: "Partial Provider",
        version: "1.0.0",
      };

      // Act
      @Provider(options as ProviderOptions)
      class DecoratedClass {}

      // Assert
      const metadata = Reflect.getMetadata(
        METADATA_KEY.providerMeta,
        DecoratedClass,
      );
      expect(metadata).toEqual(options);
      const scope = Reflect.getMetadata(METADATA_KEY.scope, DecoratedClass);
      expect(scope).toBe("Request"); // Default scope
    });
  });
});

// End of unit tests for: Provider decorator
