// Unit tests for: ProviderRegistry.getLifecycleProviders

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { ProviderInfo, ProviderCapabilities } from "../provider.interface";

describe("ProviderRegistry.getLifecycleProviders() getLifecycleProviders method", () => {
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
    it("should return providers with bootstrap or shutdown", () => {
      // Arrange
      jest.spyOn(registry, "getAll").mockReturnValue([
        {
          name: "BootstrapProvider",
          capabilities: {
            hasBootstrap: true,
            hasShutdown: false,
            hasHealthCheck: false,
            hasMetrics: false,
            hasConfigurable: false,
          } as ProviderCapabilities,
        } as ProviderInfo,
        {
          name: "ShutdownProvider",
          capabilities: {
            hasBootstrap: false,
            hasShutdown: true,
            hasHealthCheck: false,
            hasMetrics: false,
            hasConfigurable: false,
          } as ProviderCapabilities,
        } as ProviderInfo,
        {
          name: "RegularProvider",
          capabilities: {
            hasBootstrap: false,
            hasShutdown: false,
            hasHealthCheck: false,
            hasMetrics: false,
            hasConfigurable: false,
          } as ProviderCapabilities,
        } as ProviderInfo,
      ]);

      // Act
      const providers = registry.getLifecycleProviders();

      // Assert
      expect(providers.length).toBe(2);
      expect(providers.map((p) => p.name)).toContain("BootstrapProvider");
      expect(providers.map((p) => p.name)).toContain("ShutdownProvider");
    });
  });
});

// End of unit tests for: ProviderRegistry.getLifecycleProviders

