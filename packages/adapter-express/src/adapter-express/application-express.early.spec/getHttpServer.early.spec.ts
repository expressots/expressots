// Unit tests for: getHttpServer

import express from "express";
import { AppExpress } from "../application-express";
import { Logger } from "@expressots/core";

// Mocking necessary functions and classes
jest.mock("../render/engine", () => {
  const actual = jest.requireActual("../render/engine");
  return {
    ...actual,
    setEngineEjs: jest.fn(),
    setEngineHandlebars: jest.fn(),
    setEnginePug: jest.fn(),
  };
});

class MockHTTPServer {
  close = jest.fn();
}

class MockLogger extends Logger {
  error = jest.fn();
  warn = jest.fn();
  info = jest.fn();
  debug = jest.fn();
}

describe("AppExpress.getHttpServer() getHttpServer method", () => {
  let appExpress: AppExpress;
  let mockLogger: MockLogger;
  let mockHTTPServer: MockHTTPServer;

  beforeEach(() => {
    appExpress = new AppExpress();
    mockLogger = new MockLogger();
    mockHTTPServer = new MockHTTPServer();

    (appExpress as any)["logger"] = mockLogger;
    (appExpress as any)["serverInstance"] = mockHTTPServer;
  });

  describe("Happy Paths", () => {
    it("should return the Http server instance when app is initialized", async () => {
      // Test to ensure the method returns the express app instance when initialized
      const appInstance = await appExpress.getHttpServer();
      expect(appInstance).toBe(mockHTTPServer);
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error if the server instance is not initialized", async () => {
      (appExpress as any)["serverInstance"] = null;
      await expect(appExpress.getHttpServer()).rejects.toThrow(
        "Server instance not initialized yet",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Server instance not initialized yet",
        "adapter-express",
      );
    });
  });
});

// End of unit tests for: getHttpServer
