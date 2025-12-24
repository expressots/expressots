/**
 * Tests for LifecycleRegistry
 */

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { injectable } from "../../di/inversify";
import { LifecycleRegistry } from "../lifecycle-registry";
import { IBootstrap, IShutdown } from "../lifecycle.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

// Track calls for testing
const callTracker: string[] = [];
let signalReceived: NodeJS.Signals | undefined;

// Pre-define test classes outside of tests to ensure consistent references
// All classes must be @injectable for container resolution
@injectable()
class TestBootstrapService implements IBootstrap {
  bootstrap(): void {
    callTracker.push("TestBootstrapService.bootstrap");
  }
}

@injectable()
class TestShutdownService implements IShutdown {
  shutdown(signal?: NodeJS.Signals): void {
    callTracker.push("TestShutdownService.shutdown");
    signalReceived = signal;
  }
}

@injectable()
class TestFullService implements IBootstrap, IShutdown {
  bootstrap(): void {
    callTracker.push("TestFullService.bootstrap");
  }
  shutdown(): void {
    callTracker.push("TestFullService.shutdown");
  }
}

@injectable()
class TestAsyncBootstrap implements IBootstrap {
  async bootstrap(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    callTracker.push("TestAsyncBootstrap.bootstrap");
  }
}

@injectable()
class TestAsyncShutdown implements IShutdown {
  async shutdown(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    callTracker.push("TestAsyncShutdown.shutdown");
  }
}

@injectable()
class TestFailingBootstrap implements IBootstrap {
  bootstrap(): void {
    callTracker.push("TestFailingBootstrap.bootstrap");
    throw new Error("Bootstrap failed");
  }
}

@injectable()
class TestFailingShutdown implements IShutdown {
  shutdown(): void {
    callTracker.push("TestFailingShutdown.shutdown");
    throw new Error("Shutdown failed");
  }
}

@injectable()
class TestRegularService {
  doSomething(): void {
    callTracker.push("TestRegularService.doSomething");
  }
}

// Helper to register provider metadata
function registerProviderMetadata(target: Function): void {
  const currentMetadata =
    Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
  const newMetadata = [
    {
      implementationType: target,
      constraint: (bind: Function, bindTarget: Function) =>
        bind(target).to(bindTarget),
    },
    ...currentMetadata,
  ];
  Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);
}

function clearProviderMetadata(): void {
  Reflect.defineMetadata(METADATA_KEY.provide, [], Reflect);
}

describe("LifecycleRegistry", () => {
  let container: Container;
  let registry: LifecycleRegistry;

  beforeEach(() => {
    clearProviderMetadata();
    callTracker.length = 0;
    signalReceived = undefined;
    container = new Container();
    registry = new LifecycleRegistry(container);
  });

  afterEach(() => {
    clearProviderMetadata();
    registry.clear();
  });

  describe("discover", () => {
    it("should discover providers implementing IBootstrap", () => {
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();

      registry.discover();

      expect(registry.getBootstrapCount()).toBe(1);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should discover providers implementing IShutdown", () => {
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf();

      registry.discover();

      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(1);
    });

    it("should discover providers implementing both IBootstrap and IShutdown", () => {
      registerProviderMetadata(TestFullService);
      container.bind(TestFullService).toSelf();

      registry.discover();

      expect(registry.getBootstrapCount()).toBe(1);
      expect(registry.getShutdownCount()).toBe(1);
    });

    it("should not discover providers without lifecycle methods", () => {
      registerProviderMetadata(TestRegularService);
      container.bind(TestRegularService).toSelf();

      registry.discover();

      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should only discover once", () => {
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();

      registry.discover();
      registry.discover(); // Second call should be no-op

      expect(registry.getBootstrapCount()).toBe(1);
    });
  });

  describe("executeBootstrap", () => {
    it("should call bootstrap on discovered providers", async () => {
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf().inSingletonScope();

      registry.discover();
      await registry.executeBootstrap();

      expect(callTracker).toContain("TestBootstrapService.bootstrap");
    });

    it("should handle async bootstrap methods", async () => {
      registerProviderMetadata(TestAsyncBootstrap);
      container.bind(TestAsyncBootstrap).toSelf().inSingletonScope();

      registry.discover();
      await registry.executeBootstrap();

      expect(callTracker).toContain("TestAsyncBootstrap.bootstrap");
    });

    it("should do nothing if no bootstrap providers", async () => {
      registry.discover();
      await expect(registry.executeBootstrap()).resolves.toBeUndefined();
    });

    it("should throw if bootstrap fails", async () => {
      registerProviderMetadata(TestFailingBootstrap);
      container.bind(TestFailingBootstrap).toSelf().inSingletonScope();

      registry.discover();
      await expect(registry.executeBootstrap()).rejects.toThrow(
        "Bootstrap failed",
      );
      expect(callTracker).toContain("TestFailingBootstrap.bootstrap");
    });
  });

  describe("executeShutdown", () => {
    it("should call shutdown on discovered providers", async () => {
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf().inSingletonScope();

      registry.discover();

      // Verify discovery worked
      expect(registry.getShutdownCount()).toBe(1);

      // Verify container can get the instance
      const instance = container.get(TestShutdownService);
      expect(instance).toBeInstanceOf(TestShutdownService);

      // Verify instance has shutdown method
      expect(typeof instance.shutdown).toBe("function");

      // Call directly to verify it works
      instance.shutdown();
      expect(callTracker).toContain("TestShutdownService.shutdown");

      // Clear tracker and test via registry
      callTracker.length = 0;
      await registry.executeShutdown();

      expect(callTracker).toContain("TestShutdownService.shutdown");
    });

    it("should pass signal to shutdown methods", async () => {
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf().inSingletonScope();

      registry.discover();
      expect(registry.getShutdownCount()).toBe(1);

      // Pre-instantiate to ensure the singleton is created
      container.get(TestShutdownService);

      await registry.executeShutdown("SIGTERM");

      expect(signalReceived).toBe("SIGTERM");
    });

    it("should handle async shutdown methods", async () => {
      registerProviderMetadata(TestAsyncShutdown);
      container.bind(TestAsyncShutdown).toSelf().inSingletonScope();

      registry.discover();

      // Pre-instantiate to ensure the singleton is created
      container.get(TestAsyncShutdown);

      await registry.executeShutdown();

      expect(callTracker).toContain("TestAsyncShutdown.shutdown");
    });

    it("should continue shutdown even if one provider fails", async () => {
      registerProviderMetadata(TestFailingShutdown);
      registerProviderMetadata(TestShutdownService);
      container.bind(TestFailingShutdown).toSelf().inSingletonScope();
      container.bind(TestShutdownService).toSelf().inSingletonScope();

      registry.discover();

      // Pre-instantiate to ensure the singletons are created
      container.get(TestFailingShutdown);
      container.get(TestShutdownService);

      // Should not throw, just log error
      await registry.executeShutdown();

      // Both should have been called
      expect(callTracker).toContain("TestFailingShutdown.shutdown");
      expect(callTracker).toContain("TestShutdownService.shutdown");
    });

    it("should do nothing if no shutdown providers", async () => {
      registry.discover();
      await expect(registry.executeShutdown()).resolves.toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all discovered providers", () => {
      registerProviderMetadata(TestFullService);
      container.bind(TestFullService).toSelf();

      registry.discover();
      expect(registry.getBootstrapCount()).toBe(1);
      expect(registry.getShutdownCount()).toBe(1);

      registry.clear();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should allow rediscovery after clear", () => {
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();

      registry.discover();
      registry.clear();
      registry.discover();

      expect(registry.getBootstrapCount()).toBe(1);
    });
  });
});
