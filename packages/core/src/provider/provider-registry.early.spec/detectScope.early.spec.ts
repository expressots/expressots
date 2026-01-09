// Unit tests for: ProviderRegistry.detectScope() private method

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { Scope } from "../../di/inversify";
import { METADATA_KEY } from "../../di/binding-decorator/constants";
import { ProviderOptions } from "../../decorator/scope-binding";

// Save original before any mocks
const originalGetMetadata = Reflect.getMetadata;

describe("ProviderRegistry.detectScope()", () => {
  let mockContainer: interfaces.Container;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      get: jest.fn(),
    } as any;
    registry = new ProviderRegistry(mockContainer);
    jest.clearAllMocks();
    // Mock Reflect.getMetadata to return empty array by default
    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [];
      }
      return undefined;
    });
  });

  it("should detect scope from METADATA_KEY.scope", () => {
    // Arrange
    class TestProvider {}
    Reflect.defineMetadata(
      METADATA_KEY.scope,
      Scope.Singleton,
      TestProvider,
    );
    (Reflect.getMetadata as jest.Mock).mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: TestProvider }];
      }
      // Use original for TestProvider metadata lookups
      if (target === TestProvider) {
        return originalGetMetadata(key, TestProvider);
      }
      return undefined;
    });

    // Act
    registry.discover();
    const providers = registry.getAll();

    // Assert
    const provider = providers.find((p) => p.target === TestProvider);
    expect(provider?.scope).toBe(Scope.Singleton);
  });

  it("should detect scope from providerMeta.scope fallback", () => {
    // Arrange
    class TestProvider {}
    const providerMeta: ProviderOptions = {
      scope: Scope.Transient,
    };
    Reflect.defineMetadata(
      METADATA_KEY.providerMeta,
      providerMeta,
      TestProvider,
    );
    (Reflect.getMetadata as jest.Mock).mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: TestProvider }];
      }
      // Use original for TestProvider metadata lookups
      if (target === TestProvider) {
        return originalGetMetadata(key, TestProvider);
      }
      return undefined;
    });

    // Act
    registry.discover();
    const providers = registry.getAll();

    // Assert
    const provider = providers.find((p) => p.target === TestProvider);
    expect(provider?.scope).toBe(Scope.Transient);
  });

  it("should default to Request scope when no metadata", () => {
    // Arrange
    class TestProvider {}
    // No metadata set
    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: TestProvider }];
      }
      return undefined;
    });

    // Act
    registry.discover();
    const providers = registry.getAll();

    // Assert
    const provider = providers.find((p) => p.target === TestProvider);
    expect(provider?.scope).toBe(Scope.Request);
  });
});
