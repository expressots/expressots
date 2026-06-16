// Unit tests for: ProviderManager.getExternalProviders

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getExternalProviders() getExternalProviders method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getExternalProviders", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getExternalProviders").mockReturnValue([]);

      // Act
      const result = providerManager.getExternalProviders();

      // Assert
      expect(registry.getExternalProviders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getExternalProviders
