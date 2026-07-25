// Unit tests for: bind

import type { NextFunction, Request, Response } from "express";
import { BaseMiddleware } from "../base-middleware";

// Mock implementations
type MockServiceIdentifier = string;

interface MockHttpContext {
  container: {
    bind: jest.Mock;
  };
}

class MockHttpContextImpl implements MockHttpContext {
  container = {
    bind: jest.fn(),
  };
}

// Concrete class for testing
class ConcreteMiddleware extends BaseMiddleware {
  public handler(req: Request, res: Response, next: NextFunction): void {
    // Implementation not needed for bind method testing
  }
}

describe("BaseMiddleware.bind() bind method", () => {
  let middleware: ConcreteMiddleware;
  let mockHttpContext: MockHttpContext;

  beforeEach(() => {
    mockHttpContext = new MockHttpContextImpl() as any;
    middleware = new ConcreteMiddleware();
    middleware.httpContext = mockHttpContext as any;
  });

  describe("Happy path", () => {
    it("should bind the service identifier to the container", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "TestService";

      // Act
      (middleware as any).bind(serviceIdentifier as any);

      // Assert
      expect(mockHttpContext.container.bind).toHaveBeenCalledWith(serviceIdentifier);
    });
  });

  describe("Edge cases", () => {
    it("should handle binding with an empty service identifier", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = "";

      // Act
      (middleware as any).bind(serviceIdentifier as any);

      // Assert
      expect(mockHttpContext.container.bind).toHaveBeenCalledWith(serviceIdentifier);
    });

    it("should handle binding with a null service identifier", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = null as any;

      // Act
      (middleware as any).bind(serviceIdentifier);

      // Assert
      expect(mockHttpContext.container.bind).toHaveBeenCalledWith(serviceIdentifier);
    });

    it("should handle binding with an undefined service identifier", () => {
      // Arrange
      const serviceIdentifier: MockServiceIdentifier = undefined as any;

      // Act
      (middleware as any).bind(serviceIdentifier);

      // Assert
      expect(mockHttpContext.container.bind).toHaveBeenCalledWith(serviceIdentifier);
    });
  });
});

// End of unit tests for: bind
