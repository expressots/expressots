import { describe, it, expect, vi, beforeEach } from "vitest";
import defaultErrorHandler from "../error-handler-middleware";
import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("defaultErrorHandler", () => {
  let mockRes: any;
  const mockNext = vi.fn(); // Mock for NextFunction, though typically not used in error handling

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(), // Chainable mock
      json: vi.fn().mockReturnThis(),
    };
  });

  it("handles AppError by setting the correct status and returning error details", () => {
    const testError = new AppError(
      "Not Found",
      StatusCode.NotFound,
      "TestService",
    );

    defaultErrorHandler(testError, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(StatusCode.NotFound);
    expect(mockRes.json).toHaveBeenCalledWith({
      code: StatusCode.NotFound,
      error: "Not Found",
    });
  });

  it("handles generic errors by setting status to 500 and returning a generic error message", () => {
    const testError = new Error("Generic error");

    defaultErrorHandler(testError, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(StatusCode.InternalServerError);
    expect(mockRes.json).toHaveBeenCalledWith({
      code: StatusCode.InternalServerError,
      error: "An unexpected error occurred.",
    });
  });
});
