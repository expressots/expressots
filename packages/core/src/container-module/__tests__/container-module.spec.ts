import { BindingScopeEnum } from "inversify";
import { describe, expect, it, vi } from "vitest";
import { BaseModule } from "../container-module";

describe("BaseModule.createContainerModule", () => {
  vi.mock("inversify", async () => {
    const actual = await vi.importActual("inversify");

    // Mock implementation for `to` method to capture calls
    const toMock = vi.fn().mockReturnThis();

    return {
      ...actual,
      ContainerModule: vi.fn((cb) => {
        const bindMock = vi.fn().mockImplementation(() => ({
          to: toMock,
          inSingletonScope: vi.fn().mockReturnThis(),
          inTransientScope: vi.fn().mockReturnThis(),
          inRequestScope: vi.fn().mockReturnThis(),
        }));
        cb(bindMock);
        // Expose toMock for assertions
        return { bindMock, toMock };
      }),
    };
  });

  vi.spyOn(Reflect, "getMetadata").mockReturnValue(BindingScopeEnum.Singleton);

  it("should create a container module with the correct bindings for singleton scope", () => {
    class TestController {}

    const containerModule = BaseModule.createContainerModule(
      [TestController],
      BindingScopeEnum.Singleton,
    );

    const { toMock } = containerModule as any;

    // Now assert directly against toMock
    expect(toMock).toHaveBeenCalledWith(TestController);

    // Since ContainerModule is mocked to return its bind mock, we can assert on it
    expect((containerModule as any).bindMock).toHaveBeenCalled();
    expect((containerModule as any).bindMock).toHaveBeenCalledWith(
      expect.any(Symbol),
    );

    expect((containerModule as any).bindMock().to).toHaveBeenCalledWith(
      TestController,
    );

    vi.mocked(Reflect.getMetadata).mockClear();
  });
});
