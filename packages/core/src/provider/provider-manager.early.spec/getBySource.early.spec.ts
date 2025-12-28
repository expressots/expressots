// Unit tests for: ProviderManager.getBySource

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";
import { ProviderSource } from "../provider.interface";

describe("ProviderManager.getBySource() getBySource method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getBySource", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getBySource").mockReturnValue([]);

      // Act
      const result = providerManager.getBySource("builtin");

      // Assert
      expect(registry.getBySource).toHaveBeenCalledWith("builtin");
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getBySource

