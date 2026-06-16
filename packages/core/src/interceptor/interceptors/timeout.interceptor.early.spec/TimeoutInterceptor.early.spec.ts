import "reflect-metadata";
import { TimeoutInterceptor, TimeoutOptions } from "../timeout.interceptor";
import { AppError } from "../../../error/app-error";
import { StatusCode } from "../../../error/status-code";
import type {
  ExecutionContext,
  CallHandler,
} from "../../interceptor.interface";

describe("TimeoutInterceptor", () => {
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockContext = {
      getRequest: jest.fn().mockReturnValue({ method: "GET", path: "/test" }),
      getResponse: jest.fn().mockReturnValue({}),
    } as unknown as ExecutionContext;
  });

  describe("constructor", () => {
    it("should use default timeout of 30000ms", () => {
      const interceptor = new TimeoutInterceptor();
      expect((interceptor as any).timeout).toBe(30000);
    });

    it("should use default message", () => {
      const interceptor = new TimeoutInterceptor();
      expect((interceptor as any).message).toBe("Request timed out");
    });

    it("should accept custom timeout", () => {
      const interceptor = new TimeoutInterceptor({ timeout: 5000 });
      expect((interceptor as any).timeout).toBe(5000);
    });

    it("should accept custom message", () => {
      const interceptor = new TimeoutInterceptor({ message: "Custom timeout" });
      expect((interceptor as any).message).toBe("Custom timeout");
    });

    it("should accept both options", () => {
      const options: TimeoutOptions = {
        timeout: 10000,
        message: "Operation exceeded time limit",
      };
      const interceptor = new TimeoutInterceptor(options);

      expect((interceptor as any).timeout).toBe(10000);
      expect((interceptor as any).message).toBe(
        "Operation exceeded time limit",
      );
    });
  });

  describe("properties", () => {
    it("should have priority 2", () => {
      const interceptor = new TimeoutInterceptor();
      expect(interceptor.priority).toBe(2);
    });
  });

  describe("intercept()", () => {
    it("should resolve when handler completes before timeout", async () => {
      const interceptor = new TimeoutInterceptor({ timeout: 1000 });

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("success"),
      };

      const result = await interceptor.intercept(mockContext, mockNext);

      expect(result).toBe("success");
    });

    it("should reject with AppError when handler exceeds timeout", async () => {
      const interceptor = new TimeoutInterceptor({ timeout: 50 });

      const mockNext: CallHandler<string> = {
        handle: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) => setTimeout(() => resolve("late"), 200)),
          ),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toMatchObject({
        message: "Request timed out",
        statusCode: StatusCode.RequestTimeout,
      });
    });

    it("should use custom message in timeout error", async () => {
      const interceptor = new TimeoutInterceptor({
        timeout: 50,
        message: "Operation took too long",
      });

      const mockNext: CallHandler<string> = {
        handle: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) => setTimeout(() => resolve("late"), 200)),
          ),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toMatchObject({
        message: "Operation took too long",
      });
    });

    it("should propagate handler errors", async () => {
      const interceptor = new TimeoutInterceptor({ timeout: 1000 });
      const error = new Error("Handler error");

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockRejectedValue(error),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toThrow("Handler error");
    });

    it("should clear timeout when handler resolves", async () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      const interceptor = new TimeoutInterceptor({ timeout: 5000 });

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("done"),
      };

      const promise = interceptor.intercept(mockContext, mockNext);

      await promise;

      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });

    it("should clear timeout when handler rejects", async () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      const interceptor = new TimeoutInterceptor({ timeout: 5000 });

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockRejectedValue(new Error("fail")),
      };

      try {
        await interceptor.intercept(mockContext, mockNext);
      } catch {
        // Expected
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });
});
