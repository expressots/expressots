// Unit tests for: postServerInitialization

import { AppExpress } from "../application-express";

jest.mock("express", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    use: jest.fn(),
    set: jest.fn(),
    listen: jest.fn((port, callback) => callback && callback()),
  })),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock("process", () => ({
  exit: jest.fn(),
  on: jest.fn(),
}));

jest.mock("../render/engine", () => ({
  setEngineEjs: jest.fn(),
  setEngineHandlebars: jest.fn(),
  setEnginePug: jest.fn(),
}));

const mockLogger = {
  pid: 0,
  name: "mock-logger",
  version: "1.0.0",
  author: "test",
  repo: "mock-repo",
  formatMessage: jest.fn(),
  msg: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockConsole = {
  messageServer: jest.fn(),
  printColor: jest.fn(),
};

const mockAppContainer = {
  container: {},
  options: {},
  logger: mockLogger,
  viewContainerBindings: jest.fn(),
  getContainerOptions: jest.fn(),
  create: jest.fn(),
};

const mockMiddlewareManager = {
  getMiddlewarePipeline: jest.fn().mockReturnValue([]),
  getErrorHandler: jest.fn(),
  addUrlEncodedParser: jest.fn(),
  addRateLimiter: jest.fn(),
  addBodyParser: jest.fn(),
  addCors: jest.fn(),
  addCompression: jest.fn(),
  addCookieParser: jest.fn(),
  addCookieSession: jest.fn(),
  addMorgan: jest.fn(),
};

const mockProviderManager = {
  container: {},
  logger: mockLogger,
  register: jest.fn(),
  get: jest.fn(),
};

const mockRenderOptions = {
  engine: "EJS",
  options: {},
};

describe("AppExpress.postServerInitialization() postServerInitialization method", () => {
  let appExpress: any;

  beforeEach(() => {
    appExpress = new AppExpress() as any;
    appExpress["logger"] = mockLogger;
    appExpress["console"] = mockConsole;
    appExpress["appContainer"] = mockAppContainer;
    appExpress["middlewareManager"] = mockMiddlewareManager;
    appExpress["providerManager"] = mockProviderManager;
    appExpress["renderOptions"] = mockRenderOptions;
  });

  describe("Happy Path", () => {
    it("should execute postServerInitialization without errors", async () => {
      // Arrange
      const postServerInitializationSpy = jest.spyOn(
        appExpress as any,
        "postServerInitialization",
      );

      // Act
      await appExpress["postServerInitialization"]();

      // Assert
      expect(postServerInitializationSpy).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing appContainer gracefully", async () => {
      // Arrange
      appExpress["appContainer"] = undefined;
      const postServerInitializationSpy = jest.spyOn(
        appExpress as any,
        "postServerInitialization",
      );

      // Act
      await appExpress["postServerInitialization"]();

      // Assert
      expect(postServerInitializationSpy).toHaveBeenCalled();
    });

    it("should handle missing middlewareManager gracefully", async () => {
      // Arrange
      appExpress["middlewareManager"] = undefined;
      const postServerInitializationSpy = jest.spyOn(
        appExpress as any,
        "postServerInitialization",
      );

      // Act
      await appExpress["postServerInitialization"]();

      // Assert
      expect(postServerInitializationSpy).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: postServerInitialization
