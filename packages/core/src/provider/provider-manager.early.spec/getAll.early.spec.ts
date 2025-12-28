// Unit tests for: ProviderManager.getAll

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getAll() getAll method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getAll", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getAll").mockReturnValue([]);

      // Act
      const result = providerManager.getAll();

      // Assert
      expect(registry.getAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getAll

