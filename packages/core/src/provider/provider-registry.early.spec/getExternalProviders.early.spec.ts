// Unit tests for: ProviderRegistry.getExternalProviders

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry.getExternalProviders() getExternalProviders method", () => {
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
    it("should return external providers", () => {
      // Act
      const providers = registry.getExternalProviders();

      // Assert
      expect(Array.isArray(providers)).toBe(true);
    });

    it("should delegate to getBySource", () => {
      // Arrange
      jest.spyOn(registry, "getBySource").mockReturnValue([]);

      // Act
      registry.getExternalProviders();

      // Assert
      expect(registry.getBySource).toHaveBeenCalledWith("external");
    });
  });
});

// End of unit tests for: ProviderRegistry.getExternalProviders

