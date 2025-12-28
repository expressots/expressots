// Unit tests for: ProviderManager.has

import { interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

describe("ProviderManager.has() has method", () => {
  let mockContainer: interfaces.Container;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
    } as any;
    providerManager = new ProviderManager(mockContainer);
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should return true when provider is bound", () => {
      // Arrange
      const serviceIdentifier = "TestService";
      (mockContainer.isBound as jest.Mock).mockReturnValue(true);

      // Act
      const result = providerManager.has(serviceIdentifier as any);

      // Assert
      expect(result).toBe(true);
      expect(mockContainer.isBound).toHaveBeenCalledWith(serviceIdentifier);
    });

    it("should return false when provider is not bound", () => {
      // Arrange
      const serviceIdentifier = "TestService";
      (mockContainer.isBound as jest.Mock).mockReturnValue(false);

      // Act
      const result = providerManager.has(serviceIdentifier as any);

      // Assert
      expect(result).toBe(false);
      expect(mockContainer.isBound).toHaveBeenCalledWith(serviceIdentifier);
    });
  });
});

// End of unit tests for: ProviderManager.has
