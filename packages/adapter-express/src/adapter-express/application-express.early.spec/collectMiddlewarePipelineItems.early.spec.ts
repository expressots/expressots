import express from "express";
import { AppExpress } from "../application-express";

describe("AppExpress.collectMiddlewarePipelineItems() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
  });

  const collect = (): unknown =>
    (
      appExpress as unknown as {
        collectMiddlewarePipelineItems: () => unknown;
      }
    ).collectMiddlewarePipelineItems();

  it("returns undefined when the middleware service lacks getPipelineInfo()", () => {
    Object.defineProperty(appExpress, "Middleware", {
      configurable: true,
      get: () => ({}),
    });
    expect(collect()).toBeUndefined();
  });

  it("maps pipeline entries into the Studio runtime shape", () => {
    Object.defineProperty(appExpress, "Middleware", {
      configurable: true,
      get: () => ({
        getPipelineInfo: () => ({
          entries: [
            {
              name: "HelmetMiddleware",
              category: "security",
              type: "built-in",
              order: 1,
              path: "Global",
            },
            {
              name: "AuthMiddleware",
              category: "auth",
              type: "custom",
              order: 2,
              path: "/users",
            },
          ],
        }),
      }),
    });

    expect(collect()).toEqual([
      {
        name: "HelmetMiddleware",
        category: "security",
        type: "built-in",
        order: 1,
        path: undefined,
      },
      {
        name: "AuthMiddleware",
        category: "auth",
        type: "custom",
        order: 2,
        path: "/users",
      },
    ]);
  });
});
