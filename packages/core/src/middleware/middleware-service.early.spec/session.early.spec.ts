// Unit tests for: session

import { middlewareResolver, resolvePackage } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    resolvePackage: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.session() session method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
  });

  describe("Cookie Session", () => {
    it("should add cookie session middleware with required options", () => {
      middleware.session({
        type: "cookie",
        secret: "my-secret",
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieSession",
        expect.objectContaining({
          name: "session",
          secret: "my-secret",
          keys: ["my-secret"],
        }),
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add cookie session with custom name", () => {
      middleware.session({
        type: "cookie",
        secret: "my-secret",
        name: "custom-session",
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieSession",
        expect.objectContaining({
          name: "custom-session",
        }),
      );
    });

    it("should add cookie session with custom keys", () => {
      middleware.session({
        type: "cookie",
        secret: "my-secret",
        keys: ["key1", "key2"],
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieSession",
        expect.objectContaining({
          keys: ["key1", "key2"],
        }),
      );
    });
  });

  describe("Store Session", () => {
    it("should add express-session middleware with required options", () => {
      middleware.session({
        type: "store",
        secret: "my-secret",
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          secret: "my-secret",
          resave: false,
          saveUninitialized: false,
        }),
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add express-session with custom store", () => {
      const mockStore = { get: jest.fn(), set: jest.fn() };

      middleware.session({
        type: "store",
        secret: "my-secret",
        store: mockStore as any,
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          store: mockStore,
        }),
      );
    });

    it("should add express-session with resave and saveUninitialized options", () => {
      middleware.session({
        type: "store",
        secret: "my-secret",
        resave: true,
        saveUninitialized: true,
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          resave: true,
          saveUninitialized: true,
        }),
      );
    });

    it("should add express-session with rolling option", () => {
      middleware.session({
        type: "store",
        secret: "my-secret",
        rolling: true,
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          rolling: true,
        }),
      );
    });

    it("should add express-session with cookie options", () => {
      middleware.session({
        type: "store",
        secret: "my-secret",
        cookie: {
          maxAge: 3600000,
          secure: true,
          httpOnly: true,
        },
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          cookie: {
            maxAge: 3600000,
            secure: true,
            httpOnly: true,
          },
        }),
      );
    });
  });

  describe("JWT Session", () => {
    it("fails with an actionable error when the JWT plugin is missing", () => {
      (resolvePackage as jest.Mock).mockReturnValue(null);
      expect(() => middleware.session({ type: "jwt" })).toThrow(
        "ex add @expressots/jwt",
      );
    });
    it("delegates to the plugin and forwards the application container", () => {
      const factory = jest.fn(() => jest.fn());
      (resolvePackage as jest.Mock).mockReturnValue({
        createJwtSessionMiddleware: factory,
      });
      const container = {} as any;
      middleware.session(
        { type: "jwt", jwt: { storage: "header" } },
        container,
        undefined,
      );
      expect(factory).toHaveBeenCalledWith(
        { storage: "header" },
        container,
        undefined,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not add duplicate session middleware", () => {
      middleware.session({ type: "cookie", secret: "secret" });
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.session({ type: "cookie", secret: "secret" });

      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should handle array of secrets", () => {
      middleware.session({
        type: "store",
        secret: ["secret1", "secret2"],
      });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        expect.objectContaining({
          secret: ["secret1", "secret2"],
        }),
      );
    });
  });
});

// End of unit tests for: session
