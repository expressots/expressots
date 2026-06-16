// Unit tests for: ProviderRegistry constructor

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry() ProviderRegistry constructor", () => {
  describe("Happy Path", () => {
    it("should create a ProviderRegistry instance", () => {
      // Arrange
      const mockContainer = {} as interfaces.Container;

      // Act
      const registry = new ProviderRegistry(mockContainer);

      // Assert
      expect(registry).toBeInstanceOf(ProviderRegistry);
    });
  });
});

// End of unit tests for: ProviderRegistry constructor
