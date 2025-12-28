// Unit tests for: ProviderManager.getByScope

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getByScope() getByScope method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getByScope", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getByScope").mockReturnValue([]);

      // Act
      const result = providerManager.getByScope("Singleton");

      // Assert
      expect(registry.getByScope).toHaveBeenCalledWith("Singleton");
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getByScope

