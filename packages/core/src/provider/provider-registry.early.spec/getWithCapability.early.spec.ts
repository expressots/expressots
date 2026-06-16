// Unit tests for: ProviderRegistry.getWithCapability

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { ProviderInfo, ProviderCapabilities } from "../provider.interface";

describe("ProviderRegistry.getWithCapability() getWithCapability method", () => {
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
    it("should return empty array when no providers have capability", () => {
      // Act
      const providers = registry.getWithCapability("hasBootstrap");

      // Assert
      expect(providers).toEqual([]);
    });

    it("should cache results for same capability", () => {
      // Arrange
      jest.spyOn(registry, "getAll").mockReturnValue([
        {
          name: "TestProvider",
          capabilities: {
            hasBootstrap: true,
            hasShutdown: false,
            hasHealthCheck: false,
            hasMetrics: false,
            hasConfigurable: false,
          } as ProviderCapabilities,
        } as ProviderInfo,
      ]);

      // Act
      const first = registry.getWithCapability("hasBootstrap");
      const second = registry.getWithCapability("hasBootstrap");

      // Assert
      expect(first).toBe(second); // Same reference (cached)
      expect(registry.getAll).toHaveBeenCalledTimes(1);
    });
  });
});

// End of unit tests for: ProviderRegistry.getWithCapability
