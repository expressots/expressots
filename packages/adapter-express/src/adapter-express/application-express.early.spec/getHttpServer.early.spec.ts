// Unit tests for: getHttpServer

import express from "express";
import { AppExpress } from "../application-express";

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

class MockLogger {
  error = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

class MockAppContainer {
  Container = {};
}

class MockProviderManager {}

describe("AppExpress.getHttpServer() getHttpServer method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as any;
    appExpress["logger"] = new MockLogger() as any;
    appExpress["console"] = new MockConsole() as any;
    appExpress["appContainer"] = new MockAppContainer() as any;
    appExpress["middlewareManager"] = { getErrorHandler: jest.fn() } as any;
    appExpress["providerManager"] = new MockProviderManager() as any;
    appExpress["app"] = express() as any;
  });

  describe("Happy Paths", () => {
    it("should return the express application instance when app is initialized", async () => {
      // Test to ensure the method returns the express app instance when initialized
      const appInstance = await appExpress.getHttpServer();
      expect(appInstance).toBe(appExpress["app"]);
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error if the app is not initialized", async () => {
      // Test to ensure an error is thrown when the app is not initialized
      appExpress["app"] = null as any;
      await expect(appExpress.getHttpServer()).rejects.toThrow(
        "Incorrect usage of `getHttpServer` method",
      );
    });
  });
});

// End of unit tests for: getHttpServer
