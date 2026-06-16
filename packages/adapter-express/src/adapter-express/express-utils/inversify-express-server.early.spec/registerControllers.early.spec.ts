import express from "express";
import { InversifyExpressServer } from "../inversify-express-server";
import {
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllersFromContainer,
  getControllersFromMetadata,
  getControllerParameterMetadata,
} from "../utils";

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    getControllersFromMetadata: jest.fn().mockReturnValue([]),
    getControllersFromContainer: jest.fn(),
    getControllerMetadata: jest.fn(),
    getControllerMethodMetadata: jest.fn(),
    getControllerParameterMetadata: jest.fn(),
    instanceOfIHttpActionResult: jest.fn().mockReturnValue(false),
  };
});

jest.mock("../decorators", () => {
  const actual = jest.requireActual("../decorators");
  return {
    ...actual,
    getRenderMetadata: jest.fn(),
  };
});

class MockContainer {
  bind = jest.fn().mockReturnThis();
  to = jest.fn().mockReturnThis();
  toConstantValue = jest.fn().mockReturnThis();
  isBound = jest.fn().mockReturnValue(false);
  isBoundNamed = jest.fn().mockReturnValue(false);
  createChild = jest.fn().mockReturnThis();
  get = jest.fn();
  getNamed = jest.fn();
  whenTargetNamed = jest.fn().mockReturnThis();
}

describe("InversifyExpressServer route registration", () => {
  it("joins versioned controller paths before registering routes", () => {
    class ApiController {
      list(): string {
        return "ok";
      }
    }

    (getControllersFromContainer as jest.Mock).mockReturnValue([new ApiController()]);
    (getControllerMetadata as jest.Mock).mockReturnValue({
      path: "/api/",
      middleware: [],
      version: "v1",
      target: ApiController,
    });
    (getControllerMethodMetadata as jest.Mock).mockReturnValue([
      { key: "list", method: "get", path: "users", middleware: [] },
    ]);
    (getControllerParameterMetadata as jest.Mock).mockReturnValue({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;
    server._container = new MockContainer();
    server._routingConfig = { rootPath: "/app" };
    server._app = express();
    server._router = express.Router();
    server._forceControllers = false;
    server.resolveMiddleware = jest.fn().mockReturnValue([]);
    server.handlerFactory = jest.fn().mockReturnValue((_req, _res, next) => next());
    server.extractInterceptors = jest.fn().mockReturnValue([]);
    server.isInterceptorSystemReady = jest.fn().mockReturnValue(false);
    server.initializeInterceptorSystem = jest.fn();

    server.registerControllers();

    expect(
      server._router.stack.some(
        (layer: { route?: { path: string } }) => layer.route?.path === "/v1/api/users",
      ),
    ).toBe(true);
  });
});
