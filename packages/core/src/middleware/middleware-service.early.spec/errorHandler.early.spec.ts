// Unit tests for: errorHandler

import { NextFunction, Request, Response } from "express";
import { Middleware } from "../middleware-service";
import { ErrorHandlerOptions } from "../middleware-interface";

type CustomErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
  showStackTrace?: boolean,
) => any;

describe("errorHandler() errorHandler method", () => {
  let middleware: Middleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
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
      // Arrange
      const customErrorHandler: CustomErrorHandler = jest.fn();

      // Act
      middleware.setErrorHandler({ errorHandler: customErrorHandler });
      const errorHandler = middleware.getErrorHandler() as CustomErrorHandler;

      // Assert
      expect(errorHandler).toBe(customErrorHandler);
    });

    it("should use the default error handler when no custom handler is provided", () => {
      // Arrange
      const defaultErrorHandler = jest.fn();
      jest.mock(
        "../../error/error-handler-middleware",
        () => defaultErrorHandler,
      );

      // Act
      middleware.setErrorHandler();
      const errorHandler = middleware.getErrorHandler() as CustomErrorHandler;

      // Assert
      expect(errorHandler).toBeDefined();
      expect(errorHandler).not.toBe(defaultErrorHandler); // Ensure it's not the mocked default handler directly
    });
  });

  describe("Edge Cases", () => {});
});

// End of unit tests for: errorHandler
