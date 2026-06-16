import "reflect-metadata";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";
import { InterceptorExecutor } from "../interceptor-executor";
import { InterceptorRegistry } from "../interceptor-registry";
import { Logger } from "../../provider/logger/logger.provider";
import { Container } from "../../di/inversify";

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

// Mock execution context
const createMockContext = (): ExecutionContext => ({
  getRequest: () =>
    ({ method: "GET", path: "/test", params: {}, query: {} }) as any,
  getResponse: () => ({}) as any,
  getContainer: () => ({}) as any,
  getScoped: jest.fn(),
  getClass: () => class TestController {},
  getHandler: () => "testMethod",
  getRoute: () => ({ path: "/test", method: "GET", params: {}, query: {} }),
  getData: jest.fn(),
  setData: jest.fn(),
});

describe("InterceptorExecutor", () => {
  let executor: InterceptorExecutor;
  let registry: InterceptorRegistry;
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(Logger).toConstantValue(mockLogger);
    container.bind(Container).toConstantValue(container);

    registry = new InterceptorRegistry(container, mockLogger);
    executor = new InterceptorExecutor(registry, mockLogger);

    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should execute handler directly when no interceptors", async () => {
      const handler = jest.fn().mockResolvedValue("result");
      const context = createMockContext();

      const result = await executor.execute([], context, handler);

      expect(result).toBe("result");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should execute single interceptor", async () => {
      const beforeSpy = jest.fn();
      const afterSpy = jest.fn();

      class TestInterceptor implements IInterceptor {
        async intercept(_context: ExecutionContext, next: CallHandler) {
          beforeSpy();
          const result = await next.handle();
          afterSpy();
          return result;
        }
      }

      const interceptor = new TestInterceptor();
      registry.register(interceptor, interceptor);

      const handler = jest.fn().mockResolvedValue("result");
      const context = createMockContext();

      const result = await executor.execute([interceptor], context, handler);

      expect(result).toBe("result");
      expect(beforeSpy).toHaveBeenCalledTimes(1);
      expect(afterSpy).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should execute interceptors in priority order (lower first)", async () => {
      const order: number[] = [];

      class Interceptor1 implements IInterceptor {
        priority = 1;
        async intercept(_context: ExecutionContext, next: CallHandler) {
          order.push(1);
          const result = await next.handle();
          order.push(-1);
          return result;
        }
      }

      class Interceptor2 implements IInterceptor {
        priority = 2;
        async intercept(_context: ExecutionContext, next: CallHandler) {
          order.push(2);
          const result = await next.handle();
          order.push(-2);
          return result;
        }
      }

      const interceptor1 = new Interceptor1();
      const interceptor2 = new Interceptor2();

      registry.register(interceptor1, interceptor1);
      registry.register(interceptor2, interceptor2);

      const handler = jest.fn().mockResolvedValue("result");
      const context = createMockContext();

      // Pass in wrong order - should be sorted by priority
      await executor.execute([interceptor2, interceptor1], context, handler);

      // Priority 1 should run first (outermost), then priority 2
      expect(order).toEqual([1, 2, -2, -1]);
    });

    it("should allow interceptor to transform result", async () => {
      class TransformInterceptor implements IInterceptor {
        async intercept(_context: ExecutionContext, next: CallHandler) {
          const result = await next.handle();
          return { transformed: true, original: result };
        }
      }

      const interceptor = new TransformInterceptor();
      registry.register(interceptor, interceptor);

      const handler = jest.fn().mockResolvedValue("original");
      const context = createMockContext();

      const result = await executor.execute([interceptor], context, handler);

      expect(result).toEqual({ transformed: true, original: "original" });
    });

    it("should propagate errors from handler", async () => {
      class PassthroughInterceptor implements IInterceptor {
        async intercept(_context: ExecutionContext, next: CallHandler) {
          return next.handle();
        }
      }

      const interceptor = new PassthroughInterceptor();
      registry.register(interceptor, interceptor);

      const error = new Error("Handler error");
      const handler = jest.fn().mockRejectedValue(error);
      const context = createMockContext();

      await expect(
        executor.execute([interceptor], context, handler),
      ).rejects.toThrow("Handler error");
    });

    it("should propagate errors from interceptor", async () => {
      class ErrorInterceptor implements IInterceptor {
        async intercept(_context: ExecutionContext, _next: CallHandler) {
          throw new Error("Interceptor error");
        }
      }

      const interceptor = new ErrorInterceptor();
      registry.register(interceptor, interceptor);

      const handler = jest.fn().mockResolvedValue("result");
      const context = createMockContext();

      await expect(
        executor.execute([interceptor], context, handler),
      ).rejects.toThrow("Interceptor error");

      // Handler should not be called if interceptor throws before
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
