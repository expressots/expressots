import express from "express";
import { AppExpress } from "../application-express";
import {
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllersFromMetadata,
} from "../express-utils/utils";
import { getValidationMetadata } from "../express-utils/validation-decorators";

jest.mock("../express-utils/utils.js", () => ({
  getControllersFromMetadata: jest.fn(),
  getControllerMetadata: jest.fn(),
  getControllerMethodMetadata: jest.fn(),
}));

jest.mock("../express-utils/validation-decorators.js", () => ({
  getValidationMetadata: jest.fn(),
}));

describe("AppExpress.collectRouteSchemas() method", () => {
  let appExpress: AppExpress;
  let schemaSpy: jest.SpyInstance;

  beforeEach(async () => {
    const core = await import("@expressots/core");
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
    schemaSpy = jest.spyOn(core, "schemaToJsonSchema");
    jest.clearAllMocks();
  });

  afterEach(() => {
    schemaSpy.mockRestore();
  });

  const collect = (): unknown =>
    (
      appExpress as unknown as {
        collectRouteSchemas: () => unknown;
      }
    ).collectRouteSchemas();

  it("returns undefined when no controllers are registered", () => {
    (getControllersFromMetadata as jest.Mock).mockReturnValue([]);
    expect(collect()).toBeUndefined();
  });

  it("harvests whole-body validation schemas for Studio auto-fill", () => {
    class CreateUserDTO {}
    class UserController {
      create() {}
    }

    (getControllersFromMetadata as jest.Mock).mockReturnValue([UserController]);
    (getControllerMetadata as jest.Mock).mockReturnValue({ path: "/users" });
    (getControllerMethodMetadata as jest.Mock).mockReturnValue([
      { key: "create", method: "post", path: "/" },
    ]);
    (getValidationMetadata as jest.Mock).mockReturnValue([
      { source: "body", schema: CreateUserDTO },
      { source: "body", paramName: "id", schema: CreateUserDTO },
    ]);
    schemaSpy.mockReturnValue({
      type: "object",
      properties: { name: { type: "string" } },
    });

    expect(collect()).toEqual([
      {
        controllerName: "UserController",
        controllerMethod: "create",
        httpMethod: "POST",
        routePath: "/users",
        bodyDto: "CreateUserDTO",
        bodySample: { name: "" },
        bodySchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
    ]);
  });

  it("skips routes without a convertible JSON schema", () => {
    class UserController {
      create() {}
    }

    (getControllersFromMetadata as jest.Mock).mockReturnValue([UserController]);
    (getControllerMetadata as jest.Mock).mockReturnValue({ path: "/users" });
    (getControllerMethodMetadata as jest.Mock).mockReturnValue([
      { key: "create", method: "post", path: "/create" },
    ]);
    (getValidationMetadata as jest.Mock).mockReturnValue([
      { source: "body", schema: class AnonymousDTO {} },
    ]);
    schemaSpy.mockReturnValue(undefined);

    expect(collect()).toBeUndefined();
  });
});
