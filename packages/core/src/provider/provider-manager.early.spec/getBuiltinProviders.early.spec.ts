// Unit tests for: ProviderManager.getBuiltinProviders

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getBuiltinProviders() getBuiltinProviders method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getBuiltinProviders", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getBuiltinProviders").mockReturnValue([]);

      // Act
      const result = providerManager.getBuiltinProviders();

      // Assert
      expect(registry.getBuiltinProviders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getBuiltinProviders
