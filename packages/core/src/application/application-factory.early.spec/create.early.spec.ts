// Unit tests for: create

import { Application } from "express";
import { IWebServer, IWebServerPublic } from "@expressots/shared";
import { AppFactory } from "../application-factory";
import { Logger } from "../../provider/logger/logger.provider";

describe("AppFactory.create() create method", () => {
  type Engine = any; // Import or define actual types if available
  type EngineOptions = any;

  class MockWebServer implements IWebServer {
    getHttpServer(): Promise<Application> {
      return Promise.resolve({} as Application);
    }
    listen(port: number | string, appInfo?: any): Promise<void> {
      return Promise.resolve();
    }
    initEnvironment(): void {}
    setEngine<T extends EngineOptions>(
      engine: Engine,
      options?: T,
    ): Promise<void> {
      return Promise.resolve();
    }
  }

  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Spy on the Logger's error method
    loggerErrorSpy = jest.spyOn(Logger.prototype, "error");
  });

  afterEach(() => {
    // Restore spies after each test
    loggerErrorSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should create a web server instance successfully", async () => {
      // Act
      const result = await AppFactory.create(MockWebServer);

      // Assert
      expect(result).toBeInstanceOf(MockWebServer);
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error if webServerType is not a constructor", async () => {
      // Arrange
      const invalidWebServerType = {};

      // Act & Assert
      await expect(
        AppFactory.create(invalidWebServerType as any),
      ).rejects.toThrow("Invalid web server type.");

      // Verify that the logger's error method was called
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Invalid web server type.",
        "app-factory:create",
      );
    });
  });
});

// End of unit tests for: create
