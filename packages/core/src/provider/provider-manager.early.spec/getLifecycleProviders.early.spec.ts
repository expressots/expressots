// Unit tests for: ProviderManager.getLifecycleProviders

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getLifecycleProviders() getLifecycleProviders method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getLifecycleProviders", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getLifecycleProviders").mockReturnValue([]);

      // Act
      const result = providerManager.getLifecycleProviders();

      // Assert
      expect(registry.getLifecycleProviders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getLifecycleProviders
