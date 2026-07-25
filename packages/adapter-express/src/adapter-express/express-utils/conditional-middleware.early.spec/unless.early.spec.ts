// Unit tests for: unless

import { Request } from "express";
import { unless, isConditionalMiddleware } from "../conditional-middleware";

describe("unless() unless function", () => {
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
    it("should create a ConditionalMiddlewareConfig with inverted condition", () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "example.com";

      // Act
      const result = unless(condition, mockMiddleware);

      // Assert
      expect(result).toHaveProperty("condition");
      expect(result).toHaveProperty("middleware");
      expect(result.skipOnFalse).toBe(true);
      expect(result.middleware).toBe(mockMiddleware);
    });

    it("should execute middleware when original condition is false", async () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "admin.example.com";
      const config = unless(condition, mockMiddleware);

      // Act
      const conditionResult = await config.condition(mockRequest as Request);

      // Assert
      expect(conditionResult).toBe(true); // Inverted: false -> true
    });

    it("should not execute middleware when original condition is true", async () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "example.com";
      const config = unless(condition, mockMiddleware);

      // Act
      const conditionResult = await config.condition(mockRequest as Request);

      // Assert
      expect(conditionResult).toBe(false); // Inverted: true -> false
    });

    it("should support async conditions with inversion", async () => {
      // Arrange
      const condition = async (req: Request) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return req.query.enabled === "true";
      };
      const config = unless(condition, mockMiddleware);
      const requestWithQuery = {
        ...mockRequest,
        query: { enabled: "false" },
      } as Request;

      // Act
      const conditionResult = await config.condition(requestWithQuery);

      // Assert
      expect(conditionResult).toBe(true); // Inverted: false -> true
    });

    it("should invert async conditions correctly", async () => {
      // Arrange
      const condition = async (req: Request) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return req.query.enabled === "true";
      };
      const config = unless(condition, mockMiddleware);
      const requestWithQuery = {
        ...mockRequest,
        query: { enabled: "true" },
      } as Request;

      // Act
      const conditionResult = await config.condition(requestWithQuery);

      // Assert
      expect(conditionResult).toBe(false); // Inverted: true -> false
    });
  });

  describe("Edge Cases", () => {
    it("should handle condition that throws an error", async () => {
      // Arrange
      const condition = (req: Request) => {
        throw new Error("Condition error");
      };
      const config = unless(condition, mockMiddleware);

      // Act & Assert
      try {
        await config.condition(mockRequest as Request);
        fail("Expected condition to throw an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Condition error");
      }
    });

    it("should work with function middleware", () => {
      // Arrange
      const functionMiddleware = jest.fn();
      const condition = (req: Request) => false;

      // Act
      const result = unless(condition, functionMiddleware);

      // Assert
      expect(result.middleware).toBe(functionMiddleware);
      expect(isConditionalMiddleware(result)).toBe(true);
    });
  });
});

// End of unit tests for: unless
