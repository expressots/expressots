// Unit tests for: ProviderRegistry.getMetricsProviders

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry.getMetricsProviders() getMetricsProviders method", () => {
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
    it("should delegate to getWithCapability", () => {
      // Arrange
      jest.spyOn(registry, "getWithCapability").mockReturnValue([]);

      // Act
      registry.getMetricsProviders();

      // Assert
      expect(registry.getWithCapability).toHaveBeenCalledWith("hasMetrics");
    });
  });
});

// End of unit tests for: ProviderRegistry.getMetricsProviders

