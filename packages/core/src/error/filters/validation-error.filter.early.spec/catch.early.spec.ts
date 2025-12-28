// Unit tests for: ValidationErrorFilter.catch()

import { ValidationErrorFilter } from "../validation-error.filter";
import { ValidationError } from "../../validation.error";
import { StatusCode } from "../../status-code";
import type { ExceptionContext } from "../../exception-filter.interface";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("ValidationErrorFilter.catch()", () => {
  let filter: ValidationErrorFilter;
  let mockContext: ExceptionContext;

  beforeEach(() => {
    filter = new ValidationErrorFilter();
    mockContext = {
      request: {
        method: "POST",
        path: "/api/users",
        url: "/api/users",
        headers: {},
      } as any,
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any,
      next: jest.fn(),
    };
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
  });

  afterAll(() => {
    mockStdoutWrite.mockRestore();
    mockStderrWrite.mockRestore();
  });

  describe("Happy Path", () => {
    it("should handle ValidationError with errors", () => {
      // Arrange
      const errors = [
        { property: "email", messages: ["Invalid email format"] },
        { property: "age", messages: ["Age must be a number"] },
      ];
      const error = new ValidationError(errors);

      // Act
      filter.catch(error, mockContext);

      // Assert
      expect(mockContext.response.status).toHaveBeenCalledWith(
        StatusCode.BadRequest,
      );
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "https://expressots.dev/errors/validation-failed",
          title: "Validation Failed",
          status: StatusCode.BadRequest,
          instance: "/api/users",
          validationErrors: errors,
        }),
      );
    });

    it("should include timestamp", () => {
      // Arrange
      const error = new ValidationError([]);

      // Act
      filter.catch(error, mockContext);

      // Assert
      const call = (mockContext.response.json as jest.Mock).mock.calls[0][0];
      expect(call.timestamp).toBeDefined();
      expect(new Date(call.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it("should handle empty validation errors array", () => {
      // Arrange
      const error = new ValidationError([]);

      // Act
      filter.catch(error, mockContext);

      // Assert
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          validationErrors: [],
        }),
      );
    });
  });
});
