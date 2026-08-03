import { micro, MicroApp } from "./micro";
import * as logBuffer from "../log-buffer";

jest.mock("@expressots/core", () => {
  return {
    Logger: class {
      info = jest.fn();
      warn = jest.fn();
      error = jest.fn();
    },
  };
});

// micro() imports disableBuffering from ../log-buffer directly rather than
// through AppExpress — pulling AppExpress in for that one call dragged the
// whole DI/full-framework stack into every micro build.
jest.mock("../log-buffer", () => ({
  disableBuffering: jest.fn(),
}));

describe("micro()", () => {
  let app: MicroApp;

  beforeEach(() => {
    app = micro({ showBanner: false });
  });

  it("disables banner log buffering at construction", () => {
    expect(logBuffer.disableBuffering).toHaveBeenCalled();
  });

  it("returns the underlying Express app via getApp()", () => {
    const expressApp = app.getApp();
    expect(typeof expressApp).toBe("function");
    expect(typeof (expressApp as unknown as { use: unknown }).use).toBe("function");
  });

  // Express 5 renamed the lazily-built router from `app._router` to
  // `app.router`. We access either to stay forward-compatible if Express
  // exposes both during the v4->v5 transition window.
  type ExpressLike = {
    router?: { stack: Array<RouterLayer> };
    _router?: { stack: Array<RouterLayer> };
  };
  type RouterLayer = {
    route?: { path: string; methods?: Record<string, boolean> };
  };
  const getStack = (a: unknown): Array<RouterLayer> => {
    const e = a as ExpressLike;
    return e.router?.stack ?? e._router?.stack ?? [];
  };

  it("registers GET routes on the underlying Express app", async () => {
    const fluent = app.get("/hello", () => "ok");
    expect(fluent).toBe(app);

    const stack = getStack(app.getApp());
    const hasHello = stack.some((layer) => layer.route?.path === "/hello");
    expect(hasHello).toBe(true);
  });

  it("supports a global prefix when configured", () => {
    const prefixed = micro({ showBanner: false, globalPrefix: "/api" });
    prefixed.get("/users", () => []);

    const stack = getStack(prefixed.getApp());
    const hasPrefixed = stack.some((layer) => layer.route?.path === "/api/users");
    expect(hasPrefixed).toBe(true);
  });

  it("supports POST/PUT/PATCH/DELETE via the fluent API", () => {
    app
      .post("/p", () => 1)
      .put("/p", () => 2)
      .patch("/p", () => 3)
      .delete("/p", () => 4);

    const stack = getStack(app.getApp());
    const methods = new Set(
      stack
        .filter((l) => l.route?.path === "/p")
        .flatMap((l) => Object.keys(l.route?.methods ?? {})),
    );
    expect(methods).toEqual(new Set(["post", "put", "patch", "delete"]));
  });

  it("setErrorHandler() returns the same fluent instance", () => {
    expect(app.setErrorHandler((_err, _req, _res, _next) => undefined)).toBe(app);
  });
});
