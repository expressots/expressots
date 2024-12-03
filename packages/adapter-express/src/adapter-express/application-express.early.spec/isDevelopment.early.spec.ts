// Unit tests for: isDevelopment

import express from "express";
import { AppExpress } from "../application-express";

jest.mock("../render/engine", () => {
  const actual = jest.requireActual("../render/engine");
  return {
    ...actual,
    setEngineEjs: jest.fn(),
    setEngineHandlebars: jest.fn(),
    setEnginePug: jest.fn(),
  };
});

class MockLogger {
  error = jest.fn();
}

class MockAppContainer {
  Container = {
    get: jest.fn(),
  };
}

describe("AppExpress.isDevelopment() method", () => {
  let appExpress: AppExpress;
  let mockApp: express.Application;
  let mockLogger = new MockLogger();

  beforeEach(() => {
    mockApp = {
      get: jest.fn(),
      set: jest.fn(),
      listen: jest.fn(),
      use: jest.fn(),
    } as any;

    mockLogger = new MockLogger();

    appExpress = new AppExpress() as any;
    appExpress["app"] = mockApp;
    appExpress["appContainer"] = new MockAppContainer() as any;

    (appExpress["appContainer"].Container.get as jest.Mock).mockReturnValue(mockLogger);
  });

  describe("Happy Path", () => {
    it("should return true when environment is set to development", async () => {
      // Arrange
      (mockApp.get as jest.Mock).mockReturnValue("development");

      // Act
      const result = await appExpress.isDevelopment();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when environment is not set to development", async () => {
      // Arrange
      (mockApp.get as jest.Mock).mockReturnValue("production");

      // Act
      const result = await appExpress.isDevelopment();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false and log error when app is not initialized", async () => {
      // Arrange
      appExpress["app"] = undefined as any;

      // Act
      const result = await appExpress.isDevelopment();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "isDevelopment() method must be called on `PostServerInitialization`",
        "application",
      );
    });
  });
});

// End of unit tests for: isDevelopment
