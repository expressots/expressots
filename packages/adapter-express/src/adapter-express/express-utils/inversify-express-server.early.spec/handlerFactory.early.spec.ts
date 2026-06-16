import "reflect-metadata";
import type { NextFunction, Request, Response } from "express";
import { InversifyExpressServer } from "../inversify-express-server";

jest.mock("../guard-utils", () => ({
  getControllerGuards: jest.fn().mockReturnValue([class TestGuard {}]),
  getMethodGuards: jest.fn().mockReturnValue([]),
}));

class GuardedController {
  action(): string {
    return "ok";
  }
}

function buildGuardedHandler(container: { isBound: jest.Mock; get: jest.Mock }): {
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  executeRouteHandler: jest.Mock;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = Object.create(InversifyExpressServer.prototype) as any;
  server._container = container;
  server.executeRouteHandler = jest.fn().mockResolvedValue(undefined);

  return {
    handler: server.handlerFactory("GuardedController", "action", [], GuardedController),
    executeRouteHandler: server.executeRouteHandler,
  };
}

describe("InversifyExpressServer.handlerFactory()", () => {
  it("runs guard middleware before the route handler when guards are configured", async () => {
    const container = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({
        execute: (_req: Request, _res: Response, next: NextFunction) => next(),
      }),
    };
    const { handler, executeRouteHandler } = buildGuardedHandler(container);

    await handler({ path: "/secure" } as Request, {} as Response, jest.fn());

    expect(container.get).toHaveBeenCalled();
    expect(executeRouteHandler).toHaveBeenCalled();
  });

  it("continues without guards when guard initialization fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const container = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn().mockImplementation(() => {
        throw new Error("guard init failed");
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;
    server._container = container;
    server.executeRouteHandler = jest.fn().mockResolvedValue(undefined);

    const handler = server.handlerFactory("GuardedController", "action", [], GuardedController);
    const next = jest.fn();

    await handler({ path: "/secure" } as Request, {} as Response, next);

    expect(errorSpy).toHaveBeenCalledWith(
      "[Guard System] Failed to initialize:",
      expect.any(Error),
    );
    expect(server.executeRouteHandler).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("forwards guard errors to Express error middleware", async () => {
    const guardError = new Error("guard denied");
    const container = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({
        execute: (_req: Request, _res: Response, next: NextFunction) => next(guardError),
      }),
    };
    const { handler } = buildGuardedHandler(container);
    const next = jest.fn();

    await handler({ path: "/secure" } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(guardError);
  });
});
