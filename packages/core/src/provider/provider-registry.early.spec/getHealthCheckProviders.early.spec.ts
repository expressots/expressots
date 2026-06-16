// Unit tests for: ProviderRegistry.getHealthCheckProviders

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry.getHealthCheckProviders() getHealthCheckProviders method", () => {
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
      registry.getHealthCheckProviders();

      // Assert
      expect(registry.getWithCapability).toHaveBeenCalledWith("hasHealthCheck");
    });
  });
});

// End of unit tests for: ProviderRegistry.getHealthCheckProviders
