// Unit tests for: ProviderManager.discover

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderManager.discover() discover method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.discover", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "discover");

      // Act
      providerManager.discover();

      // Assert
      expect(registry.discover).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: ProviderManager.discover
