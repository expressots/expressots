// Unit tests for: ExceptionHandlerMiddleware.handle

import { ExceptionHandlerMiddleware } from "../exception-handler-middleware";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";
import { AppError, StatusCode } from "../index";
import { Request, Response, NextFunction } from "express";
import type { IExceptionFilter, ExceptionContext } from "../exception-filter.interface";
import { BaseExceptionFilter } from "../base-exception-filter";
import { EXCEPTION_FILTER_METADATA_KEY } from "../exception-filter-constants";

describe("ExceptionHandlerMiddleware.handle() handle method", () => {
  let middleware: ExceptionHandlerMiddleware;
  let container: Container;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockLogger: Logger;

  beforeEach(() => {
    container = new Container();
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        suggestions: { enabled: false },
      }),
    } as unknown as Logger;
    container.bind(Logger).toConstantValue(mockLogger);

    mockRequest = {
      method: "GET",
      path: "/test",
      route: {
        path: "/test",
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockNext = jest.fn();
  });

  describe("Happy Path", () => {
    it("should handle error and store on request for flow tracking", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect((mockRequest as any).__expressotsFlowError).toBe(error);
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCode.InternalServerError);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it("should not overwrite existing flow error", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const existingError = new Error("Existing error");
      const newError = new Error("New error");
      (mockRequest as any).__expressotsFlowError = existingError;

      // Act
      await middleware.handle(
        newError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect((mockRequest as any).__expressotsFlowError).toBe(existingError);
    });

    it("should build exception context with request metadata", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      class TestController {}
      (mockRequest as any).__expressotsController = TestController;
      (mockRequest as any).__expressotsMethod = "testMethod";

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should extract controller from route stack if not on request", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      class TestController {}
      const handler = {
        __expressotsController: TestController,
        __expressotsMethod: "testMethod",
      };
      (mockRequest as any).route = {
        path: "/test",
        stack: [{ handle: handler }],
      };

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should use path-based fallback when controller not found", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should handle AppError with correct status code", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = AppError.badRequest("Bad request");
      // Mock logger.getConfig to avoid errors in getErrorHints
      (mockLogger as any).getConfig = jest.fn().mockReturnValue({
        suggestions: { enabled: false },
      });

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCode.BadRequest);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: StatusCode.BadRequest,
          error: "Bad request",
        }),
      );
    });

    it("should include stack trace when showStackTrace is enabled", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container, undefined, true);
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";
      // Mock logger.getConfig to avoid errors in getErrorHints
      (mockLogger as any).getConfig = jest.fn().mockReturnValue({
        suggestions: { enabled: false },
      });

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: error.stack,
        }),
      );
    });

    it("should not include stack trace when showStackTrace is disabled", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container, undefined, false);
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";
      // Mock logger.getConfig to avoid errors in getErrorHints
      (mockLogger as any).getConfig = jest.fn().mockReturnValue({
        suggestions: { enabled: false },
      });

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        }),
      );
    });
  });

  describe("Filter Execution", () => {
    it("should execute route filters when available", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      class TestController {}
      class TestFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          context.response.status(400).json({ handled: true });
        }
      }
      (mockRequest as any).__expressotsController = TestController;
      (mockRequest as any).__expressotsMethod = "testMethod";

      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        [TestFilter],
        TestController,
        "testMethod",
      );

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ handled: true });
    });

    it("should execute exception type filters from registry", async () => {
      // Arrange
      const registry = new ExceptionFilterRegistry(container, mockLogger);
      middleware = new ExceptionHandlerMiddleware(container, registry);
      const error = new AppError("Test error", StatusCode.BadRequest);

      class AppErrorFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          context.response.status(400).json({ filtered: true });
        }
      }

      // Register filter
      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        [
          {
            exceptionTypes: [AppError],
            filter: AppErrorFilter,
          },
        ],
        Reflect,
      );

      registry.initialize();

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should stop executing filters when response is sent", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      let filterCallCount = 0;
      const testResponse = {
        ...mockResponse,
        headersSent: false,
        status: jest.fn().mockImplementation(() => {
          testResponse.headersSent = true;
          return testResponse;
        }),
        json: jest.fn().mockReturnThis(),
      } as any;

      class FirstFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          filterCallCount++;
          context.response.status(200).json({ handled: true });
        }
      }

      class SecondFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          filterCallCount++;
        }
      }

      class TestController {}
      (mockRequest as any).__expressotsController = TestController;
      (mockRequest as any).__expressotsMethod = "testMethod";

      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        [FirstFilter, SecondFilter],
        TestController,
        "testMethod",
      );

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        testResponse as Response,
        mockNext,
      );

      // Assert
      expect(filterCallCount).toBe(1);
      expect(testResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle async filters", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");

      class AsyncFilter extends BaseExceptionFilter {
        async catch(exception: Error, context: ExceptionContext): Promise<void> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          context.response.status(200).json({ async: true });
        }
      }

      class TestController {}
      (mockRequest as any).__expressotsController = TestController;
      (mockRequest as any).__expressotsMethod = "testMethod";

      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        [AsyncFilter],
        TestController,
        "testMethod",
      );

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should continue to next filter when filter throws error", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      let secondFilterCalled = false;

      class FailingFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          throw new Error("Filter error");
        }
      }

      class SecondFilter extends BaseExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          secondFilterCalled = true;
          context.response.status(200).json({ handled: true });
        }
      }

      class TestController {}
      (mockRequest as any).__expressotsController = TestController;
      (mockRequest as any).__expressotsMethod = "testMethod";

      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        [FailingFilter, SecondFilter],
        TestController,
        "testMethod",
      );

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(secondFilterCalled).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-Error objects", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = "String error" as unknown as Error;

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect((mockRequest as any).__expressotsFlowError).toBeInstanceOf(Error);
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should handle request with httpContext", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      const httpContext = {} as any;
      (mockRequest as any).httpContext = httpContext;

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should handle error when headers already sent", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      mockResponse.headersSent = true;

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should handle error when controller extraction fails", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      // Mock request to throw error when accessing __expressotsController
      Object.defineProperty(mockRequest, "__expressotsController", {
        get: () => {
          throw new Error("Controller access error");
        },
        configurable: true,
      });

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it("should use default handler when no filters available", async () => {
      // Arrange
      middleware = new ExceptionHandlerMiddleware(container);
      const error = new Error("Test error");
      // Mock logger.getConfig to avoid errors in getErrorHints
      (mockLogger as any).getConfig = jest.fn().mockReturnValue({
        suggestions: { enabled: false },
      });

      // Act
      await middleware.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCode.InternalServerError);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: StatusCode.InternalServerError,
          error: "An unexpected error occurred.",
        }),
      );
    });
  });
});

// End of unit tests for: ExceptionHandlerMiddleware.handle

