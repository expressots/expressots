// Updated Unit tests for: listen

import express from "express";
import { AppExpress } from "../application-express";

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
  warn = jest.fn();
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
  getErrorHandler = jest.fn().mockReturnValue(null);
  setExpressApp = jest.fn();
  getContentNegotiationService = jest.fn().mockReturnValue(null);
  getValidationConfig = jest.fn().mockReturnValue(null);
  getStartupLogs = jest.fn().mockReturnValue([]);
  clearStartupLogs = jest.fn();
  getPipelineInfo = jest.fn().mockReturnValue([]);
  getFormattedView = jest.fn().mockReturnValue("");
  render = jest.fn();
}

describe("AppExpress.listen() method", () => {
  let appExpress: AppExpress;
  let mockLogger: MockLogger;
  let mockConsole: MockConsole;
  let mockAppContainer: MockAppContainer;
  let mockProviderManager: MockProviderManager;
  let mockMiddlewareManager: MockMiddleware;
  let mockApp: express.Application;
  let processExitSpy: jest.SpyInstance;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockConsole = new MockConsole();
    mockAppContainer = new MockAppContainer();
    mockProviderManager = new MockProviderManager();
    mockMiddlewareManager = new MockMiddleware();

    processExitSpy = jest.spyOn(process, "exit").mockImplementation((() => {}) as any);
    processOnSpy = jest.spyOn(process, "on");

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
      listen: jest.fn().mockImplementation((port: number, callback: () => void) => {
        const server = {
          on: jest.fn(),
          close: jest.fn(),
          address: jest.fn().mockReturnValue({ port }),
        };
        process.nextTick(callback);
        return server;
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

  afterEach(() => {
    processExitSpy.mockRestore();
    processOnSpy.mockRestore();
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
        expect(processOnSpy).toHaveBeenCalledWith(signal, expect.any(Function));
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
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should reject when the HTTP server emits EADDRINUSE", async () => {
      mockApp.listen = jest.fn().mockImplementation(() => {
        const server = {
          on: jest.fn((event: string, handler: (error: NodeJS.ErrnoException) => void) => {
            if (event === "error") {
              process.nextTick(() =>
                handler(Object.assign(new Error("in use"), { code: "EADDRINUSE" })),
              );
            }
          }),
          close: jest.fn(),
          address: jest.fn(),
        };
        return server;
      }) as unknown as typeof mockApp.listen;

      await expect(appExpress.listen(3000)).rejects.toThrow(/Port 3000 is already in use/);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Port 3000 is already in use",
        "adapter-express",
      );
    });

    it("should close an existing server instance before re-listening", async () => {
      const close = jest.fn((cb: () => void) => cb());
      (appExpress as any).serverInstance = { close, on: jest.fn() };

      await appExpress.listen(3000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Closing existing server instance before starting new one",
        "adapter-express",
      );
      expect(close).toHaveBeenCalled();
    });

    it("should initiate graceful shutdown when a signal handler fires", async () => {
      (appExpress as unknown as { handleExit: jest.Mock }).handleExit = jest
        .fn()
        .mockResolvedValue(undefined);
      jest.spyOn(process.stdout, "write").mockImplementation(() => true);

      await appExpress.listen(3000);

      const sigintHandler = processOnSpy.mock.calls.find(([signal]) => signal === "SIGINT")?.[1];
      sigintHandler?.();
      await Promise.resolve();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Signal SIGINT received"),
        "adapter-express",
      );
      expect((appExpress as unknown as { handleExit: jest.Mock }).handleExit).toHaveBeenCalledWith(
        "SIGINT",
      );
    });

    it("should execute lifecycle bootstrap hooks after the server starts", async () => {
      const executeBootstrap = jest.fn().mockResolvedValue(undefined);
      (
        appExpress as unknown as {
          lifecycleRegistry: { executeBootstrap: typeof executeBootstrap };
        }
      ).lifecycleRegistry = { executeBootstrap };

      await appExpress.listen(3000);

      expect(executeBootstrap).toHaveBeenCalled();
    });
  });
});

// End of updated unit tests for: listen
