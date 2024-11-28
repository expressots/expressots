// Unit tests for: close

import { AppExpress } from "../application-express";

// Mocking necessary dependencies
class MockLogger {
  error = jest.fn();
  info = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

class MockHTTPServer {
  close = jest.fn((callback: (err?: Error) => void) => callback());
}

jest.mock("express", () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      use: jest.fn(),
      set: jest.fn(),
      listen: jest.fn((port: number, callback: () => void) => {
        callback();
        return new MockHTTPServer();
      }),
    })),
  };
});

describe("AppExpress.close() close method", () => {
  let appExpress: AppExpress;
  let mockLogger: MockLogger;
  let mockConsole: MockConsole;
  let mockHTTPServer: MockHTTPServer;

  beforeEach(() => {
    mockLogger = new MockLogger() as any;
    mockConsole = new MockConsole() as any;
    mockHTTPServer = new MockHTTPServer() as any;

    appExpress = new AppExpress() as any;
    appExpress["logger"] = mockLogger as any;
    appExpress["console"] = mockConsole as any;
    appExpress["serverInstance"] = mockHTTPServer as any;
  });

  describe("Happy paths", () => {
    it("should close the server successfully without logging", async () => {
      // Test to ensure the server closes without logging
      await expect(appExpress.close()).resolves.toBeUndefined();
      expect(mockHTTPServer.close).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should close the server successfully with logging", async () => {
      // Test to ensure the server closes with logging
      await expect(appExpress.close(true)).resolves.toBeUndefined();
      expect(mockHTTPServer.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Server closed successfully", "adapter-express");
    });
  });

  describe("Edge cases", () => {
    it("should handle error during server close without logging", async () => {
      // Test to ensure error handling during server close without logging
      const error = new Error("Close error");
      mockHTTPServer.close = jest.fn((callback: (err?: Error) => void) => callback(error));

      await expect(appExpress.close()).rejects.toThrow("Close error");
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should handle error during server close with logging", async () => {
      // Test to ensure error handling during server close with logging
      const error = new Error("Close error");
      mockHTTPServer.close = jest.fn((callback: (err?: Error) => void) => callback(error));

      await expect(appExpress.close(true)).rejects.toThrow("Close error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing server: Close error",
        "adapter-express",
      );
    });

    it("should resolve immediately if serverInstance is null", async () => {
      // Test to ensure immediate resolution if serverInstance is null
      appExpress["serverInstance"] = null;
      await expect(appExpress.close()).resolves.toBeUndefined();
    });
  });
});

// End of unit tests for: close
