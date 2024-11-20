// Unit tests for: configureServices

import { AppExpress } from "../application-express";

jest.mock("../render/engine", () => ({
  setEngineHandlebars: jest.fn(),
  setEngineEjs: jest.fn(),
  setEnginePug: jest.fn(),
}));

jest.mock("express", () => ({
  default: jest.fn(() => ({
    use: jest.fn(),
    set: jest.fn(),
    listen: jest.fn(),
  })),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock("process", () => ({
  exit: jest.fn(),
  on: jest.fn(),
}));

class MockLogger {
  error = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
  printColor = jest.fn();
}

class MockAppContainer {
  container = jest.fn();
  options = {};
  create = jest.fn();
  logger = new MockLogger();
}

class MockMiddlewareManager {
  getMiddlewarePipeline = jest.fn().mockReturnValue([]);
  getErrorHandler = jest.fn();
}

class MockProviderManager {
  container = {};
  logger = new MockLogger();
  register = jest.fn();
  get = jest.fn();
}

describe("AppExpress.configureServices() configureServices method", () => {
  let appExpress: AppExpress;
  let mockLogger: MockLogger;
  let mockConsole: MockConsole;
  let mockAppContainer: MockAppContainer;
  let mockMiddlewareManager: MockMiddlewareManager;
  let mockProviderManager: MockProviderManager;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockConsole = new MockConsole();
    mockAppContainer = new MockAppContainer();
    mockMiddlewareManager = new MockMiddlewareManager();
    mockProviderManager = new MockProviderManager();

    appExpress = new AppExpress() as any;
    appExpress["logger"] = mockLogger as any;
    appExpress["console"] = mockConsole as any;
    appExpress["appContainer"] = mockAppContainer as any;
    appExpress["middlewareManager"] = mockMiddlewareManager as any;
    appExpress["providerManager"] = mockProviderManager as any;
  });

  describe("Happy Path", () => {
    it("should configure services without errors", () => {
      expect(() => appExpress["configureServices"]()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing appContainer gracefully", () => {
      appExpress["appContainer"] = undefined;
      expect(() => appExpress["configureServices"]()).not.toThrow();
    });

    it("should handle missing middlewareManager gracefully", () => {
      appExpress["middlewareManager"] = undefined;
      expect(() => appExpress["configureServices"]()).not.toThrow();
    });
  });
});

// End of unit tests for: configureServices
