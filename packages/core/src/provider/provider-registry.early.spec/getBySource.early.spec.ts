// Unit tests for: ProviderRegistry.getBySource

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { ProviderInfo, ProviderSource } from "../provider.interface";

describe("ProviderRegistry.getBySource() getBySource method", () => {
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
    it("should return empty array when no providers match source", () => {
      // Act
      const providers = registry.getBySource("builtin");

      // Assert
      expect(providers).toEqual([]);
    });

    it("should cache results for same source", () => {
      // Arrange
      jest.spyOn(registry, "getAll").mockReturnValue([
        {
          name: "TestProvider",
          source: "builtin" as ProviderSource,
        } as ProviderInfo,
      ]);

      // Act
      const first = registry.getBySource("builtin");
      const second = registry.getBySource("builtin");

      // Assert
      expect(first).toBe(second); // Same reference (cached)
      expect(registry.getAll).toHaveBeenCalledTimes(1);
    });
  });
});

// End of unit tests for: ProviderRegistry.getBySource

