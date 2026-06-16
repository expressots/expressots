// Unit tests for: ProviderRegistry.getAll

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry.getAll() getAll method", () => {
  let mockContainer: interfaces.Container;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      get: jest.fn(),
    } as any;
    registry = new ProviderRegistry(mockContainer);
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should return empty array when no providers discovered", () => {
      // Act
      const providers = registry.getAll();

      // Assert
      expect(providers).toEqual([]);
    });

    it("should auto-discover if not already discovered", () => {
      // Arrange
      jest.spyOn(registry, "discover").mockImplementation(() => {});

      // Act
      registry.getAll();

      // Assert
      expect(registry.discover).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: ProviderRegistry.getAll
