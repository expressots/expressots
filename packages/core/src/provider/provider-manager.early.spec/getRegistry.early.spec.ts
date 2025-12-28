// Unit tests for: ProviderManager.getRegistry

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderManager.getRegistry() getRegistry method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should return the ProviderRegistry instance", () => {
      // Act
      const registry = providerManager.getRegistry();

      // Assert
      expect(registry).toBeInstanceOf(ProviderRegistry);
    });

    it("should return the same instance on multiple calls", () => {
      // Act
      const registry1 = providerManager.getRegistry();
      const registry2 = providerManager.getRegistry();

      // Assert
      expect(registry1).toBe(registry2);
    });
  });
});

// End of unit tests for: ProviderManager.getRegistry

