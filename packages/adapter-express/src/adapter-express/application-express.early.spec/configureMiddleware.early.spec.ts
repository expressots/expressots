import express from "express";
import { AppExpress } from "../application-express";

class HandlerMiddleware {
  handler(_req: express.Request, _res: express.Response, next: express.NextFunction): void {
    next();
  }
}

class UseMiddleware {
  use(_req: express.Request, _res: express.Response, next: express.NextFunction): void {
    next();
  }
}

class BrokenMiddleware {}

describe("AppExpress.configureMiddleware() method", () => {
  let appExpress: AppExpress;
  let app: express.Application;
  let loggerWarn: jest.Mock;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    app = { use: jest.fn() } as unknown as express.Application;
    loggerWarn = jest.fn();
    (appExpress as unknown as { logger: { warn: jest.Mock } }).logger = { warn: loggerWarn };
    (appExpress as unknown as { globalPrefix: string }).globalPrefix = "/api";
  });

  const configure = (entries: unknown[]) =>
    (
      appExpress as unknown as {
        configureMiddleware: (
          application: express.Application,
          middlewareEntries: unknown[],
        ) => Promise<void>;
      }
    ).configureMiddleware(app, entries as unknown[]);

  it("registers function middleware and path-scoped entries", async () => {
    const fn = jest.fn();
    const useMw = new UseMiddleware();

    await configure([
      fn,
      { path: "/users", middlewares: [new HandlerMiddleware(), useMw, "Named"] },
      new HandlerMiddleware(),
      new UseMiddleware(),
    ]);

    expect(app.use).toHaveBeenCalled();
  });

  it("warns when a middleware entry lacks use/handler methods", async () => {
    await configure([new BrokenMiddleware()]);
    expect(loggerWarn).toHaveBeenCalled();
  });
});
