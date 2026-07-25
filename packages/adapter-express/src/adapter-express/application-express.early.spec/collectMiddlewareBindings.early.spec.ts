import express from "express";
import { AppExpress } from "../application-express";
import {
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllersFromMetadata,
} from "../express-utils/utils";

jest.mock("../express-utils/utils.js", () => ({
  getControllersFromMetadata: jest.fn(),
  getControllerMetadata: jest.fn(),
  getControllerMethodMetadata: jest.fn(),
}));

class AuthMiddleware {}

describe("AppExpress.collectMiddlewareBindings() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
    jest.clearAllMocks();
  });

  const collect = (): unknown =>
    (
      appExpress as unknown as {
        collectMiddlewareBindings: () => unknown;
      }
    ).collectMiddlewareBindings();

  it("returns undefined when no controllers are registered", () => {
    (getControllersFromMetadata as jest.Mock).mockReturnValue([]);
    expect(collect()).toBeUndefined();
  });

  it("harvests controller- and route-scoped middleware bindings", () => {
    class UserController {
      create() {}
    }

    (getControllersFromMetadata as jest.Mock).mockReturnValue([UserController]);
    (getControllerMetadata as jest.Mock).mockReturnValue({
      path: "/users",
      middleware: [AuthMiddleware, "NamedMiddleware"],
    });
    (getControllerMethodMetadata as jest.Mock).mockReturnValue([
      {
        key: "create",
        method: "post",
        path: "/:id",
        middleware: ["RouteGuard"],
      },
    ]);

    expect(collect()).toEqual([
      {
        middlewareName: "AuthMiddleware",
        scope: "controller",
        controllerName: "UserController",
      },
      {
        middlewareName: "NamedMiddleware",
        scope: "controller",
        controllerName: "UserController",
      },
      {
        middlewareName: "RouteGuard",
        scope: "route",
        controllerName: "UserController",
        controllerMethod: "create",
        httpMethod: "POST",
        routePath: "/users/:id",
      },
    ]);
  });
});
