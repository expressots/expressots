// Unit tests for: logger

import {
  middlewareResolver,
  isMiddlewareAvailable,
  isPackageAvailable,
} from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    isMiddlewareAvailable: jest.fn(),
    isPackageAvailable: jest.fn(),
    resolvePackage: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.logger() logger method", () => {
  let middleware: Middleware;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
    (isMiddlewareAvailable as jest.Mock).mockReturnValue(true);
    (isPackageAvailable as jest.Mock).mockReturnValue(false);
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("Happy Path", () => {
    it("should add morgan logger with default 'combined' format", () => {
      middleware.logger({ implementation: "morgan" });

      expect(middlewareResolver).toHaveBeenCalledWith("morgan", "combined");
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add morgan logger with custom format", () => {
      middleware.logger({
        implementation: "morgan",
        options: { format: "dev" },
      });

      expect(middlewareResolver).toHaveBeenCalledWith("morgan", "dev");
    });

    it("should add console logger when implementation is 'console'", () => {
      middleware.logger({ implementation: "console" });

      expect(middleware.getMiddlewarePipeline().length).toBe(1);
      // Console logger doesn't use middlewareResolver
    });

    it("should auto-detect best logger (fallback to morgan)", () => {
      (isMiddlewareAvailable as jest.Mock).mockReturnValue(true);

      middleware.logger({ implementation: "auto" });

      expect(middlewareResolver).toHaveBeenCalledWith("morgan", "combined");
    });
  });

  describe("Custom Logger", () => {
    it("should use custom logger when provided", () => {
      const customLogger = jest.fn();

      middleware.logger({ custom: customLogger });

      expect(middleware.getMiddlewarePipeline().length).toBe(1);
      expect(middlewareResolver).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should skip logger in test environment when disableInTest is not explicitly false", () => {
      process.env.NODE_ENV = "test";

      middleware.logger();

      expect(middleware.getMiddlewarePipeline().length).toBe(0);
    });

    it("should add logger in test environment when disableInTest is false", () => {
      process.env.NODE_ENV = "test";

      middleware.logger({ disableInTest: false, implementation: "morgan" });

      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should not add duplicate logger when called multiple times", () => {
      middleware.logger({ implementation: "morgan" });
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.logger({ implementation: "morgan" });

      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should add logger with skip function", () => {
      const skipFn = jest.fn().mockReturnValue(false);

      middleware.logger({ implementation: "morgan", skip: skipFn });

      expect(middlewareResolver).toHaveBeenCalledWith("morgan", "combined", {
        skip: skipFn,
      });
    });
  });
});

// End of unit tests for: logger
