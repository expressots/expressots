import {
  isConditionalInterceptor,
  isComposedInterceptor,
  ConditionalInterceptor,
  ComposedInterceptor,
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";

// Mock interceptor class for testing
class MockInterceptor implements IInterceptor {
  async intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    return next.handle();
  }
}

describe("IInterceptor Interface", () => {
  describe("isConditionalInterceptor", () => {
    it("should return true for valid conditional interceptor", () => {
      const conditional: ConditionalInterceptor = {
        __isConditional: true,
        condition: () => true,
        interceptor: MockInterceptor,
        type: "when",
      };

      expect(isConditionalInterceptor(conditional)).toBe(true);
    });

    it("should return false for non-conditional object", () => {
      expect(isConditionalInterceptor({})).toBe(false);
      expect(isConditionalInterceptor(null)).toBe(false);
      expect(isConditionalInterceptor(undefined)).toBe(false);
      expect(isConditionalInterceptor("string")).toBe(false);
      expect(isConditionalInterceptor(123)).toBe(false);
    });

    it("should return false for object with __isConditional = false", () => {
      const notConditional = {
        __isConditional: false,
      };

      expect(isConditionalInterceptor(notConditional)).toBe(false);
    });
  });

  describe("isComposedInterceptor", () => {
    it("should return true for valid composed interceptor", () => {
      const composed: ComposedInterceptor = {
        __isComposed: true,
        interceptors: [],
        mode: "pipe",
      };

      expect(isComposedInterceptor(composed)).toBe(true);
    });

    it("should return true for combine mode", () => {
      const composed: ComposedInterceptor = {
        __isComposed: true,
        interceptors: [],
        mode: "combine",
      };

      expect(isComposedInterceptor(composed)).toBe(true);
    });

    it("should return false for non-composed object", () => {
      expect(isComposedInterceptor({})).toBe(false);
      expect(isComposedInterceptor(null)).toBe(false);
      expect(isComposedInterceptor(undefined)).toBe(false);
    });
  });
});
