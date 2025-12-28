// Unit tests for: ProviderManager.getFormattedView

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.getFormattedView() getFormattedView method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {} as interfaces.Container;
    providerManager = new ProviderManager(mockContainer);
  });

  describe("Happy Path", () => {
    it("should delegate to registry.getFormattedView", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      const mockView = {
        entries: [],
        total: 0,
        remaining: 0,
        bySource: {
          builtin: 0,
          user: 0,
          external: 0,
        },
      };
      jest.spyOn(registry, "getFormattedView").mockReturnValue(mockView);

      // Act
      const result = providerManager.getFormattedView(5);

      // Assert
      expect(registry.getFormattedView).toHaveBeenCalledWith(5);
      expect(result).toBe(mockView);
    });

    it("should use default maxDisplay when not provided", () => {
      // Arrange
      const registry = providerManager.getRegistry();
      jest.spyOn(registry, "getFormattedView").mockReturnValue({
        entries: [],
        total: 0,
        remaining: 0,
        bySource: {
          builtin: 0,
          user: 0,
          external: 0,
        },
      });

      // Act
      providerManager.getFormattedView();

      // Assert
      expect(registry.getFormattedView).toHaveBeenCalledWith(5);
    });
  });
});

// End of unit tests for: ProviderManager.getFormattedView
