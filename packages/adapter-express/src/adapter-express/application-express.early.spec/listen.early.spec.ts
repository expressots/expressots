// Updated Unit tests for: listen

import express from "express";
import process from "process";
import { AppExpress } from "../application-express";

jest.mock("process", () => ({
  ...jest.requireActual("process"),
  exit: jest.fn(),
  on: jest.fn(),
}));

jest.mock("../express-utils/inversify-express-server", () => {
  return {
    InversifyExpressServer: jest.fn().mockImplementation(() => ({
      setConfig: jest.fn(),
      setErrorConfig: jest.fn(),
      build: jest.fn().mockReturnValue({
        set: jest.fn(),
        listen: jest.fn().mockImplementation((port, callback) => {
          const server = {
            on: jest.fn(),
            close: jest.fn(),
          };
          callback();
          return server;
        }),
      }),
    })),
  };
});

class MockLogger {
  error = jest.fn();
  info = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

class MockAppContainer {
  Container = {};
  create = jest.fn();
}

class MockProviderManager {}

class MockMiddleware {
  getMiddlewarePipeline = jest.fn().mockReturnValue([]);
  getErrorHandler = jest.fn();
}

describe("AppExpress.listen() method", () => {
  let appExpress: AppExpress;
  let mockLogger: MockLogger;
  let mockConsole: MockConsole;
  let mockAppContainer: MockAppContainer;
  let mockProviderManager: MockProviderManager;
  let mockMiddlewareManager: MockMiddleware;
  let mockApp: express.Application;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockConsole = new MockConsole();
    mockAppContainer = new MockAppContainer();
    mockProviderManager = new MockProviderManager();
    mockMiddlewareManager = new MockMiddleware();

    appExpress = new AppExpress();

    // Replace the logger and console with mocks
    (appExpress as any).logger = mockLogger;
    (appExpress as any).console = mockConsole;
    (appExpress as any).appContainer = mockAppContainer;
    (appExpress as any).providerManager = mockProviderManager;
    (appExpress as any).middlewareManager = mockMiddlewareManager;

    // Mock the express application
    mockApp = {
      set: jest.fn(),
      listen: jest.fn().mockImplementation((port, callback) => {
        callback();
        return { on: jest.fn(), close: jest.fn() };
      }),
    } as unknown as express.Application;

    // Mock the InversifyExpressServer
    const { InversifyExpressServer } = require("../express-utils/inversify-express-server");
    InversifyExpressServer.mockImplementation(() => ({
      setConfig: jest.fn(),
      setErrorConfig: jest.fn(),
      build: jest.fn().mockReturnValue(mockApp),
    }));
  });

  describe("Happy paths", () => {
    it("should start the server on the given port", async () => {
      const port = 3000;
      await appExpress.listen(port);

      expect(mockApp.set).toHaveBeenCalledWith("env", "development");
      expect(mockApp.listen).toHaveBeenCalledWith(port, expect.any(Function));
    });

    it("should set the environment to development by default", async () => {
      await appExpress.listen(3000);

      expect(mockApp.set).toHaveBeenCalledWith("env", "development");
    });
  });

  describe("Edge cases", () => {
    it("should handle string port by converting it to a number", async () => {
      const port = "3000";
      await appExpress.listen(port);

      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it("should handle process signals for graceful shutdown", async () => {
      await appExpress.listen(3000);

      const signals = ["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"];
      signals.forEach((signal) => {
        expect(process.on).toHaveBeenCalledWith(signal, expect.any(Function));
      });
    });

    it("should exit the process if no container is provided", async () => {
      (appExpress as any).appContainer = null;

      await expect(appExpress.listen(3000)).rejects.toThrow(
        "Cannot read properties of null (reading 'Container')",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "No container provided for application configuration",
        "adapter-express",
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});

// End of updated unit tests for: listen
