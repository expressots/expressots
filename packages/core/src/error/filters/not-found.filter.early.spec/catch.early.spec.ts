// Unit tests for: NotFoundFilter.catch()

import { NotFoundFilter } from "../not-found.filter";
import { NotFoundError } from "../../not-found.error";
import { StatusCode } from "../../status-code";
import type { ExceptionContext } from "../../exception-filter.interface";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("NotFoundFilter.catch()", () => {
  let filter: NotFoundFilter;
  let mockContext: ExceptionContext;

  beforeEach(() => {
    filter = new NotFoundFilter();
    mockContext = {
      request: {
        method: "GET",
        path: "/api/users/123",
        url: "/api/users/123",
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
    it("should handle NotFoundError with message", () => {
      // Arrange
      const error = new NotFoundError("User", "123");

      // Act
      filter.catch(error, mockContext);

      // Assert
      expect(mockContext.response.status).toHaveBeenCalledWith(
        StatusCode.NotFound,
      );
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "https://expressots.dev/errors/not-found",
          title: "User with id 123 not found",
          status: StatusCode.NotFound,
          instance: "/api/users/123",
        }),
      );
    });

    it("should handle NotFoundError with default message", () => {
      // Arrange
      const error = new NotFoundError("Resource");

      // Act
      filter.catch(error, mockContext);

      // Assert
      expect(mockContext.response.status).toHaveBeenCalledWith(
        StatusCode.NotFound,
      );
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Resource not found",
          status: StatusCode.NotFound,
        }),
      );
    });

    it("should include details when provided", () => {
      // Arrange
      const error = new NotFoundError("User not found");
      (error as any).details = { userId: "123", reason: "Deleted" };

      // Act
      filter.catch(error, mockContext);

      // Assert
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { userId: "123", reason: "Deleted" },
        }),
      );
    });

    it("should include timestamp", () => {
      // Arrange
      const error = new NotFoundError("User not found");

      // Act
      filter.catch(error, mockContext);

      // Assert
      const call = (mockContext.response.json as jest.Mock).mock.calls[0][0];
      expect(call.timestamp).toBeDefined();
      expect(new Date(call.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });
  });
});

