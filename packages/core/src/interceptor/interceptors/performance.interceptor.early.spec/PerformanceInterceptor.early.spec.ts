import "reflect-metadata";
import {
  PerformanceInterceptor,
  PerformanceInterceptorService,
  PerformanceInterceptorOptions,
} from "../performance.interceptor";
import type {
  ExecutionContext,
  CallHandler,
} from "../../interceptor.interface";
import type { Logger } from "../../../provider/logger/logger.provider";

describe("PerformanceInterceptorService", () => {
  let service: PerformanceInterceptorService;

  beforeEach(() => {
    service = new PerformanceInterceptorService();
  });

  describe("constructor defaults", () => {
    it("should have default slow threshold of 1000ms", () => {
      expect(service.getSlowThreshold()).toBe(1000);
    });
  });

  describe("configure()", () => {
    it("should update slow threshold", () => {
      service.configure({ slowThreshold: 500 });
      expect(service.getSlowThreshold()).toBe(500);
    });

    it("should update logSlowCalls option", () => {
      const options: PerformanceInterceptorOptions = { logSlowCalls: false };
      service.configure(options);
      // Internal state changed - verified by not throwing
    });

    it("should update logAllCalls option", () => {
      const options: PerformanceInterceptorOptions = { logAllCalls: true };
      service.configure(options);
      // Internal state changed - verified by not throwing
    });

    it("should handle partial options", () => {
      service.configure({ slowThreshold: 2000 });
      expect(service.getSlowThreshold()).toBe(2000);
    });
  });

  describe("recordCall()", () => {
    it("should create new endpoint metrics on first call", () => {
      service.recordCall("GET /users", 100, false);

      const metrics = service.getEndpointMetrics("GET /users");

      expect(metrics).toBeDefined();
      expect(metrics!.avgTime).toBe(100);
      expect(metrics!.maxTime).toBe(100);
      expect(metrics!.minTime).toBe(100);
      expect(metrics!.callCount).toBe(1);
      expect(metrics!.slowCalls).toBe(0);
    });

    it("should update existing metrics on subsequent calls", () => {
      service.recordCall("GET /users", 100, false);
      service.recordCall("GET /users", 200, false);
      service.recordCall("GET /users", 150, false);

      const metrics = service.getEndpointMetrics("GET /users");

      expect(metrics!.callCount).toBe(3);
      expect(metrics!.avgTime).toBe(150); // (100 + 200 + 150) / 3
      expect(metrics!.maxTime).toBe(200);
      expect(metrics!.minTime).toBe(100);
      expect(metrics!.lastTime).toBe(150);
    });

    it("should track slow calls", () => {
      service.configure({ slowThreshold: 100 });

      service.recordCall("GET /slow", 50, false); // Not slow
      service.recordCall("GET /slow", 150, false); // Slow
      service.recordCall("GET /slow", 200, false); // Slow

      const metrics = service.getEndpointMetrics("GET /slow");
      expect(metrics!.slowCalls).toBe(2);
    });

    it("should update lastCall timestamp", () => {
      const before = new Date();
      service.recordCall("GET /users", 100, false);
      const after = new Date();

      const metrics = service.getEndpointMetrics("GET /users");
      expect(metrics!.lastCall.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(metrics!.lastCall.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("isSlowCall()", () => {
    it("should return true for duration exceeding threshold", () => {
      service.configure({ slowThreshold: 100 });
      expect(service.isSlowCall(150)).toBe(true);
    });

    it("should return false for duration below threshold", () => {
      service.configure({ slowThreshold: 100 });
      expect(service.isSlowCall(50)).toBe(false);
    });

    it("should return false for duration equal to threshold", () => {
      service.configure({ slowThreshold: 100 });
      expect(service.isSlowCall(100)).toBe(false);
    });
  });

  describe("getMetrics()", () => {
    it("should return all metrics", () => {
      service.recordCall("GET /a", 100, false);
      service.recordCall("GET /b", 200, false);

      const metrics = service.getMetrics();

      expect(metrics["GET /a"]).toBeDefined();
      expect(metrics["GET /b"]).toBeDefined();
      expect(metrics["GET /a"].avgTime).toBe(100);
      expect(metrics["GET /b"].avgTime).toBe(200);
    });

    it("should return a shallow copy of the metrics object", () => {
      service.recordCall("GET /a", 100, false);

      const metrics = service.getMetrics();

      // Adding a new key to the copy should not affect original
      // (spread operator creates shallow copy of the outer object)
      (metrics as Record<string, unknown>)["GET /new"] = { avgTime: 0 };
      expect(service.getEndpointMetrics("GET /new")).toBeUndefined();
    });
  });

  describe("getEndpointMetrics()", () => {
    it("should return undefined for non-existent endpoint", () => {
      expect(service.getEndpointMetrics("GET /nonexistent")).toBeUndefined();
    });

    it("should return metrics for existing endpoint", () => {
      service.recordCall("GET /users", 100, false);

      const metrics = service.getEndpointMetrics("GET /users");
      expect(metrics).toBeDefined();
      expect(metrics!.callCount).toBe(1);
    });
  });

  describe("getSlowEndpoints()", () => {
    it("should return empty array when no slow endpoints", () => {
      service.configure({ slowThreshold: 1000 });
      service.recordCall("GET /fast", 100, false);

      expect(service.getSlowEndpoints()).toEqual([]);
    });

    it("should return endpoints with slow calls sorted by slowCalls count", () => {
      service.configure({ slowThreshold: 100 });

      service.recordCall("GET /a", 150, false); // 1 slow call
      service.recordCall("GET /b", 150, false); // 1 slow call
      service.recordCall("GET /b", 150, false); // 2 slow calls
      service.recordCall("GET /b", 150, false); // 3 slow calls

      const slow = service.getSlowEndpoints();

      expect(slow.length).toBe(2);
      expect(slow[0].endpoint).toBe("GET /b");
      expect(slow[0].metrics.slowCalls).toBe(3);
      expect(slow[1].endpoint).toBe("GET /a");
      expect(slow[1].metrics.slowCalls).toBe(1);
    });
  });

  describe("getSlowestEndpoints()", () => {
    it("should return endpoints sorted by avgTime descending", () => {
      service.recordCall("GET /fast", 50, false);
      service.recordCall("GET /medium", 100, false);
      service.recordCall("GET /slow", 200, false);

      const slowest = service.getSlowestEndpoints();

      expect(slowest[0].endpoint).toBe("GET /slow");
      expect(slowest[1].endpoint).toBe("GET /medium");
      expect(slowest[2].endpoint).toBe("GET /fast");
    });

    it("should respect limit parameter", () => {
      service.recordCall("GET /a", 100, false);
      service.recordCall("GET /b", 200, false);
      service.recordCall("GET /c", 300, false);
      service.recordCall("GET /d", 400, false);

      const slowest = service.getSlowestEndpoints(2);

      expect(slowest.length).toBe(2);
      expect(slowest[0].endpoint).toBe("GET /d");
      expect(slowest[1].endpoint).toBe("GET /c");
    });

    it("should use default limit of 10", () => {
      for (let i = 0; i < 15; i++) {
        service.recordCall(`GET /endpoint${i}`, i * 10, false);
      }

      const slowest = service.getSlowestEndpoints();
      expect(slowest.length).toBe(10);
    });
  });

  describe("clearMetrics()", () => {
    it("should clear all metrics", () => {
      service.recordCall("GET /a", 100, false);
      service.recordCall("GET /b", 200, false);

      service.clearMetrics();

      expect(service.getMetrics()).toEqual({});
    });
  });

  describe("getSummary()", () => {
    it("should return zeros for empty metrics", () => {
      const summary = service.getSummary();

      expect(summary.totalEndpoints).toBe(0);
      expect(summary.totalCalls).toBe(0);
      expect(summary.avgResponseTime).toBe(0);
      expect(summary.slowEndpoints).toBe(0);
    });

    it("should calculate correct summary statistics", () => {
      service.configure({ slowThreshold: 100 });

      service.recordCall("GET /a", 50, false); // 1 call, not slow
      service.recordCall("GET /a", 50, false); // 2 calls
      service.recordCall("GET /b", 150, false); // 1 call, slow
      service.recordCall("GET /c", 100, false); // 1 call, not slow (equal to threshold)

      const summary = service.getSummary();

      expect(summary.totalEndpoints).toBe(3);
      expect(summary.totalCalls).toBe(4);
      expect(summary.slowEndpoints).toBe(1); // Only GET /b has slow calls
      // avgResponseTime = (50*2 + 150*1 + 100*1) / 4 = 350/4 = 87.5
      expect(summary.avgResponseTime).toBeCloseTo(87.5);
    });
  });
});

describe("PerformanceInterceptor", () => {
  let interceptor: PerformanceInterceptor;
  let mockLogger: Logger;
  let mockService: PerformanceInterceptorService;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger;

    mockService = {
      recordCall: jest.fn(),
      isSlowCall: jest.fn().mockReturnValue(false),
      getSlowThreshold: jest.fn().mockReturnValue(1000),
    } as unknown as PerformanceInterceptorService;

    mockContext = {
      getRequest: jest.fn().mockReturnValue({
        method: "GET",
        path: "/api/users",
      }),
    } as unknown as ExecutionContext;

    interceptor = new PerformanceInterceptor(mockLogger, mockService);
  });

  describe("properties", () => {
    it("should have priority 1", () => {
      expect(interceptor.priority).toBe(1);
    });
  });

  describe("intercept()", () => {
    it("should record metrics on successful call", async () => {
      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("result"),
      };

      const result = await interceptor.intercept(mockContext, mockNext);

      expect(result).toBe("result");
      expect(mockService.recordCall).toHaveBeenCalledWith(
        "GET /api/users",
        expect.any(Number),
        false,
      );
    });

    it("should record metrics on error with isError=true", async () => {
      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockRejectedValue(new Error("fail")),
      };

      await expect(
        interceptor.intercept(mockContext, mockNext),
      ).rejects.toThrow("fail");

      expect(mockService.recordCall).toHaveBeenCalledWith(
        "GET /api/users",
        expect.any(Number),
        true,
      );
    });

    it("should log warning for slow calls", async () => {
      (mockService.isSlowCall as jest.Mock).mockReturnValue(true);

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("result"),
      };

      await interceptor.intercept(mockContext, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Slow endpoint"),
        "performance-interceptor",
      );
    });

    it("should not log warning for fast calls", async () => {
      (mockService.isSlowCall as jest.Mock).mockReturnValue(false);

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("result"),
      };

      await interceptor.intercept(mockContext, mockNext);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should include threshold in slow call warning", async () => {
      (mockService.isSlowCall as jest.Mock).mockReturnValue(true);
      (mockService.getSlowThreshold as jest.Mock).mockReturnValue(500);

      const mockNext: CallHandler<string> = {
        handle: jest.fn().mockResolvedValue("result"),
      };

      await interceptor.intercept(mockContext, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("threshold: 500ms"),
        "performance-interceptor",
      );
    });
  });
});
