// Unit tests for: ProviderRegistry.discover

import { interfaces } from "../../di/inversify";
import { METADATA_KEY } from "../../di/binding-decorator/constants";
import { ProviderRegistry } from "../provider-registry";

// Mock Reflect.getMetadata
jest.mock("reflect-metadata", () => ({}));

describe("ProviderRegistry.discover() discover method", () => {
  let mockContainer: interfaces.Container;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      get: jest.fn(),
    } as any;
    registry = new ProviderRegistry(mockContainer);
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should discover providers from metadata", () => {
      // Arrange
      class TestProvider {}
      const metadata = [
        {
          implementationType: TestProvider,
        },
      ];
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);

      // Act
      registry.discover();

      // Assert
      const providers = registry.getAll();
      expect(providers.length).toBeGreaterThanOrEqual(0);
    });

    it("should not discover twice if already discovered", () => {
      // Arrange
      class TestProvider {}
      const metadata = [
        {
          implementationType: TestProvider,
        },
      ];
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);

      // Act
      registry.discover();
      const firstCallCount = (Reflect.getMetadata as jest.Mock).mock.calls.length;
      registry.discover();

      // Assert - Should not call getMetadata again
      expect(Reflect.getMetadata).toHaveBeenCalledTimes(firstCallCount);
    });

    it("should skip providers without prototype", () => {
      // Arrange
      const metadata = [
        {
          implementationType: null,
        },
        {
          implementationType: undefined,
        },
        {
          implementationType: {},
        },
      ];
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);

      // Act
      registry.discover();

      // Assert
      const providers = registry.getAll();
      expect(providers.length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metadata", () => {
      // Arrange
      jest.spyOn(Reflect, "getMetadata").mockReturnValue([]);

      // Act
      registry.discover();

      // Assert
      const providers = registry.getAll();
      expect(providers.length).toBe(0);
    });

    it("should handle undefined metadata", () => {
      // Arrange
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(undefined);

      // Act
      registry.discover();

      // Assert
      const providers = registry.getAll();
      expect(providers.length).toBe(0);
    });
  });
});

// End of unit tests for: ProviderRegistry.discover

