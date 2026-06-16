import "reflect-metadata";
import { UseInterceptors, Interceptor } from "../interceptor-decorators";
import { INTERCEPTOR_METADATA_KEY } from "../interceptor-constants";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";

class MockInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

class AnotherMockInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

describe("@UseInterceptors Decorator", () => {
  beforeEach(() => {
    // Clear metadata between tests
    Reflect.deleteMetadata(INTERCEPTOR_METADATA_KEY.interceptor, Reflect);
  });

  describe("Controller Level", () => {
    it("should set controller-level interceptors metadata", () => {
      @UseInterceptors(MockInterceptor)
      class TestController {}

      const interceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.controllerInterceptors,
        TestController,
      );

      expect(interceptors).toBeDefined();
      expect(interceptors).toHaveLength(1);
      expect(interceptors[0]).toBe(MockInterceptor);
    });

    it("should accumulate multiple interceptors", () => {
      @UseInterceptors(MockInterceptor, AnotherMockInterceptor)
      class TestController {}

      const interceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.controllerInterceptors,
        TestController,
      );

      expect(interceptors).toHaveLength(2);
      expect(interceptors[0]).toBe(MockInterceptor);
      expect(interceptors[1]).toBe(AnotherMockInterceptor);
    });
  });

  describe("Method Level", () => {
    it("should set method-level interceptors metadata", () => {
      class TestController {
        @UseInterceptors(MockInterceptor)
        testMethod() {}
      }

      const interceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.methodInterceptors,
        TestController,
        "testMethod",
      );

      expect(interceptors).toBeDefined();
      expect(interceptors).toHaveLength(1);
      expect(interceptors[0]).toBe(MockInterceptor);
    });

    it("should accumulate method interceptors from multiple decorators", () => {
      class TestController {
        @UseInterceptors(AnotherMockInterceptor)
        @UseInterceptors(MockInterceptor)
        testMethod() {}
      }

      const interceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.methodInterceptors,
        TestController,
        "testMethod",
      );

      expect(interceptors).toHaveLength(2);
    });
  });

  describe("Combined Controller and Method Level", () => {
    it("should set separate metadata for controller and method", () => {
      @UseInterceptors(MockInterceptor)
      class TestController {
        @UseInterceptors(AnotherMockInterceptor)
        testMethod() {}
      }

      const controllerInterceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.controllerInterceptors,
        TestController,
      );

      const methodInterceptors = Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.methodInterceptors,
        TestController,
        "testMethod",
      );

      expect(controllerInterceptors).toHaveLength(1);
      expect(controllerInterceptors[0]).toBe(MockInterceptor);

      expect(methodInterceptors).toHaveLength(1);
      expect(methodInterceptors[0]).toBe(AnotherMockInterceptor);
    });
  });
});

describe("@Interceptor Decorator", () => {
  beforeEach(() => {
    Reflect.deleteMetadata(INTERCEPTOR_METADATA_KEY.interceptor, Reflect);
  });

  it("should set default priority of 100", () => {
    @Interceptor()
    class TestInterceptor {}

    const metadata = Reflect.getMetadata(
      INTERCEPTOR_METADATA_KEY.interceptor,
      TestInterceptor,
    );

    expect(metadata).toBeDefined();
    expect(metadata.priority).toBe(100);
  });

  it("should set custom priority", () => {
    @Interceptor({ priority: 1 })
    class TestInterceptor {}

    const metadata = Reflect.getMetadata(
      INTERCEPTOR_METADATA_KEY.interceptor,
      TestInterceptor,
    );

    expect(metadata.priority).toBe(1);
  });

  it("should register in global registry", () => {
    @Interceptor()
    class TestInterceptor {}

    const globalInterceptors = Reflect.getMetadata(
      INTERCEPTOR_METADATA_KEY.interceptor,
      Reflect,
    );

    expect(globalInterceptors).toBeDefined();
    expect(globalInterceptors.length).toBeGreaterThan(0);
    expect(
      globalInterceptors.some(
        (m: { interceptor: unknown }) => m.interceptor === TestInterceptor,
      ),
    ).toBe(true);
  });
});
