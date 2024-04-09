import { describe, afterEach, expect, it, vi } from "vitest";
import { provide } from "inversify-binding-decorators";
import { BindingScopeEnum } from "inversify";
import { provideSingleton, provideTransient } from "../../decorator";
import { scope, BINDING_TYPE_METADATA_KEY } from "../container-module";

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock("reflect-metadata", () => ({
  Reflect: {
    ...Reflect,
    defineMetadata: vi.fn(),
    hasMetadata: vi.fn(),
  },
}));

vi.mock("../../decorator", () => ({
  provideSingleton: vi.fn(),
  provideTransient: vi.fn(),
  provide: vi.fn(),
}));

vi.mock("inversify-binding-decorators", () => {
  return {
    provide: vi.fn(),
  };
});

describe("scope function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Before your tests
    vi.spyOn(Reflect, "defineMetadata").mockImplementation(() => {});
    vi.spyOn(Reflect, "hasMetadata").mockReturnValue(false);
  });

  it("define singleton scope metadata and call provideSingleton", () => {
    class TestClass {}
    const singletonScope = scope(BindingScopeEnum.Singleton);

    vi.mocked(Reflect.hasMetadata).mockReturnValue(false);
    singletonScope(TestClass);

    expect(Reflect.defineMetadata).toHaveBeenCalledWith(
      BINDING_TYPE_METADATA_KEY,
      BindingScopeEnum.Singleton,
      TestClass,
    );
    expect(provideSingleton).toHaveBeenCalledWith(TestClass);
  });

  it("define transient scope metadata and call provideTransient", () => {
    class TestClass {}
    const transientScope = scope(BindingScopeEnum.Transient);

    transientScope(TestClass);

    expect(Reflect.defineMetadata).toHaveBeenCalledWith(
      BINDING_TYPE_METADATA_KEY,
      BindingScopeEnum.Transient,
      TestClass,
    );
    expect(provideTransient).toHaveBeenCalledWith(TestClass);
  });

  it("define default scope metadata and call provide", () => {
    class TestClass {}
    // Use a scope that does not match Singleton or Transient to trigger the default case
    const defaultScope = scope(BindingScopeEnum.Request);

    defaultScope(TestClass);

    expect(Reflect.defineMetadata).toHaveBeenCalledWith(
      BINDING_TYPE_METADATA_KEY,
      BindingScopeEnum.Request,
      TestClass,
    );
    expect(provide).toHaveBeenCalledWith(TestClass);
  });
});
