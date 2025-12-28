// Unit tests for: ProviderManager.getWithCapability

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";
import { ProviderCapabilities } from "../provider.interface";

describe("ProviderManager.getWithCapability() getWithCapability method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getWithCapability", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getWithCapability").mockReturnValue([]);

      // Act
      const result = providerManager.getWithCapability("hasBootstrap");

      // Assert
      expect(registry.getWithCapability).toHaveBeenCalledWith("hasBootstrap");
      expect(result).toEqual([]);
    });
  });
});

// End of unit tests for: ProviderManager.getWithCapability

