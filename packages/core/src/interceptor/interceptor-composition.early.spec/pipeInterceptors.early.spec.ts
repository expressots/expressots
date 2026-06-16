import {
  pipeInterceptors,
  combineInterceptors,
} from "../interceptor-composition";
import { isComposedInterceptor } from "../interceptor.interface";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";

class MockInterceptor1 implements IInterceptor {
  async intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

class MockInterceptor2 implements IInterceptor {
  async intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

describe("pipeInterceptors", () => {
  it("should create a composed interceptor with mode 'pipe'", () => {
    const result = pipeInterceptors(MockInterceptor1, MockInterceptor2);

    expect(result.__isComposed).toBe(true);
    expect(result.mode).toBe("pipe");
    expect(result.interceptors).toHaveLength(2);
    expect(result.interceptors[0]).toBe(MockInterceptor1);
    expect(result.interceptors[1]).toBe(MockInterceptor2);
  });

  it("should pass type guard check", () => {
    const result = pipeInterceptors(MockInterceptor1);
    expect(isComposedInterceptor(result)).toBe(true);
  });

  it("should work with empty array", () => {
    const result = pipeInterceptors();
    expect(result.interceptors).toHaveLength(0);
  });

  it("should work with interceptor instances", () => {
    const instance1 = new MockInterceptor1();
    const instance2 = new MockInterceptor2();
    const result = pipeInterceptors(instance1, instance2);

    expect(result.interceptors[0]).toBe(instance1);
    expect(result.interceptors[1]).toBe(instance2);
  });
});

describe("combineInterceptors", () => {
  it("should create a composed interceptor with mode 'combine'", () => {
    const result = combineInterceptors(MockInterceptor1, MockInterceptor2);

    expect(result.__isComposed).toBe(true);
    expect(result.mode).toBe("combine");
    expect(result.interceptors).toHaveLength(2);
  });

  it("should pass type guard check", () => {
    const result = combineInterceptors(MockInterceptor1);
    expect(isComposedInterceptor(result)).toBe(true);
  });
});
