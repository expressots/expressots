// Unit tests for: AppError constructor

import "reflect-metadata";
import { AppError, AppErrorOptions } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError() AppError constructor", () => {
  describe("Happy Path", () => {
    it("should create AppError with message and default status code", () => {
      // Arrange
      const message = "Test error message";

      // Act
      const error = new AppError(message);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(StatusCode.InternalServerError);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should create AppError with message and custom status code", () => {
      // Arrange
      const message = "Not found";
      const statusCode = StatusCode.NotFound;

      // Act
      const error = new AppError(message, statusCode);

      // Assert
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });

    it("should create AppError with message, status code, and service", () => {
      // Arrange
      const message = "Test error";
      const statusCode = StatusCode.BadRequest;
      const service = "TestService";

      // Act
      const error = new AppError(message, statusCode, service);

      // Assert
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.service).toBe(service);
    });

    it("should create AppError with all options", () => {
      // Arrange
      const message = "Test error";
      const statusCode = StatusCode.BadRequest;
      const service = "TestService";
      const options: AppErrorOptions = {
        errorCode: "TEST_ERROR",
        details: { field: "email" },
        instance: "/api/users/123",
        type: "https://example.com/errors/test",
        validationErrors: [
          { property: "email", messages: ["Invalid email"] },
        ],
        requestId: "req-123",
      };

      // Act
      const error = new AppError(message, statusCode, service, options);

      // Assert
      expect(error.errorCode).toBe(options.errorCode);
      expect(error.details).toEqual(options.details);
      expect(error.instance).toBe(options.instance);
      expect(error.type).toBe(options.type);
      expect(error.validationErrors).toEqual(options.validationErrors);
      expect(error.requestId).toBe(options.requestId);
    });

    it("should set default type when not provided", () => {
      // Arrange
      const message = "Test error";
      const statusCode = StatusCode.NotFound;

      // Act
      const error = new AppError(message, statusCode);

      // Assert
      expect(error.type).toBe(`https://expressots.dev/errors/${statusCode}`);
    });

    it("should handle null message by setting empty string", () => {
      // Arrange
      const message = null as any;

      // Act
      const error = new AppError(message);

      // Assert
      expect(error.message).toBe("");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined service", () => {
      // Arrange
      const message = "Test error";
      const statusCode = StatusCode.BadRequest;

      // Act
      const error = new AppError(message, statusCode, undefined);

      // Assert
      expect(error.service).toBeUndefined();
    });

    it("should handle empty options object", () => {
      // Arrange
      const message = "Test error";
      const options: AppErrorOptions = {};

      // Act
      const error = new AppError(message, undefined, undefined, options);

      // Assert
      expect(error.errorCode).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.instance).toBeUndefined();
    });

    it("should handle partial options", () => {
      // Arrange
      const message = "Test error";
      const options: AppErrorOptions = {
        errorCode: "PARTIAL_ERROR",
      };

      // Act
      const error = new AppError(message, undefined, undefined, options);

      // Assert
      expect(error.errorCode).toBe("PARTIAL_ERROR");
      expect(error.details).toBeUndefined();
    });
  });
});

// End of unit tests for: AppError constructor

