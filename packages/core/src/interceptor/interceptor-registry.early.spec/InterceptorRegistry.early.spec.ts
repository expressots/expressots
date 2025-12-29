import "reflect-metadata";
import { InterceptorRegistry } from "../interceptor-registry";
import { INTERCEPTOR_METADATA_KEY } from "../interceptor-constants";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";
import type { Container, interfaces } from "../../di/inversify";
import type { Logger } from "../../provider/logger/logger.provider";

// Mock interceptor class
class MockInterceptor implements IInterceptor {
  priority = 10;
  async intercept<T>(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    return next.handle();
  }
}

// Another mock interceptor
class AnotherInterceptor implements IInterceptor {
  async intercept<T>(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    return next.handle();
  }
}

describe("InterceptorRegistry", () => {
  let registry: InterceptorRegistry;
  let mockContainer: Container;
  let mockLogger: Logger;

  beforeEach(() => {
    // Clear global metadata
    Reflect.deleteMetadata(INTERCEPTOR_METADATA_KEY.interceptor, Reflect);

    mockContainer = {
      isBound: jest.fn().mockReturnValue(false),
      get: jest.fn(),
    } as unknown as Container;

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    registry = new InterceptorRegistry(mockContainer, mockLogger);
  });

  describe("initialize()", () => {
    it("should only initialize once", () => {
      registry.initialize();
      registry.initialize(); // Second call should be no-op

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("InterceptorRegistry initialized"),
        "interceptor-registry",
      );
    });

    it("should discover interceptors from global metadata", () => {
      // Set up global metadata
      Reflect.defineMetadata(
        INTERCEPTOR_METADATA_KEY.interceptor,
        [{ interceptor: MockInterceptor, priority: 10 }],
        Reflect,
      );

      // Mock container to return the interceptor
      (mockContainer.isBound as jest.Mock).mockReturnValue(true);
      (mockContainer.get as jest.Mock).mockReturnValue(new MockInterceptor());

      registry.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Registered interceptor: MockInterceptor"),
        "interceptor-registry",
      );
    });

    it("should set priority from metadata if not defined on instance", () => {
      const instanceWithoutPriority: IInterceptor = {
        intercept: jest.fn(),
      };

      Reflect.defineMetadata(
        INTERCEPTOR_METADATA_KEY.interceptor,
        [{ interceptor: MockInterceptor, priority: 25 }],
        Reflect,
      );

      (mockContainer.isBound as jest.Mock).mockReturnValue(true);
      (mockContainer.get as jest.Mock).mockReturnValue(instanceWithoutPriority);

      registry.initialize();

      expect(instanceWithoutPriority.priority).toBe(25);
    });

    it("should warn when interceptor resolution fails", () => {
      Reflect.defineMetadata(
        INTERCEPTOR_METADATA_KEY.interceptor,
        [{ interceptor: MockInterceptor, priority: 10 }],
        Reflect,
      );

      (mockContainer.isBound as jest.Mock).mockReturnValue(true);
      (mockContainer.get as jest.Mock).mockImplementation(() => {
        throw new Error("Resolution failed");
      });

      registry.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve interceptor"),
        "interceptor-registry",
      );
    });
  });

  describe("get()", () => {
    it("should return instance directly if not a function", () => {
      const instance = new MockInterceptor();
      const result = registry.get(instance);

      expect(result).toBe(instance);
    });

    it("should return cached interceptor if already in registry", () => {
      const instance = new MockInterceptor();
      registry.register(MockInterceptor, instance);

      const result = registry.get(MockInterceptor);

      expect(result).toBe(instance);
    });

    it("should resolve from container if bound", () => {
      const instance = new MockInterceptor();
      (mockContainer.isBound as jest.Mock).mockReturnValue(true);
      (mockContainer.get as jest.Mock).mockReturnValue(instance);

      const result = registry.get(MockInterceptor);

      expect(result).toBe(instance);
      expect(mockContainer.get).toHaveBeenCalled();
    });

    it("should create new instance if not in container", () => {
      (mockContainer.isBound as jest.Mock).mockReturnValue(false);

      const result = registry.get(MockInterceptor);

      expect(result).toBeInstanceOf(MockInterceptor);
    });

    it("should throw error if instance creation fails", () => {
      // Create a class that throws on construction
      class FailingInterceptor implements IInterceptor {
        constructor() {
          throw new Error("Construction failed");
        }
        async intercept<T>(
          _context: ExecutionContext,
          next: CallHandler<T>,
        ): Promise<T> {
          return next.handle();
        }
      }

      (mockContainer.isBound as jest.Mock).mockReturnValue(false);

      expect(() => registry.get(FailingInterceptor)).toThrow(
        "Cannot resolve interceptor: FailingInterceptor",
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log debug when container resolution fails but instance can be created", () => {
      (mockContainer.isBound as jest.Mock).mockImplementation(() => {
        throw new Error("Bind check failed");
      });

      const result = registry.get(MockInterceptor);

      expect(result).toBeInstanceOf(MockInterceptor);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("not bound, creating new instance"),
        "interceptor-registry",
      );
    });
  });

  describe("getAll()", () => {
    it("should return all registered interceptors sorted by priority", () => {
      const high = new MockInterceptor();
      high.priority = 1;

      const low: IInterceptor = { intercept: jest.fn(), priority: 100 };
      const medium: IInterceptor = { intercept: jest.fn(), priority: 50 };

      registry.register(MockInterceptor, high);
      registry.register(AnotherInterceptor, medium);
      registry.register({} as NewableFunction, low);

      const all = registry.getAll();

      expect(all.length).toBe(3);
      expect(all[0].priority).toBe(1);
      expect(all[1].priority).toBe(50);
      expect(all[2].priority).toBe(100);
    });

    it("should use default priority 100 for undefined priorities", () => {
      const withPriority: IInterceptor = { intercept: jest.fn(), priority: 50 };
      const withoutPriority: IInterceptor = { intercept: jest.fn() };

      registry.register(MockInterceptor, withPriority);
      registry.register(AnotherInterceptor, withoutPriority);

      const all = registry.getAll();

      expect(all[0].priority).toBe(50);
      expect(all[1].priority).toBeUndefined(); // But sorted as 100
    });
  });

  describe("register()", () => {
    it("should register an interceptor instance", () => {
      const instance = new MockInterceptor();
      registry.register(MockInterceptor, instance);

      expect(registry.has(MockInterceptor)).toBe(true);
    });
  });

  describe("has()", () => {
    it("should return true for registered interceptor", () => {
      registry.register(MockInterceptor, new MockInterceptor());

      expect(registry.has(MockInterceptor)).toBe(true);
    });

    it("should return true for instance (non-function)", () => {
      const instance = new MockInterceptor();

      expect(registry.has(instance)).toBe(true);
    });

    it("should return true if bound in container", () => {
      (mockContainer.isBound as jest.Mock).mockReturnValue(true);

      expect(registry.has(MockInterceptor)).toBe(true);
    });

    it("should return false if not registered and not in container", () => {
      (mockContainer.isBound as jest.Mock).mockReturnValue(false);

      expect(registry.has(MockInterceptor)).toBe(false);
    });
  });

  describe("clear()", () => {
    it("should clear all registered interceptors and reset initialized flag", () => {
      registry.register(MockInterceptor, new MockInterceptor());
      registry.initialize();

      registry.clear();

      expect(registry.getAll().length).toBe(0);
    });
  });
});
