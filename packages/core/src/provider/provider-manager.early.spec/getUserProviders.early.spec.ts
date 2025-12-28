// Unit tests for: ProviderManager.getUserProviders

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getUserProviders() getUserProviders method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getUserProviders", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getUserProviders").mockReturnValue([]);

      // Act
      const result = providerManager.getUserProviders();

      // Assert
      expect(registry.getUserProviders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getUserProviders

