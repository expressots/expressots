// Unit tests for: ProviderRegistry.getCount

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";

describe("ProviderRegistry.getCount() getCount method", () => {
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
    it("should return 0 when no providers discovered", () => {
      // Act
      const count = registry.getCount();

      // Assert
      expect(count).toBe(0);
    });

    it("should auto-discover if not already discovered", () => {
      // Arrange
      jest.spyOn(registry, "discover").mockImplementation(() => {});

      // Act
      registry.getCount();

      // Assert
      expect(registry.discover).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: ProviderRegistry.getCount

