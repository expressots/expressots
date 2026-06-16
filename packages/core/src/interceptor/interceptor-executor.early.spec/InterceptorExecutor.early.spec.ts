import "reflect-metadata";
import { InterceptorExecutor } from "../interceptor-executor";
import { InterceptorRegistry } from "../interceptor-registry";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";
import type { Logger } from "../../provider/logger/logger.provider";

// Mock interceptor implementation
class MockInterceptor implements IInterceptor {
  priority = 10;
  interceptCalled = false;

  async intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    this.interceptCalled = true;
    return next.handle();
  }
}

// Interceptor that transforms the result
class TransformInterceptor implements IInterceptor {
  priority = 20;

  async intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    const result = await next.handle();
    return { transformed: true, data: result } as unknown as T;
  }
}

// Interceptor that throws an error
class ErrorInterceptor implements IInterceptor {
  priority = 5;

  async intercept<T>(
    _context: ExecutionContext,
    _next: CallHandler<T>,
  ): Promise<T> {
    throw new Error("Interceptor error");
  }
}

describe("InterceptorExecutor", () => {
  let executor: InterceptorExecutor;
  let mockRegistry: InterceptorRegistry;
  let mockLogger: Logger;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockRegistry = {
      get: jest.fn((interceptor) => {
        if (typeof interceptor === "function") {
          return new interceptor();
        }
        return interceptor;
      }),
    } as unknown as InterceptorRegistry;

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    mockContext = {
      getRequest: jest.fn().mockReturnValue({ method: "GET", path: "/test" }),
      getResponse: jest.fn().mockReturnValue({}),
    } as unknown as ExecutionContext;

    executor = new InterceptorExecutor(mockRegistry, mockLogger);
  });

  describe("execute()", () => {
    it("should execute handler directly when no interceptors", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      const result = await executor.execute([], mockContext, handler);

      expect(result).toBe("result");
      expect(handler).toHaveBeenCalled();
    });

    it("should execute single interceptor", async () => {
      const interceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(interceptor);

      const handler = jest.fn().mockResolvedValue("result");
      const result = await executor.execute(
        [MockInterceptor],
        mockContext,
        handler,
      );

      expect(result).toBe("result");
      expect(interceptor.interceptCalled).toBe(true);
    });

    it("should execute interceptors in priority order", async () => {
      const order: number[] = [];

      const lowPriority: IInterceptor = {
        priority: 100,
        intercept: async <T>(_ctx: ExecutionContext, next: CallHandler<T>) => {
          order.push(100);
          return next.handle();
        },
      };

      const highPriority: IInterceptor = {
        priority: 1,
        intercept: async <T>(_ctx: ExecutionContext, next: CallHandler<T>) => {
          order.push(1);
          return next.handle();
        },
      };

      const mediumPriority: IInterceptor = {
        priority: 50,
        intercept: async <T>(_ctx: ExecutionContext, next: CallHandler<T>) => {
          order.push(50);
          return next.handle();
        },
      };

      (mockRegistry.get as jest.Mock)
        .mockReturnValueOnce(lowPriority)
        .mockReturnValueOnce(highPriority)
        .mockReturnValueOnce(mediumPriority);

      await executor.execute(
        [lowPriority, highPriority, mediumPriority],
        mockContext,
        async () => "done",
      );

      // Should execute in priority order: 1, 50, 100
      expect(order).toEqual([1, 50, 100]);
    });

    it("should allow interceptor to transform result", async () => {
      const transformInterceptor = new TransformInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(transformInterceptor);

      const result = await executor.execute(
        [TransformInterceptor],
        mockContext,
        async () => ({ original: true }),
      );

      expect(result).toEqual({ transformed: true, data: { original: true } });
    });

    it("should log error and rethrow when interceptor throws", async () => {
      const errorInterceptor = new ErrorInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(errorInterceptor);

      await expect(
        executor.execute([ErrorInterceptor], mockContext, async () => "result"),
      ).rejects.toThrow("Interceptor error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("threw an error"),
        "interceptor-executor",
      );
    });

    it("should return handler result when resolved interceptors is empty", async () => {
      // Simulate conditional interceptor that evaluates to false
      const conditional = {
        __isConditional: true,
        type: "when" as const,
        condition: () => false,
        interceptor: MockInterceptor,
      };

      const result = await executor.execute(
        [conditional],
        mockContext,
        async () => "direct result",
      );

      expect(result).toBe("direct result");
    });
  });

  describe("resolveInterceptors with conditional", () => {
    it("should include conditional interceptor when condition is true (when)", async () => {
      const conditional = {
        __isConditional: true,
        type: "when" as const,
        condition: () => true,
        interceptor: MockInterceptor,
      };

      const mockInterceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(mockInterceptor);

      await executor.execute([conditional], mockContext, async () => "result");

      expect(mockInterceptor.interceptCalled).toBe(true);
    });

    it("should exclude conditional interceptor when condition is false (when)", async () => {
      const conditional = {
        __isConditional: true,
        type: "when" as const,
        condition: () => false,
        interceptor: MockInterceptor,
      };

      const handler = jest.fn().mockResolvedValue("result");
      const result = await executor.execute(
        [conditional],
        mockContext,
        handler,
      );

      expect(result).toBe("result");
      expect(mockRegistry.get).not.toHaveBeenCalled();
    });

    it("should include conditional interceptor when condition is false (unless)", async () => {
      const conditional = {
        __isConditional: true,
        type: "unless" as const,
        condition: () => false,
        interceptor: MockInterceptor,
      };

      const mockInterceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(mockInterceptor);

      await executor.execute([conditional], mockContext, async () => "result");

      expect(mockInterceptor.interceptCalled).toBe(true);
    });

    it("should exclude conditional interceptor when condition is true (unless)", async () => {
      const conditional = {
        __isConditional: true,
        type: "unless" as const,
        condition: () => true,
        interceptor: MockInterceptor,
      };

      const handler = jest.fn().mockResolvedValue("result");
      await executor.execute([conditional], mockContext, handler);

      expect(mockRegistry.get).not.toHaveBeenCalled();
    });

    it("should handle async condition", async () => {
      const conditional = {
        __isConditional: true,
        type: "when" as const,
        condition: async () => true,
        interceptor: MockInterceptor,
      };

      const mockInterceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(mockInterceptor);

      await executor.execute([conditional], mockContext, async () => "result");

      expect(mockInterceptor.interceptCalled).toBe(true);
    });

    it("should not run interceptor when condition throws error", async () => {
      const conditional = {
        __isConditional: true,
        type: "when" as const,
        condition: () => {
          throw new Error("Condition error");
        },
        interceptor: MockInterceptor,
      };

      const handler = jest.fn().mockResolvedValue("result");
      await executor.execute([conditional], mockContext, handler);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Conditional interceptor evaluation failed"),
        "interceptor-executor",
      );
      expect(mockRegistry.get).not.toHaveBeenCalled();
    });
  });

  describe("resolveInterceptors with composed", () => {
    it("should flatten composed interceptors", async () => {
      const composed = {
        __isComposed: true,
        mode: "pipe" as const,
        interceptors: [MockInterceptor, TransformInterceptor],
      };

      const mockInst = new MockInterceptor();
      const transformInst = new TransformInterceptor();
      (mockRegistry.get as jest.Mock)
        .mockReturnValueOnce(mockInst)
        .mockReturnValueOnce(transformInst);

      await executor.execute([composed], mockContext, async () => ({
        data: "test",
      }));

      expect(mockRegistry.get).toHaveBeenCalledTimes(2);
      expect(mockInst.interceptCalled).toBe(true);
    });
  });

  describe("regular interceptor resolution", () => {
    it("should resolve regular interceptor class", async () => {
      const interceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(interceptor);

      await executor.execute(
        [MockInterceptor],
        mockContext,
        async () => "result",
      );

      expect(mockRegistry.get).toHaveBeenCalledWith(MockInterceptor);
      expect(interceptor.interceptCalled).toBe(true);
    });

    it("should resolve interceptor instance directly", async () => {
      const interceptor = new MockInterceptor();
      (mockRegistry.get as jest.Mock).mockReturnValue(interceptor);

      await executor.execute([interceptor], mockContext, async () => "result");

      expect(interceptor.interceptCalled).toBe(true);
    });
  });
});
