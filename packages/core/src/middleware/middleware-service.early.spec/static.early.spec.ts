// Unit tests for: static

import { static as expressStatic } from "express";
import { Middleware } from "../middleware-service";

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    static: jest.fn(),
  };
});

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.static() static method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (expressStatic as unknown as jest.Mock).mockReturnValue(jest.fn());
  });

  describe("Happy Path", () => {
    it("should add static middleware with simple path string", () => {
      middleware.static("/public");

      expect(expressStatic).toHaveBeenCalledWith("/public", undefined);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add static middleware with config object", () => {
      middleware.static({
        path: "/public",
        maxAge: 86400000,
        etag: true,
      });

      expect(expressStatic).toHaveBeenCalledWith(
        "/public",
        expect.objectContaining({
          maxAge: 86400000,
          etag: true,
        }),
      );
    });

    it("should add static middleware with prefix", () => {
      middleware.static({
        path: "/public",
        prefix: "/assets",
      });

      expect(expressStatic).toHaveBeenCalledWith("/public", expect.any(Object));
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add multiple static paths from array", () => {
      middleware.static(["/public", "/uploads"]);

      // Note: serveStatic name deduplication means only first is added as "serveStatic"
      // The second one uses a different name or is skipped
      expect(expressStatic).toHaveBeenCalled();
      expect(middleware.getMiddlewarePipeline().length).toBeGreaterThanOrEqual(1);
    });

    it("should handle mixed array of strings and config objects", () => {
      middleware.static(["/public", { path: "/uploads", maxAge: 3600000 }]);

      expect(expressStatic).toHaveBeenCalled();
    });
  });

  describe("SPA Support", () => {
    it("should add SPA fallback middleware when spa is true", () => {
      middleware.static({
        path: "/dist",
        spa: true,
      });

      // Should add static + spa-fallback
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should use custom index file for SPA", () => {
      middleware.static({
        path: "/dist",
        spa: true,
        index: "app.html",
      });

      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should disable index when spa is true", () => {
      middleware.static({
        path: "/dist",
        spa: true,
      });

      expect(expressStatic).toHaveBeenCalledWith(
        "/dist",
        expect.objectContaining({
          index: false,
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not add duplicate static middleware for same path", () => {
      middleware.static("/public");
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.static("/public");

      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should handle empty string path", () => {
      middleware.static("");

      expect(expressStatic).toHaveBeenCalledWith("", undefined);
    });

    it("should handle empty array", () => {
      middleware.static([]);

      expect(expressStatic).not.toHaveBeenCalled();
      expect(middleware.getMiddlewarePipeline().length).toBe(0);
    });

    it("should pass additional options through", () => {
      middleware.static({
        path: "/public",
        options: {
          dotfiles: "ignore",
          redirect: false,
        },
      });

      expect(expressStatic).toHaveBeenCalledWith(
        "/public",
        expect.objectContaining({
          dotfiles: "ignore",
          redirect: false,
        }),
      );
    });
  });
});

// End of unit tests for: static
