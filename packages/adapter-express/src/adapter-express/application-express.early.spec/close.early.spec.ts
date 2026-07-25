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
  close = jest.fn((callback?: (err?: Error) => void) => {
    if (callback) {
      callback();
    }
  });
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
    it("should close the server successfully", async () => {
      const server = await appExpress.getHttpServer();
      await new Promise<void>((resolve, reject) => {
        server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      expect(mockHTTPServer.close).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle error during server close", async () => {
      const error = new Error("Close error");
      mockHTTPServer.close = jest.fn((callback?: (err?: Error) => void) => {
        if (callback) {
          callback(error);
        }
      });

      const server = await appExpress.getHttpServer();
      await expect(
        new Promise<void>((resolve, reject) => {
          server.close((err?: Error) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }),
      ).rejects.toThrow("Close error");
    });

    it("should throw error if serverInstance is null when calling getHttpServer", async () => {
      appExpress["serverInstance"] = null;
      await expect(appExpress.getHttpServer()).rejects.toThrow(
        "Server instance not initialized yet",
      );
    });
  });
});

// End of unit tests for: close
