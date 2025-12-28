// Unit tests for: ProviderRegistry.getByScope

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { ProviderInfo } from "../provider.interface";

describe("ProviderRegistry.getByScope() getByScope method", () => {
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
    it("should return empty array when no providers match scope", () => {
      // Act
      const providers = registry.getByScope("Singleton");

      // Assert
      expect(providers).toEqual([]);
    });

    it("should cache results for same scope", () => {
      // Arrange
      jest.spyOn(registry, "getAll").mockReturnValue([
        {
          name: "TestProvider",
          scope: "Singleton",
        } as ProviderInfo,
      ]);

      // Act
      const first = registry.getByScope("Singleton");
      const second = registry.getByScope("Singleton");

      // Assert
      expect(first).toBe(second); // Same reference (cached)
      expect(registry.getAll).toHaveBeenCalledTimes(1);
    });
  });
});

// End of unit tests for: ProviderRegistry.getByScope

