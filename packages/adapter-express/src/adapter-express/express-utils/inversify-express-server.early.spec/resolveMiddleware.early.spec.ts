// Unit tests for: resolveMiddleware (conditional middleware support)

import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { interfaces } from "@expressots/core";
import { BaseMiddleware } from "../base-middleware";
import { when, unless, isConditionalMiddleware } from "../conditional-middleware";
import { combine, sequence } from "../middleware-composition";
import { InversifyExpressServer } from "../inversify-express-server";
import { ExpressoMiddleware } from "@expressots/core";

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    getControllersFromMetadata: jest.fn().mockReturnValue([]),
    getControllersFromContainer: jest.fn().mockReturnValue([]),
    getControllerMetadata: jest.fn(),
    getControllerMethodMetadata: jest.fn(),
    getControllerParameterMetadata: jest.fn(),
    instanceOfIHttpActionResult: jest.fn(),
  };
});

jest.mock("../decorators", () => {
  const actual = jest.requireActual("../decorators");
  return {
    ...actual,
    getRenderMetadata: jest.fn(),
  };
});

class MockContainer {
  public bind = jest.fn().mockReturnThis();
  public to = jest.fn().mockReturnThis();
  public toConstantValue = jest.fn().mockReturnThis();
  public isBound = jest.fn().mockReturnValue(false);
  public isBoundNamed = jest.fn().mockReturnValue(false);
  public createChild = jest.fn().mockReturnThis();
  public get = jest.fn();
  public getNamed = jest.fn();
  public whenTargetNamed = jest.fn().mockReturnThis();
}

class MockAuthProvider {
  public getUser = jest.fn().mockResolvedValue({
    details: null,
    isAuthenticated: jest.fn().mockResolvedValue(false),
    isInRole: jest.fn().mockResolvedValue(false),
    isResourceOwner: jest.fn().mockResolvedValue(false),
  });
}

describe("InversifyExpressServer.resolveMiddleware() conditional middleware support", () => {
  let mockContainer: MockContainer;
  let mockAuthProvider: MockAuthProvider;
  let server: InversifyExpressServer;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    mockAuthProvider = new MockAuthProvider() as any;
    server = new InversifyExpressServer(
      mockContainer as any,
      null,
      null,
      null,
      mockAuthProvider as any,
    );

    mockRequest = {
      hostname: "example.com",
      path: "/test",
      method: "GET",
      headers: {},
      query: {},
    } as Partial<Request>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as Partial<Response>;

    mockNext = jest.fn();
  });

  describe("Happy Path - Conditional Middleware", () => {
    it("should execute middleware when condition is true", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(condition, functionMiddleware);

      // Access private method via reflection or create a test route
      // Since resolveMiddleware is private, we'll test it indirectly through route registration
      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);
      expect(handlers).toHaveLength(1);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should skip middleware when condition is false", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = (req: Request) => req.hostname === "admin.example.com";
      const conditionalMiddleware = when(condition, functionMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should execute middleware with unless() when condition is false", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = (req: Request) => req.hostname === "admin.example.com";
      const conditionalMiddleware = unless(condition, functionMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should skip middleware with unless() when condition is true", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = unless(condition, functionMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should support async conditions", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = async (req: Request) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return req.query.enabled === "true";
      };
      const conditionalMiddleware = when(condition, functionMiddleware);
      const requestWithQuery = {
        ...mockRequest,
        query: { enabled: "true" },
      } as Request;

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](requestWithQuery, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle ExpressoMiddleware class instances in conditional middleware", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }
      const middlewareInstance = new TestMiddleware();
      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(condition, middlewareInstance);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle ExpressoMiddleware class references in conditional middleware (Phase 2)", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }
      // Pass class reference (not instance) - Phase 2 feature
      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(condition, TestMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle class references in unless() conditional middleware (Phase 2)", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }
      // Pass class reference (not instance) - Phase 2 feature
      const condition = (req: Request) => req.hostname === "admin.example.com";
      const conditionalMiddleware = unless(condition, TestMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should create instance lazily when using class reference in conditional middleware (Phase 2)", async () => {
      // Arrange
      let instanceCount = 0;
      class TestMiddleware extends ExpressoMiddleware {
        constructor() {
          super();
          instanceCount++;
        }

        use(req: Request, res: Response, next: NextFunction): void {
          next();
        }
      }
      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(condition, TestMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act - first request (condition true, middleware should execute)
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);
      expect(instanceCount).toBe(1);

      // Act - second request (condition true, middleware should execute, instance reused)
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);
      expect(instanceCount).toBe(1); // Still 1, instance reused

      // Act - third request with condition false (middleware skipped, no new instance)
      const requestWithDifferentHostname = {
        ...mockRequest,
        hostname: "other.com",
      } as Request;
      await handlers[0](requestWithDifferentHostname, mockResponse as Response, mockNext);
      expect(instanceCount).toBe(1); // Still 1, no new instance created
    });

    it("should resolve from container when class reference is container-bound in conditional middleware (Phase 2)", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }

      const containerInstance = new TestMiddleware();
      mockContainer.isBound.mockReturnValue(true);
      mockContainer.get.mockReturnValue(containerInstance);

      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(condition, TestMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(TestMiddleware);
      expect(mockContainer.get).toHaveBeenCalledWith(TestMiddleware);
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases - Conditional Middleware", () => {
    it("should handle condition that throws an error", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };
      const condition = (req: Request) => {
        throw new Error("Condition error");
      };
      const conditionalMiddleware = when(condition, functionMiddleware);

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle multiple conditional middleware in sequence", async () => {
      // Arrange
      const middleware1Executed = jest.fn();
      const middleware2Executed = jest.fn();
      const functionMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        middleware1Executed();
        next();
      };
      const functionMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        middleware2Executed();
        next();
      };
      const condition1 = (req: Request) => req.hostname === "example.com";
      const condition2 = (req: Request) => req.method === "GET";
      const conditionalMiddleware1 = when(condition1, functionMiddleware1);
      const conditionalMiddleware2 = when(condition2, functionMiddleware2);

      const handlers = (server as any).resolveMiddleware(
        conditionalMiddleware1,
        conditionalMiddleware2,
      );

      // Act
      for (const handler of handlers) {
        await handler(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(middleware1Executed).toHaveBeenCalledTimes(1);
      expect(middleware2Executed).toHaveBeenCalledTimes(1);
    });

    it("should maintain backward compatibility with regular middleware", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        middlewareExecuted();
        next();
      };

      const handlers = (server as any).resolveMiddleware(functionMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Phase 3: Middleware Composition", () => {
    it("should execute all middleware in combine() sequentially", async () => {
      // Arrange
      const middleware1Executed = jest.fn();
      const middleware2Executed = jest.fn();
      const middleware3Executed = jest.fn();

      const functionMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        middleware1Executed();
        next();
      };
      const functionMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        middleware2Executed();
        next();
      };
      const functionMiddleware3 = (req: Request, res: Response, next: NextFunction) => {
        middleware3Executed();
        next();
      };

      const composedMiddleware = combine(
        functionMiddleware1,
        functionMiddleware2,
        functionMiddleware3,
      );

      const handlers = (server as any).resolveMiddleware(composedMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middleware1Executed).toHaveBeenCalledTimes(1);
      expect(middleware2Executed).toHaveBeenCalledTimes(1);
      expect(middleware3Executed).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should execute all middleware in sequence() sequentially", async () => {
      // Arrange
      const middleware1Executed = jest.fn();
      const middleware2Executed = jest.fn();

      const functionMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        middleware1Executed();
        next();
      };
      const functionMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        middleware2Executed();
        next();
      };

      const sequencedMiddleware = sequence(functionMiddleware1, functionMiddleware2);

      const handlers = (server as any).resolveMiddleware(sequencedMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middleware1Executed).toHaveBeenCalledTimes(1);
      expect(middleware2Executed).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should work with combine() and class references (Phase 2 + Phase 3)", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }

      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next();
      };

      const composedMiddleware = combine(TestMiddleware, functionMiddleware);

      const handlers = (server as any).resolveMiddleware(composedMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should work with combine() and multiple class references (Phase 2 + Phase 3)", async () => {
      // Arrange
      const middleware1Executed = jest.fn();
      const middleware2Executed = jest.fn();

      class TestMiddleware1 extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middleware1Executed();
          next();
        }
      }

      class TestMiddleware2 extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middleware2Executed();
          next();
        }
      }

      const composedMiddleware = combine(TestMiddleware1, TestMiddleware2);

      const handlers = (server as any).resolveMiddleware(composedMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middleware1Executed).toHaveBeenCalledTimes(1);
      expect(middleware2Executed).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should work with conditional middleware and combine() (Phase 1 + Phase 3)", async () => {
      // Arrange
      const middleware1Executed = jest.fn();
      const middleware2Executed = jest.fn();

      const functionMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        middleware1Executed();
        next();
      };
      const functionMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        middleware2Executed();
        next();
      };

      const condition = (req: Request) => req.hostname === "example.com";
      const conditionalMiddleware = when(
        condition,
        combine(functionMiddleware1, functionMiddleware2),
      );

      const handlers = (server as any).resolveMiddleware(conditionalMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middleware1Executed).toHaveBeenCalledTimes(1);
      expect(middleware2Executed).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from middleware in combine()", async () => {
      // Arrange
      const error = new Error("Middleware error");
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next(error);
      };

      const composedMiddleware = combine(functionMiddleware);

      const handlers = (server as any).resolveMiddleware(composedMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

// End of unit tests for: resolveMiddleware
