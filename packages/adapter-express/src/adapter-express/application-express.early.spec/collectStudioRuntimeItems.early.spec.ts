import express from "express";
import { INTERCEPTOR_METADATA_KEY } from "@expressots/core";
import { AppExpress } from "../application-express";

const PROVIDE_METADATA_KEY = "inversify-binding-decorators:provide";

describe("AppExpress.collectStudioRuntimeItems() method", () => {
  let appExpress: AppExpress;
  let reflectSpy: jest.SpyInstance;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
    reflectSpy = jest.spyOn(Reflect, "getMetadata");
    jest.clearAllMocks();
  });

  afterEach(() => {
    reflectSpy.mockRestore();
  });

  const collect = (): unknown =>
    (
      appExpress as unknown as {
        collectStudioRuntimeItems: () => unknown;
      }
    ).collectStudioRuntimeItems();

  it("returns undefined when no runtime metadata was harvested", () => {
    reflectSpy.mockReturnValue(undefined);
    jest
      .spyOn(
        appExpress as unknown as { collectMiddlewarePipelineItems: () => unknown },
        "collectMiddlewarePipelineItems" as never,
      )
      .mockReturnValue(undefined as never);
    jest
      .spyOn(
        appExpress as unknown as { collectMiddlewareBindings: () => unknown },
        "collectMiddlewareBindings" as never,
      )
      .mockReturnValue(undefined as never);
    jest
      .spyOn(
        appExpress as unknown as { collectRouteSchemas: () => unknown },
        "collectRouteSchemas" as never,
      )
      .mockReturnValue(undefined as never);

    expect(collect()).toBeUndefined();
  });

  it("combines providers, interceptors, and Studio harvest helpers", () => {
    class LoggerProvider {}
    class AuditInterceptor {}

    reflectSpy.mockImplementation((key: string) => {
      if (key === PROVIDE_METADATA_KEY) {
        return [{ implementationType: LoggerProvider }];
      }
      if (key === INTERCEPTOR_METADATA_KEY.interceptor) {
        return [{ interceptor: AuditInterceptor, priority: 10 }];
      }
      return undefined;
    });

    jest
      .spyOn(
        appExpress as unknown as { collectMiddlewarePipelineItems: () => unknown },
        "collectMiddlewarePipelineItems" as never,
      )
      .mockReturnValue([
        { name: "CorsMiddleware", category: "security", type: "built-in", order: 1 },
      ] as never);
    jest
      .spyOn(
        appExpress as unknown as { collectMiddlewareBindings: () => unknown },
        "collectMiddlewareBindings" as never,
      )
      .mockReturnValue([
        {
          middlewareName: "AuthMiddleware",
          scope: "controller",
          controllerName: "UserController",
        },
      ] as never);
    jest
      .spyOn(
        appExpress as unknown as { collectRouteSchemas: () => unknown },
        "collectRouteSchemas" as never,
      )
      .mockReturnValue([
        {
          controllerName: "UserController",
          controllerMethod: "create",
          httpMethod: "POST",
          routePath: "/users",
        },
      ] as never);

    expect(collect()).toEqual({
      providers: [{ name: "LoggerProvider", source: "provide" }],
      interceptors: [{ name: "AuditInterceptor", priority: 10, source: "metadata" }],
      middleware: [{ name: "CorsMiddleware", category: "security", type: "built-in", order: 1 }],
      middlewareBindings: [
        {
          middlewareName: "AuthMiddleware",
          scope: "controller",
          controllerName: "UserController",
        },
      ],
      routeSchemas: [
        {
          controllerName: "UserController",
          controllerMethod: "create",
          httpMethod: "POST",
          routePath: "/users",
        },
      ],
    });
  });
});
