// Unit tests for: BaseExceptionFilter.sendErrorResponse

import "reflect-metadata";
import { BaseExceptionFilter } from "../base-exception-filter";
import { ExceptionContext } from "../exception-filter.interface";

// Mock Logger and Report
jest.mock("../../provider/logger/logger.provider", () => ({
  Logger: jest.fn(),
}));

jest.mock("../report", () => ({
  Report: jest.fn(),
}));

class MockResponse {
  public headersSent = false;
  public status = jest.fn().mockReturnThis();
  public json = jest.fn().mockReturnThis();
}

class MockRequest {
  public path = "/test";
}

class MockNextFunction {
  public fn = jest.fn();
}

class TestExceptionFilter extends BaseExceptionFilter {
  public catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("BaseExceptionFilter.sendErrorResponse() sendErrorResponse method", () => {
  let filter: TestExceptionFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;
  let mockNext: MockNextFunction;
  let context: ExceptionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new TestExceptionFilter();
    mockResponse = new MockResponse();
    mockRequest = new MockRequest();
    mockNext = new MockNextFunction();
    context = {
      request: mockRequest as any,
      response: mockResponse as any,
      next: mockNext.fn as any,
    };
  });

  describe("Happy Path", () => {
    it("should send error response with status code and body", () => {
      // Arrange
      const statusCode = 400;
      const body = { error: "Bad request" };

      // Act
      filter["sendErrorResponse"](context, statusCode, body);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
      expect(mockResponse.json).toHaveBeenCalledWith(body);
    });

    it("should send error response when headers not sent", () => {
      // Arrange
      mockResponse.headersSent = false;
      const statusCode = 404;
      const body = { error: "Not found" };

      // Act
      filter["sendErrorResponse"](context, statusCode, body);

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should not send response when headers already sent", () => {
      // Arrange
      mockResponse.headersSent = true;
      const statusCode = 400;
      const body = { error: "Bad request" };

      // Act
      filter["sendErrorResponse"](context, statusCode, body);

      // Assert
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: BaseExceptionFilter.sendErrorResponse

