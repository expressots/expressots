import "reflect-metadata";
import { LoggingInterceptor } from "../logging.interceptor";
import type {
  ExecutionContext,
  CallHandler,
} from "../../interceptor.interface";
import type { Logger } from "../../../provider/logger/logger.provider";

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: Logger;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as Logger;

    mockContext = {
      getRequest: jest.fn().mockReturnValue({
        method: "GET",
        path: "/api/users",
      }),
    } as unknown as ExecutionContext;

    interceptor = new LoggingInterceptor(mockLogger);
  });

  describe("properties", () => {
    it("should have priority 5", () => {
      expect(interceptor.priority).toBe(5);
    });
  });

  describe("intercept()", () => {
    it("should log request and response on success", async () => {
      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("success result"),
      };

      const result = await interceptor.intercept(mockContext, mockNext);

      expect(result).toBe("success result");
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);

      // Check request log
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("→ GET /api/users"),
        "logging-interceptor",
      );

      // Check response log with duration
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/← GET \/api\/users \(\d+ms\)/),
        "logging-interceptor",
      );
    });

    it("should log error and rethrow on failure", async () => {
      const error = new Error("Test error");
      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockRejectedValue(error),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toThrow("Test error");

      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Only request log
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("✗ GET /api/users"),
        "logging-interceptor",
      );
    });

    it("should include duration in error log", async () => {
      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockRejectedValue(new Error("Fail")),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/✗ GET \/api\/users \(\d+ms\)/),
        "logging-interceptor",
      );
    });

    it("should handle different HTTP methods", async () => {
      const postContext = {
        getRequest: jest.fn().mockReturnValue({
          method: "POST",
          path: "/api/users",
        }),
      } as unknown as ExecutionContext;

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("created"),
      };

      await interceptor.intercept(postContext, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("→ POST /api/users"),
        "logging-interceptor",
      );
    });
  });
});
