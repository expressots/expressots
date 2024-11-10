// Unit tests for: defaultErrorHandler

import defaultErrorHandler from "../error-handler-middleware";
import { StatusCode } from "../status-code";
import { beautifyStackTrace } from "../utils";
import { AppError } from "../app-error";

// Mocking the beautifyStackTrace function
jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    beautifyStackTrace: jest.fn(),
  };
});

// Mock classes
class MockResponse {
  public status = jest.fn().mockReturnThis();
  public json = jest.fn().mockReturnThis();
}

class MockError extends Error {
  public message: string = "Mock error message";
  public stack?: string = "Mock stack trace";
}

// Since NextFunction is just a function, we can use jest.fn()
import { NextFunction } from "express";
const mockNextFunction = jest.fn() as jest.MockedFunction<NextFunction>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("defaultErrorHandler() function", () => {
  let mockResponse: MockResponse;

  beforeEach(() => {
    mockResponse = new MockResponse();
  });

  // Happy Path: Handling AppError
  it("should handle AppError correctly by setting the status and sending a JSON response", () => {
    const mockAppError = new AppError("Mock error message", StatusCode.BadRequest);

    defaultErrorHandler(
      mockAppError,
      mockResponse as any,
      mockNextFunction,
      false,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCode.BadRequest);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: mockAppError.statusCode,
      error: mockAppError.message,
    });
  });

  // Happy Path: Handling generic Error
  it("should handle generic Error correctly by setting the status to InternalServerError and sending a JSON response", () => {
    const mockError = new MockError();

    defaultErrorHandler(
      mockError,
      mockResponse as any,
      mockNextFunction,
      false,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCode.InternalServerError);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: StatusCode.InternalServerError,
      error: "An unexpected error occurred.",
    });
  });

  // Edge Case: Show stack trace when showStackTrace is true
  it("should call beautifyStackTrace when showStackTrace is true and error has a stack", () => {
    const mockError = new MockError();

    defaultErrorHandler(
      mockError,
      mockResponse as any,
      mockNextFunction,
      true,
    );

    expect(beautifyStackTrace).toHaveBeenCalledWith(mockError.stack);
  });

  // Edge Case: Do not call beautifyStackTrace when showStackTrace is false
  it("should not call beautifyStackTrace when showStackTrace is false", () => {
    const mockError = new MockError();

    defaultErrorHandler(
      mockError,
      mockResponse as any,
      mockNextFunction,
      false,
    );

    expect(beautifyStackTrace).not.toHaveBeenCalled();
  });

  // Edge Case: Error in errorHandler itself
  it("should call next with the error if an error occurs within the errorHandler", () => {
    const mockError = new MockError();
    mockResponse.status.mockImplementation(() => {
      throw new Error("Mock error in status");
    });

    defaultErrorHandler(
      mockError,
      mockResponse as any,
      mockNextFunction,
      false,
    );

    expect(mockNextFunction).toHaveBeenCalledWith(expect.any(Error));
  });
});

// End of unit tests for: defaultErrorHandler
