import express, { type Request, type Response } from "express";
import { InversifyExpressServer } from "../inversify-express-server";

describe("InversifyExpressServer 404 suggestions handler", () => {
  it("returns JSON suggestions for unknown routes when enabled", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;

    const app = express();
    server._app = app;
    server.resolveSuggestionsConfig = jest.fn().mockReturnValue({ enabled: true });
    server.resolveLogger = jest.fn().mockReturnValue({ warn: jest.fn() });

    const useSpy = jest.spyOn(app, "use");
    server.registerNotFoundHandler();

    const notFoundLayer = useSpy.mock.calls.at(-1)?.[0] as unknown as (
      req: Request,
      res: Response,
      next: () => void,
    ) => void;

    const send = jest.fn();
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send,
    } as unknown as Response;

    notFoundLayer(
      { method: "GET", originalUrl: "/missing", url: "/missing" } as Request,
      res,
      () => undefined,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalled();
  });

  it("delegates to next when suggestions are disabled", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;
    const app = express();
    server._app = app;
    server.resolveSuggestionsConfig = jest.fn().mockReturnValue({ enabled: false });

    const useSpy = jest.spyOn(app, "use");
    server.registerNotFoundHandler();

    const handler = useSpy.mock.calls.at(-1)?.[0] as unknown as (
      req: Request,
      res: Response,
      next: () => void,
    ) => void;

    const next = jest.fn();
    handler(
      { method: "GET", originalUrl: "/missing", url: "/missing" } as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});
