// Unit tests for: execute

import "reflect-metadata";
import { GuardExecutor } from "../guard-executor";
import { GuardRegistry } from "../guard-registry";
import type { IGuard, GuardClass, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";
import type { IGuardCache } from "../services/guard-cache.interface";
import { Logger } from "../../provider/logger/logger.provider";
import { Container } from "../../di/inversify";

class MockGuard implements IGuard {
  public priority?: number;
  public cacheable?: boolean;
  public cacheKey?: (context: GuardContext) => string;
  public shouldAllow: boolean = true;

  async canActivate(): Promise<GuardResult> {
    return this.shouldAllow ? GuardResult.allow() : GuardResult.deny();
  }
}

class MockGuardCache implements IGuardCache {
  private cache = new Map<string, Map<string, GuardResult>>();

  get(scope: string, key: string): GuardResult | null {
    return this.cache.get(scope)?.get(key) || null;
  }

  set(scope: string, key: string, result: GuardResult): void {
    if (!this.cache.has(scope)) {
      this.cache.set(scope, new Map());
    }
    this.cache.get(scope)!.set(key, result);
  }

  clearScope(scope: string): void {
    this.cache.delete(scope);
  }

  clear(): void {
    this.cache.clear();
  }
}

describe("GuardExecutor.execute() execute method", () => {
  let container: Container;
  let registry: GuardRegistry;
  let cache: IGuardCache;
  let logger: Logger;
  let executor: GuardExecutor;
  let mockContext: GuardContext;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    registry = new GuardRegistry(container, logger);
    cache = new MockGuardCache();
    executor = new GuardExecutor(registry, cache, logger);

    mockContext = {
      request: {} as any,
      response: {} as any,
      principal: {} as any,
      container: container,
      scope: {
        request: "req-123",
      } as any,
      route: {
        controller: "TestController",
        method: "testMethod",
        path: "/test",
        params: {},
        query: {},
      },
      getScoped: jest.fn(),
      getTenantId: jest.fn(),
      getRequestId: jest.fn(),
    } as GuardContext;
  });

  describe("Happy Path", () => {
    it("should return allow when no guards provided", async () => {
      // Act
      const result = await executor.execute([], mockContext);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it("should execute guards in priority order", async () => {
      // Arrange
      const guard1 = new MockGuard();
      guard1.priority = 20;
      guard1.shouldAllow = true;
      const guard2 = new MockGuard();
      guard2.priority = 10;
      guard2.shouldAllow = true;

      const executionOrder: Array<number> = [];
      guard1.canActivate = jest.fn().mockImplementation(async () => {
        executionOrder.push(20);
        return GuardResult.allow();
      });
      guard2.canActivate = jest.fn().mockImplementation(async () => {
        executionOrder.push(10);
        return GuardResult.allow();
      });

      // Act
      await executor.execute([guard1, guard2], mockContext);

      // Assert
      expect(executionOrder).toEqual([10, 20]); // Lower priority first
    });

    it("should return allow when all guards allow", async () => {
      // Arrange
      const guard1 = new MockGuard();
      guard1.shouldAllow = true;
      const guard2 = new MockGuard();
      guard2.shouldAllow = true;

      // Act
      const result = await executor.execute([guard1, guard2], mockContext);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it("should return deny when any guard denies", async () => {
      // Arrange
      const guard1 = new MockGuard();
      guard1.shouldAllow = true;
      const guard2 = new MockGuard();
      guard2.shouldAllow = false;

      // Act
      const result = await executor.execute([guard1, guard2], mockContext);

      // Assert
      expect(result.allowed).toBe(false);
    });

    it("should stop execution on first deny", async () => {
      // Arrange
      const guard1 = new MockGuard();
      guard1.priority = 10;
      guard1.shouldAllow = false;
      const guard2 = new MockGuard();
      guard2.priority = 20;
      guard2.shouldAllow = true;

      const guard2Spy = jest.spyOn(guard2, "canActivate");

      // Act
      await executor.execute([guard1, guard2], mockContext);

      // Assert
      expect(guard2Spy).not.toHaveBeenCalled();
    });

    it("should handle boolean return values", async () => {
      // Arrange
      const guard = new MockGuard();
      guard.canActivate = jest.fn().mockResolvedValue(true);

      // Act
      const result = await executor.execute([guard], mockContext);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it("should cache result for cacheable guards", async () => {
      // Arrange
      const guard = new MockGuard();
      guard.cacheable = true;
      guard.shouldAllow = true;
      guard.canActivate = jest.fn().mockResolvedValue(GuardResult.allow());

      // Act
      await executor.execute([guard], mockContext);
      await executor.execute([guard], mockContext);

      // Assert
      expect(guard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should return deny on guard error", async () => {
      // Arrange
      const guard = new MockGuard();
      guard.canActivate = jest
        .fn()
        .mockRejectedValue(new Error("Guard error"));

      // Act
      const result = await executor.execute([guard], mockContext);

      // Assert
      expect(result.allowed).toBe(false);
    });

    it("should use custom cache key when provided", async () => {
      // Arrange
      const guard = new MockGuard();
      guard.cacheable = true;
      guard.cacheKey = jest.fn().mockReturnValue("custom-key");

      // Act
      await executor.execute([guard], mockContext);

      // Assert
      expect(guard.cacheKey).toHaveBeenCalledWith(mockContext);
    });
  });
});

// End of unit tests for: execute

