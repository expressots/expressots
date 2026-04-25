import { micro, MicroApp } from "./micro";
import { AppExpress } from "../application-express";

jest.mock("@expressots/core", () => {
  return {
    Console: class {
      messageServer = jest.fn().mockResolvedValue(undefined);
    },
    Logger: class {
      info = jest.fn();
      warn = jest.fn();
      error = jest.fn();
    },
  };
});

jest.mock("../application-express", () => ({
  AppExpress: { disableBuffering: jest.fn() },
}));

describe("micro()", () => {
  let app: MicroApp;

  beforeEach(() => {
    app = micro({ showBanner: false });
  });

  it("disables AppExpress log buffering at construction", () => {
    expect(AppExpress.disableBuffering).toHaveBeenCalled();
  });

  it("returns the underlying Express app via getApp()", () => {
    const expressApp = app.getApp();
    expect(typeof expressApp).toBe("function");
    expect(typeof (expressApp as unknown as { use: unknown }).use).toBe("function");
  });

  it("registers GET routes on the underlying Express app", async () => {
    const fluent = app.get("/hello", () => "ok");
    expect(fluent).toBe(app);

    const expressApp = app.getApp() as unknown as {
      _router?: { stack: Array<{ route?: { path: string } }> };
    };

    // Express attaches the router lazily; trigger it by routing through stack
    const stack = expressApp._router?.stack ?? [];
    const hasHello = stack.some((layer) => layer.route?.path === "/hello");
    expect(hasHello).toBe(true);
  });

  it("supports a global prefix when configured", () => {
    const prefixed = micro({ showBanner: false, globalPrefix: "/api" });
    prefixed.get("/users", () => []);

    const expressApp = prefixed.getApp() as unknown as {
      _router?: { stack: Array<{ route?: { path: string } }> };
    };
    const stack = expressApp._router?.stack ?? [];
    const hasPrefixed = stack.some((layer) => layer.route?.path === "/api/users");
    expect(hasPrefixed).toBe(true);
  });

  it("supports POST/PUT/PATCH/DELETE via the fluent API", () => {
    app
      .post("/p", () => 1)
      .put("/p", () => 2)
      .patch("/p", () => 3)
      .delete("/p", () => 4);

    const expressApp = app.getApp() as unknown as {
      _router?: {
        stack: Array<{
          route?: { path: string; methods: Record<string, boolean> };
        }>;
      };
    };
    const stack = expressApp._router?.stack ?? [];
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
