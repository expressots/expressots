// Unit tests for: sequence

import { Request } from "express";
import {
  sequence,
  isComposedMiddleware,
  type ComposedMiddlewareConfig,
} from "../middleware-composition";

describe("sequence() function", () => {
  let mockMiddleware1: jest.Mock;
  let mockMiddleware2: jest.Mock;
  let mockMiddleware3: jest.Mock;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockMiddleware1 = jest.fn();
    mockMiddleware2 = jest.fn();
    mockMiddleware3 = jest.fn();
    mockRequest = {
      hostname: "example.com",
      path: "/test",
      method: "GET",
      headers: {},
      query: {},
    };
  });

  describe("Happy Path", () => {
    it("should create a ComposedMiddlewareConfig with multiple middleware", () => {
      // Arrange & Act
      const result = sequence(mockMiddleware1, mockMiddleware2, mockMiddleware3);

      // Assert
      expect(result).toHaveProperty("middleware");
      expect(result).toHaveProperty("type");
      expect(result.type).toBe("sequence");
      expect(result.middleware).toHaveLength(3);
      expect(result.middleware[0]).toBe(mockMiddleware1);
      expect(result.middleware[1]).toBe(mockMiddleware2);
      expect(result.middleware[2]).toBe(mockMiddleware3);
      expect(isComposedMiddleware(result)).toBe(true);
    });

    it("should create a ComposedMiddlewareConfig with single middleware", () => {
      // Arrange & Act
      const result = sequence(mockMiddleware1);

      // Assert
      expect(result).toHaveProperty("middleware");
      expect(result).toHaveProperty("type");
      expect(result.type).toBe("sequence");
      expect(result.middleware).toHaveLength(1);
      expect(result.middleware[0]).toBe(mockMiddleware1);
    });

    it("should work with function middleware", () => {
      // Arrange
      const functionMiddleware = jest.fn();

      // Act
      const result = sequence(functionMiddleware);

      // Assert
      expect(result.middleware).toContain(functionMiddleware);
      expect(isComposedMiddleware(result)).toBe(true);
    });

    it("should work with class references", () => {
      // Arrange
      class TestMiddleware {
        use() {}
      }

      // Act
      const result = sequence(TestMiddleware);

      // Assert
      expect(result.middleware).toContain(TestMiddleware);
      expect(isComposedMiddleware(result)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when no middleware provided", () => {
      // Act & Assert
      expect(() => {
        sequence();
      }).toThrow("sequence() requires at least one middleware");
    });
  });
});

// End of unit tests for: sequence
