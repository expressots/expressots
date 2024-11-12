// Unit tests for: register

import "reflect-metadata";

import { AppFactory } from "../../application";
import { BindingScopeEnum } from "../../di/inversify";
import { Logger } from "../logger/logger.provider";
import { ProviderManager } from "../provider-manager";
import { mock } from "node:test";

// Mocking necessary dependencies
type MockServiceIdentifier = string;

interface MockContainer {
  isBound: jest.Mock;
  bind: jest.Mock;
}

class MockLogger {
  warn = jest.fn();
  error = jest.fn();
}

describe("ProviderManager.register() register method", () => {
  let providerManager: ProviderManager;
  let mockContainer: MockContainer;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      bind: jest.fn().mockReturnThis(),
    };

    mockLogger = new MockLogger();

    (AppFactory as any).container = mockContainer;

    // Mocking Logger to use our mock logger
    jest.spyOn(Logger.prototype, "warn").mockImplementation(mockLogger.warn);
    jest.spyOn(Logger.prototype, "error").mockImplementation(mockLogger.error);

    providerManager = new ProviderManager();
  });

  describe("Happy Path", () => {
    it("should register a service with request scope when not already bound", () => {
      // Arrange
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      mockContainer.bind.mockReturnValue({
        toSelf: jest.fn().mockReturnThis(),
        inRequestScope: jest.fn(),
      });

      // Act
      providerManager.register(
        mockServiceIdentifier as any,
        BindingScopeEnum.Request as any,
      );

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().toSelf().inRequestScope).toHaveBeenCalled();
    });

    it("should register a service with singleton scope when not already bound", () => {
      // Arrange
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      mockContainer.bind.mockReturnValue({
        toSelf: jest.fn().mockReturnThis(),
        inSingletonScope: jest.fn(),
      });

      // Act
      providerManager.register(
        mockServiceIdentifier as any,
        BindingScopeEnum.Singleton as any,
      );

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().toSelf().inSingletonScope).toHaveBeenCalled();
    });

    it("should register a service with transient scope when not already bound", () => {
      // Arrange
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(false);

      mockContainer.bind.mockReturnValue({
        toSelf: jest.fn().mockReturnThis(),
        inTransientScope: jest.fn(),
      });

      // Act
      providerManager.register(
        mockServiceIdentifier as any,
        BindingScopeEnum.Transient as any,
      );

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().toSelf().inTransientScope).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should not register a service if it is already bound", () => {
      // Arrange
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      mockContainer.isBound.mockReturnValue(true);

      // Act
      providerManager.register(
        mockServiceIdentifier as any,
        BindingScopeEnum.Request as any,
      );

      // Assert
      expect(mockContainer.bind).not.toHaveBeenCalled();
    });

    it("should log a warning if the service is already registered", () => {
      // Arrange
      const mockServiceIdentifier = { name: "TestService" };
      mockContainer.isBound.mockReturnValue(true);

      mockContainer.bind.mockReturnValue({
        toSelf: jest.fn().mockReturnThis(),
        inRequestScope: jest.fn(),
      });

      // Act
      providerManager.register(
        mockServiceIdentifier as any,
        BindingScopeEnum.Request as any,
      );

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `TestService already registered`,
        "provider-manager",
      );
    });
  });
});

// End of unit tests for: register
