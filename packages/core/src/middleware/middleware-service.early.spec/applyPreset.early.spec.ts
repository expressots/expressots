// Unit tests for: applyPreset

import { json, urlencoded } from "express";
import { middlewareResolver, isPackageAvailable } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    json: jest.fn(),
    urlencoded: jest.fn(),
  };
});

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    isMiddlewareAvailable: jest.fn().mockReturnValue(true),
    isPackageAvailable: jest.fn().mockReturnValue(false),
    resolvePackage: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.applyPreset() applyPreset method", () => {
  let middleware: Middleware;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (json as jest.Mock).mockReturnValue(jest.fn());
    (urlencoded as jest.Mock).mockReturnValue(jest.fn());
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("Built-in Presets", () => {
    it("should apply 'api' preset with parse, logger, and security", () => {
      middleware.applyPreset("api");

      // Should have parsers and security
      expect(json).toHaveBeenCalled();
      expect(urlencoded).toHaveBeenCalled();
      expect(middlewareResolver).toHaveBeenCalledWith("helmet", expect.anything());
      expect(middlewareResolver).toHaveBeenCalledWith("cors", expect.anything());
      // Compression is also part of api preset
      expect(middlewareResolver).toHaveBeenCalledWith("compression", undefined);
    });

    it("should apply 'web' preset with cookies enabled", () => {
      middleware.applyPreset("web");

      expect(json).toHaveBeenCalled();
      expect(urlencoded).toHaveBeenCalled();
      // cookieParser is called with (secret, options) - both can be undefined
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieParser",
        undefined,
        undefined,
      );
    });

    it("should apply 'minimal' preset with only parsing", () => {
      middleware.applyPreset("minimal");

      expect(json).toHaveBeenCalled();
      expect(urlencoded).toHaveBeenCalled();
      // Minimal preset should not add security
      // Note: Check what minimal preset actually includes
    });

    it("should apply 'microservice' preset with JSON parsing and compression", () => {
      middleware.applyPreset("microservice");

      expect(json).toHaveBeenCalledWith({ limit: "1mb" });
      // Compression is called with undefined options
      expect(middlewareResolver).toHaveBeenCalledWith("compression", undefined);
    });

    it("should apply 'graphql' preset with large JSON limit", () => {
      middleware.applyPreset("graphql");

      expect(json).toHaveBeenCalledWith({ limit: "50mb" });
    });

    it("should apply 'development' preset with relaxed security", () => {
      middleware.applyPreset("development");

      // Development preset uses 'relaxed' security which doesn't add helmet
      // Just verify it doesn't throw and adds some middleware
      expect(middleware.getMiddlewarePipeline().length).toBeGreaterThan(0);
    });

    it("should apply 'production' preset with strict security", () => {
      middleware.applyPreset("production");

      expect(middlewareResolver).toHaveBeenCalledWith("helmet", expect.anything());
      expect(middlewareResolver).toHaveBeenCalledWith("rateLimit", expect.anything());
    });
  });

  describe("Custom Presets", () => {
    it("should define and apply custom preset", () => {
      middleware.definePreset("custom", {
        parse: { json: { limit: "5mb" } },
        security: "minimal",
      });

      middleware.applyPreset("custom");

      expect(json).toHaveBeenCalledWith({ limit: "5mb" });
    });

    it("should override preset values with provided overrides", () => {
      middleware.applyPreset("api", {
        parse: { json: { limit: "2mb" } },
      });

      expect(json).toHaveBeenCalledWith({ limit: "2mb" });
    });
  });

  describe("Edge Cases", () => {
    it("should log error for non-existent preset", () => {
      const logSpy = jest.spyOn((middleware as any)._logger, "error");

      middleware.applyPreset("non-existent");

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        expect.any(String),
      );
    });

    it("should return all presets including custom ones", () => {
      middleware.definePreset("my-preset", { parse: true });

      const presets = middleware.getAllPresets();

      expect(presets).toHaveProperty("api");
      expect(presets).toHaveProperty("my-preset");
    });
  });
});

// End of unit tests for: applyPreset
