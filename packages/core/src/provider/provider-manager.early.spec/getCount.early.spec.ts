// Unit tests for: ProviderManager.getCount

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getCount() getCount method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getCount", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getCount").mockReturnValue(5);

      // Act
      const result = providerManager.getCount();

      // Assert
      expect(registry.getCount).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });
});

// End of unit tests for: ProviderManager.getCount

