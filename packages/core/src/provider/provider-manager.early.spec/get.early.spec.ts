// Unit tests for: get

import { ProviderManager } from "../provider-manager";
import "reflect-metadata";

// Mocking the necessary dependencies
class MockContainer {
  public get = jest.fn();
}

class MockLogger {
  public error = jest.fn();
  public warn = jest.fn();
}

describe("ProviderManager.get() get method", () => {
  let providerManager: ProviderManager;
  let mockContainer: MockContainer;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockContainer = new MockContainer();
    mockLogger = new MockLogger();
    providerManager = new ProviderManager() as any;
    (providerManager as any).container = mockContainer as any;
    (providerManager as any).logger = mockLogger as any;
  });

  describe("Happy Path", () => {
    it("should return the provider when it is registered", () => {
      // Arrange
      class MockProvider {}
      const mockProviderInstance = new MockProvider();
      mockContainer.get.mockReturnValue(mockProviderInstance as any);

      // Act
      const result = providerManager.get(MockProvider);

      // Assert
      expect(result).toBe(mockProviderInstance);
      expect(mockContainer.get).toHaveBeenCalledWith(MockProvider);
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error when the provider is not registered", () => {
      // Arrange
      class MockProvider {}
      mockContainer.get.mockReturnValue(undefined as any);

      // Act & Assert
      expect(() => providerManager.get(MockProvider)).toThrowError(
        "Provider MockProvider not registered",
      );
      expect(mockContainer.get).toHaveBeenCalledWith(MockProvider);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "MockProvider not registered",
        "provider-manager",
      );
    });
  });
});

// End of unit tests for: get
