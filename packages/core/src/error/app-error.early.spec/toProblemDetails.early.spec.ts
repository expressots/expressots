// Unit tests for: AppError.toProblemDetails

import { AppError, AppErrorOptions } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.toProblemDetails() toProblemDetails method", () => {
  describe("Happy Path", () => {
    it("should convert AppError to ProblemDetails format", () => {
      // Arrange
      const error = new AppError("Test error", StatusCode.BadRequest);

      // Act
      const problem = error.toProblemDetails();

      // Assert
      expect(problem.type).toBe(error.type);
      expect(problem.title).toBe("Test error");
      expect(problem.status).toBe(StatusCode.BadRequest);
      expect(problem.instance).toBeUndefined();
      expect(problem.timestamp).toBeDefined();
    });

    it("should include all optional fields when present", () => {
      // Arrange
      const options: AppErrorOptions = {
        errorCode: "TEST_ERROR",
        details: { field: "email" },
        instance: "/api/users/123",
        requestId: "req-123",
      };
      const error = new AppError(
        "Test error",
        StatusCode.BadRequest,
        "TestService",
        options,
      );

      // Act
      const problem = error.toProblemDetails();

      // Assert
      expect(problem.errorCode).toBe("TEST_ERROR");
      expect(problem.service).toBe("TestService");
      expect(problem.detail).toEqual({ field: "email" });
      expect(problem.instance).toBe("/api/users/123");
    });

    it("should include validation errors when present", () => {
      // Arrange
      const validationErrors = [
        { property: "email", messages: ["Invalid email"] },
      ];
      const error = new AppError("Validation failed", StatusCode.UnprocessableEntity, undefined, {
        validationErrors,
      });

      // Act
      const problem = error.toProblemDetails();

      // Assert
      expect(problem.validationErrors).toEqual(validationErrors);
    });

    it("should format timestamp as ISO string", () => {
      // Arrange
      const error = new AppError("Test error");

      // Act
      const problem = error.toProblemDetails();

      // Assert
      expect(problem.timestamp).toBe(error.timestamp.toISOString());
    });
  });

  describe("Edge Cases", () => {
    it("should handle error without optional fields", () => {
      // Arrange
      const error = new AppError("Simple error");

      // Act
      const problem = error.toProblemDetails();

      // Assert
      expect(problem.errorCode).toBeUndefined();
      expect(problem.service).toBeUndefined();
      expect(problem.detail).toBeUndefined();
      expect(problem.instance).toBeUndefined();
      expect(problem.validationErrors).toBeUndefined();
    });
  });
});

// End of unit tests for: AppError.toProblemDetails

