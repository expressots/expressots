// Unit tests for: get

import { ProviderManager } from "../provider-manager";

// Mock implementations
type MockServiceIdentifier = string;

interface MockContainer {
  isBound: jest.Mock<boolean, [MockServiceIdentifier]>;
  get: jest.Mock<any, [MockServiceIdentifier]>;
}

describe("ProviderManager.get() get method", () => {
  let mockContainer: MockContainer;
  let providerManager: ProviderManager;

  beforeEach(() => {
    // Initialize the mock container
    mockContainer = {
      isBound: jest.fn(),
      get: jest.fn(),
    };

    // Create an instance of ProviderManager with the mock container
    providerManager = new ProviderManager(mockContainer as any);
  });

  describe("Happy paths", () => {
    it("should return the provider when it is registered", () => {
      // Arrange: Set up the mock to simulate a registered provider
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      const mockProviderInstance = { name: "TestProvider" };
      mockContainer.isBound.mockReturnValue(true);
      mockContainer.get.mockReturnValue(mockProviderInstance as any);

      // Act: Call the get method
      const result = providerManager.get(mockServiceIdentifier as any);

      // Assert: Verify the correct provider is returned
      expect(result).toBe(mockProviderInstance);
      expect(mockContainer.isBound).toHaveBeenCalledWith(mockServiceIdentifier);
      expect(mockContainer.get).toHaveBeenCalledWith(mockServiceIdentifier);
    });
  });

  describe("Edge cases", () => {
    it("should throw an error when the provider is not registered", () => {
      // Arrange: Set up the mock to simulate an unregistered provider
      const mockServiceIdentifier: MockServiceIdentifier =
        "UnregisteredService";
      mockContainer.isBound.mockReturnValue(false);

      // Act & Assert: Call the get method and expect an error
      expect(() =>
        providerManager.get(mockServiceIdentifier as any),
      ).toThrowError(`Provider ${mockServiceIdentifier} not registered`);
      expect(mockContainer.isBound).toHaveBeenCalledWith(mockServiceIdentifier);
    });

    it("should handle service identifiers that are functions", () => {
      // Arrange: Set up the mock to simulate a registered provider with a function identifier
      const mockServiceIdentifier = function TestService() {};
      const mockProviderInstance = { name: "TestProvider" };
      mockContainer.isBound.mockReturnValue(true);
      mockContainer.get.mockReturnValue(mockProviderInstance as any);

      // Act: Call the get method
      const result = providerManager.get(mockServiceIdentifier as any);

      // Assert: Verify the correct provider is returned
      expect(result).toBe(mockProviderInstance);
      expect(mockContainer.isBound).toHaveBeenCalledWith(mockServiceIdentifier);
      expect(mockContainer.get).toHaveBeenCalledWith(mockServiceIdentifier);
    });

    it("should handle service identifiers that are symbols", () => {
      // Arrange: Set up the mock to simulate a registered provider with a symbol identifier
      const mockServiceIdentifier = Symbol("TestService");
      const mockProviderInstance = { name: "TestProvider" };
      mockContainer.isBound.mockReturnValue(true);
      mockContainer.get.mockReturnValue(mockProviderInstance as any);

      // Act: Call the get method
      const result = providerManager.get(mockServiceIdentifier as any);

      // Assert: Verify the correct provider is returned
      expect(result).toBe(mockProviderInstance);
      expect(mockContainer.isBound).toHaveBeenCalledWith(mockServiceIdentifier);
      expect(mockContainer.get).toHaveBeenCalledWith(mockServiceIdentifier);
    });
  });
});

// End of unit tests for: get
