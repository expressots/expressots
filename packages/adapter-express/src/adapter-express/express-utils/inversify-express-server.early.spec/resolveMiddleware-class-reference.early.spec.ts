// Unit tests for: resolveMiddleware (class reference support - Phase 2)

import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { interfaces } from "@expressots/core";
import { ExpressoMiddleware } from "@expressots/core";
import { BaseMiddleware } from "../base-middleware";
import { InversifyExpressServer } from "../inversify-express-server";

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

describe("InversifyExpressServer.resolveMiddleware() class reference support (Phase 2)", () => {
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

  describe("Happy Path - Class Reference Support", () => {
    it("should support class reference without 'new' keyword", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }

      // Pass class reference (not instance)
      const handlers = (server as any).resolveMiddleware(TestMiddleware);
      expect(handlers).toHaveLength(1);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should create instance lazily on first request", async () => {
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

      const handlers = (server as any).resolveMiddleware(TestMiddleware);

      // Act - first request
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);
      expect(instanceCount).toBe(1);

      // Act - second request (should reuse instance)
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);
      expect(instanceCount).toBe(1); // Still 1, instance reused
    });

    it("should resolve from container if class is container-bound", async () => {
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

      const handlers = (server as any).resolveMiddleware(TestMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockContainer.isBound).toHaveBeenCalledWith(TestMiddleware);
      expect(mockContainer.get).toHaveBeenCalledWith(TestMiddleware);
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
    });

    it("should support async middleware from class reference", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        async use(req: Request, res: Response, next: NextFunction): Promise<void> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          middlewareExecuted();
          next();
        }
      }

      const handlers = (server as any).resolveMiddleware(TestMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Backward Compatibility", () => {
    it("should still support instance-based middleware (with 'new')", async () => {
      // Arrange
      const middlewareExecuted = jest.fn();
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          middlewareExecuted();
          next();
        }
      }

      // Pass instance (old way)
      const instance = new TestMiddleware();
      const handlers = (server as any).resolveMiddleware(instance);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(middlewareExecuted).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should still support function middleware", async () => {
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

  describe("Edge Cases", () => {
    it("should handle errors in middleware execution", async () => {
      // Arrange
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          throw new Error("Middleware error");
        }
      }

      const handlers = (server as any).resolveMiddleware(TestMiddleware);

      // Act
      try {
        await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Middleware error");
      }
    });

    it("should handle async middleware errors", async () => {
      // Arrange
      class TestMiddleware extends ExpressoMiddleware {
        async use(req: Request, res: Response, next: NextFunction): Promise<void> {
          throw new Error("Async middleware error");
        }
      }

      const handlers = (server as any).resolveMiddleware(TestMiddleware);

      // Act
      await handlers[0](mockRequest as Request, mockResponse as Response, mockNext);

      // Assert - error should be passed to next()
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

// End of unit tests for: resolveMiddleware (class reference support)
