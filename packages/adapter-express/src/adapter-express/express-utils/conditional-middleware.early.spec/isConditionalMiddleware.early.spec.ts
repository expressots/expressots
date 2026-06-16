// Unit tests for: isConditionalMiddleware

import { Request, Response, NextFunction } from "express";
import {
  when,
  unless,
  isConditionalMiddleware,
  type ConditionalMiddlewareConfig,
} from "../conditional-middleware";
import { ExpressoMiddleware } from "@expressots/core";

describe("isConditionalMiddleware() isConditionalMiddleware function", () => {
  let mockMiddleware: jest.Mock;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockMiddleware = jest.fn();
    mockRequest = {
      hostname: "example.com",
      path: "/test",
      method: "GET",
      headers: {},
      query: {},
    };
  });

  describe("Happy Path", () => {
    it("should return true for ConditionalMiddlewareConfig from when()", () => {
      // Arrange
      const condition = (req: Request) => true;
      const config = when(condition, mockMiddleware);

      // Act
      const result = isConditionalMiddleware(config);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for ConditionalMiddlewareConfig from unless()", () => {
      // Arrange
      const condition = (req: Request) => false;
      const config = unless(condition, mockMiddleware);

      // Act
      const result = isConditionalMiddleware(config);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for regular function middleware", () => {
      // Arrange
      const functionMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next();
      };

      // Act
      const result = isConditionalMiddleware(functionMiddleware);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for ExpressoMiddleware instance", () => {
      // Arrange
      class TestMiddleware extends ExpressoMiddleware {
        use(req: Request, res: Response, next: NextFunction): void {
          next();
        }
      }
      const middlewareInstance = new TestMiddleware();

      // Act
      const result = isConditionalMiddleware(middlewareInstance);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for null", () => {
      // Act
      const result = isConditionalMiddleware(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isConditionalMiddleware(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for plain object without condition", () => {
      // Arrange
      const plainObject = { middleware: mockMiddleware };

      // Act
      const result = isConditionalMiddleware(plainObject);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object with condition but not a function", () => {
      // Arrange
      const invalidConfig = {
        condition: "not a function",
        middleware: mockMiddleware,
      };

      // Act
      const result = isConditionalMiddleware(invalidConfig);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for string", () => {
      // Act
      const result = isConditionalMiddleware("middleware");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for number", () => {
      // Act
      const result = isConditionalMiddleware(123);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for array", () => {
      // Act
      const result = isConditionalMiddleware([mockMiddleware]);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isConditionalMiddleware
