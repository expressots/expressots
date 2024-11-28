// Unit tests for: createMicroAPI

import { IMiddleware, interfaces } from "@expressots/core";
import { config, Env } from "@expressots/shared";
import fs from "fs";
import { createMicroAPI } from "../application-express-micro";
import { IIOC } from "../application-express-micro-container";
import { IRoute } from "../application-express-micro-route";

// Mocking express and fs
jest.mock("express", () => {
  return jest.fn(() => ({
    use: jest.fn(),
    listen: jest.fn((port, callback) => callback()),
  }));
});

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

// Mocking dependencies
type MockMicroAPIConfig = {
  containerOptions: interfaces.ContainerOptions;
};

class MockMiddleware implements IMiddleware {
  addUrlEncodedParser = jest.fn();
  addRateLimiter = jest.fn();
  addBodyParser = jest.fn();
  addCors = jest.fn();
  addCompression = jest.fn();
  addCookieParser = jest.fn();
  addCookieSession = jest.fn();
  addMorgan = jest.fn();
  addServeFavicon = jest.fn();
  addSession = jest.fn();
  setErrorHandler = jest.fn();
  serveStatic = jest.fn();
  addMiddleware = jest.fn();
  viewMiddlewarePipeline = jest.fn();
  getErrorHandler = jest.fn().mockReturnValue((req, res, next) => next()); // Mock ExpressHandler
  addHelmet = jest.fn();
  setupMulter = jest.fn();
}

class MockRoute implements IRoute {
  define = jest.fn();
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
  patch = jest.fn();
  setGlobalRoutePrefix = jest.fn();
  applyRoutes = jest.fn();
}

class MockIOC implements IIOC {
  addSingleton = jest.fn();
  addTransient = jest.fn();
  addScoped = jest.fn();
  get = jest.fn();
}

describe("createMicroAPI() createMicroAPI method", () => {
  let mockConfig: MockMicroAPIConfig;
  let mockMiddleware: MockMiddleware;
  let mockRoute: MockRoute;
  let mockIOC: MockIOC;

  beforeEach(() => {
    mockConfig = { containerOptions: {} } as any;
    mockMiddleware = new MockMiddleware() as any;
    mockRoute = new MockRoute() as any;
    mockIOC = new MockIOC() as any;
  });

  describe("Happy Paths", () => {
    it("should create a new instance of the Express Micro API adapter", () => {
      // Arrange
      const appExpressMicro = createMicroAPI(mockConfig as any);

      // Act
      const result = appExpressMicro.build();

      // Assert
      expect(result).toBeDefined();
      expect(result.listen).toBeDefined();
      expect(result.Middleware).toHaveProperty("logger");
      expect(result.Middleware).toHaveProperty("middlewarePipeline");
    });

    it("should set global route prefix correctly", () => {
      // Arrange
      const appExpressMicro = createMicroAPI(mockConfig as any);
      const prefix = "/api";

      // Act
      appExpressMicro.setGlobalRoutePrefix(prefix);

      // Assert
      expect((appExpressMicro as any).globalPrefix).toBe(prefix);
    });

    it("should initialize environment with default .env file", () => {
      // Arrange
      const appExpressMicro = createMicroAPI(mockConfig as any);
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      // Act
      appExpressMicro.initEnvironment("development" as Env.Environment);

      // Assert
      expect(config).toBeDefined();
    });
  });
});

// End of unit tests for: createMicroAPI
