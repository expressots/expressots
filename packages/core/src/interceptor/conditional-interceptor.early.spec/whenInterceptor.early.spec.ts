import { whenInterceptor, unlessInterceptor } from "../conditional-interceptor";
import { isConditionalInterceptor } from "../interceptor.interface";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";

class MockInterceptor implements IInterceptor {
  async intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

describe("whenInterceptor", () => {
  it("should create a conditional interceptor with type 'when'", () => {
    const condition = () => true;
    const result = whenInterceptor(condition, MockInterceptor);

    expect(result.__isConditional).toBe(true);
    expect(result.type).toBe("when");
    expect(result.condition).toBe(condition);
    expect(result.interceptor).toBe(MockInterceptor);
  });

  it("should pass type guard check", () => {
    const result = whenInterceptor(() => true, MockInterceptor);
    expect(isConditionalInterceptor(result)).toBe(true);
  });

  it("should work with async condition", () => {
    const asyncCondition = async () => true;
    const result = whenInterceptor(asyncCondition, MockInterceptor);

    expect(result.condition).toBe(asyncCondition);
  });

  it("should work with interceptor instance", () => {
    const instance = new MockInterceptor();
    const result = whenInterceptor(() => true, instance);

    expect(result.interceptor).toBe(instance);
  });
});

describe("unlessInterceptor", () => {
  it("should create a conditional interceptor with type 'unless'", () => {
    const condition = () => false;
    const result = unlessInterceptor(condition, MockInterceptor);

    expect(result.__isConditional).toBe(true);
    expect(result.type).toBe("unless");
    expect(result.condition).toBe(condition);
    expect(result.interceptor).toBe(MockInterceptor);
  });

  it("should pass type guard check", () => {
    const result = unlessInterceptor(() => false, MockInterceptor);
    expect(isConditionalInterceptor(result)).toBe(true);
  });
});
