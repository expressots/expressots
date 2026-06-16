// Unit tests for: when

import { Request } from "express";
import {
  when,
  isConditionalMiddleware,
  type ConditionalMiddlewareConfig,
} from "../conditional-middleware";

describe("when() when function", () => {
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
    it("should create a ConditionalMiddlewareConfig with condition and middleware", () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "example.com";

      // Act
      const result = when(condition, mockMiddleware);

      // Assert
      expect(result).toHaveProperty("condition");
      expect(result).toHaveProperty("middleware");
      expect(result.skipOnFalse).toBe(true);
      expect(result.middleware).toBe(mockMiddleware);
    });

    it("should execute middleware when condition is true", async () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "example.com";
      const config = when(condition, mockMiddleware);

      // Act
      const conditionResult = await config.condition(mockRequest as Request);

      // Assert
      expect(conditionResult).toBe(true);
    });

    it("should not execute middleware when condition is false", async () => {
      // Arrange
      const condition = (req: Request) => req.hostname === "admin.example.com";
      const config = when(condition, mockMiddleware);

      // Act
      const conditionResult = await config.condition(mockRequest as Request);

      // Assert
      expect(conditionResult).toBe(false);
    });

    it("should support async conditions", async () => {
      // Arrange
      const condition = async (req: Request) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return req.query.enabled === "true";
      };
      const config = when(condition, mockMiddleware);
      const requestWithQuery = {
        ...mockRequest,
        query: { enabled: "true" },
      } as Request;

      // Act
      const conditionResult = await config.condition(requestWithQuery);

      // Assert
      expect(conditionResult).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle condition that throws an error", async () => {
      // Arrange
      const condition = (req: Request) => {
        throw new Error("Condition error");
      };
      const config = when(condition, mockMiddleware);

      // Act & Assert
      try {
        await config.condition(mockRequest as Request);
        fail("Expected condition to throw an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Condition error");
      }
    });

    it("should handle condition that returns false for empty string hostname", async () => {
      // Arrange
      const condition = (req: Request) => req.hostname.startsWith("admin.");
      const config = when(condition, mockMiddleware);
      const requestWithEmptyHostname = { ...mockRequest, hostname: "" } as Request;

      // Act
      const conditionResult = await config.condition(requestWithEmptyHostname);

      // Assert
      expect(conditionResult).toBe(false);
    });

    it("should work with function middleware", () => {
      // Arrange
      const functionMiddleware = jest.fn();
      const condition = (req: Request) => true;

      // Act
      const result = when(condition, functionMiddleware);

      // Assert
      expect(result.middleware).toBe(functionMiddleware);
      expect(isConditionalMiddleware(result)).toBe(true);
    });
  });
});

// End of unit tests for: when
