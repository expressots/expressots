// Unit tests for: errorHandler (setErrorHandler method)

import { NextFunction, Request, Response } from "express";
import { Middleware } from "../middleware-service";

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

type CustomErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => any;

describe("Middleware.setErrorHandler() setErrorHandler method", () => {
  let middleware: Middleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("Happy Path", () => {
    it("should set a custom error handler when provided", () => {
      const customErrorHandler: CustomErrorHandler = jest.fn();

      middleware.setErrorHandler({ errorHandler: customErrorHandler });
      const errorHandler = middleware.getErrorHandler() as CustomErrorHandler;

      expect(errorHandler).toBe(customErrorHandler);
    });

    it("should use the default error handler when no custom handler is provided", () => {
      middleware.setErrorHandler();
      const errorHandler = middleware.getErrorHandler();

      expect(errorHandler).toBeDefined();
    });

    it("should configure showStackTrace option", () => {
      middleware.setErrorHandler({ showStackTrace: true });
      const errorHandler = middleware.getErrorHandler();

      expect(errorHandler).toBeDefined();
    });
  });

  describe("Exception Filters", () => {
    it("should warn when custom errorHandler and enableExceptionFilters are both set", () => {
      const loggerSpy = jest.spyOn((middleware as any)._logger, "warn");
      const customHandler = jest.fn();

      middleware.setErrorHandler({
        errorHandler: customHandler,
        enableExceptionFilters: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Custom errorHandler provided"),
        expect.any(String),
      );
    });

    it("should warn when enableExceptionFilters is true but container is not provided", () => {
      const loggerSpy = jest.spyOn((middleware as any)._logger, "warn");

      middleware.setErrorHandler({
        enableExceptionFilters: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("container is not provided"),
        expect.any(String),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options", () => {
      middleware.setErrorHandler(undefined);
      const errorHandler = middleware.getErrorHandler();

      expect(errorHandler).toBeDefined();
    });

    it("should handle empty options object", () => {
      middleware.setErrorHandler({});
      const errorHandler = middleware.getErrorHandler();

      expect(errorHandler).toBeDefined();
    });
  });
});

// End of unit tests for: errorHandler
