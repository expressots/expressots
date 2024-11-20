// Unit tests for: register

import { BindingScopeEnum } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

// Mock types and interfaces
type MockServiceIdentifier = string;

interface MockContainer {
  isBound: jest.Mock;
  bind: jest.Mock;
}

describe("ProviderManager.register() register method", () => {
  let mockContainer: MockContainer;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      bind: jest.fn().mockReturnValue({
        toSelf: jest.fn().mockReturnValue({
          inSingletonScope: jest.fn(),
          inTransientScope: jest.fn(),
          inRequestScope: jest.fn(),
        }),
      }),
    };

    providerManager = new ProviderManager(mockContainer as any);
  });

  describe("Happy Path", () => {
    it("should register a provider in Singleton scope when not already bound", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      // Act
      providerManager.register(
        serviceIdentifier as any,
        BindingScopeEnum.Singleton as any,
      );

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(
        serviceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(serviceIdentifier as any);
      expect(mockContainer.bind().toSelf().inSingletonScope).toHaveBeenCalled();
    });

    it("should register a provider in Transient scope when not already bound", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      // Act
      providerManager.register(
        serviceIdentifier as any,
        BindingScopeEnum.Transient as any,
      );

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(
        serviceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(serviceIdentifier as any);
      expect(mockContainer.bind().toSelf().inTransientScope).toHaveBeenCalled();
    });

    it("should register a provider in Request scope when not already bound", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      // Act
      providerManager.register(
        serviceIdentifier as any,
        BindingScopeEnum.Request as any,
      );

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(
        serviceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(serviceIdentifier as any);
      expect(mockContainer.bind().toSelf().inRequestScope).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should not register a provider if it is already bound", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(true);

      // Act
      providerManager.register(
        serviceIdentifier as any,
        BindingScopeEnum.Singleton as any,
      );

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(
        serviceIdentifier as any,
      );
      expect(mockContainer.bind).not.toHaveBeenCalled();
    });

    it("should default to Request scope if no scope is provided", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      // Act
      providerManager.register(serviceIdentifier as any);

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(
        serviceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(serviceIdentifier as any);
      expect(mockContainer.bind().toSelf().inRequestScope).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: register
