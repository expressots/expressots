// Unit tests for: parse

import { json, urlencoded } from "express";
import { middlewareResolver } from "../middleware-resolver";
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
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.parse() parse method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (json as jest.Mock).mockReturnValue(jest.fn());
    (urlencoded as jest.Mock).mockReturnValue(jest.fn());
  });

  describe("Happy Path", () => {
    it("should add JSON and URL-encoded parsers by default when called without options", () => {
      middleware.parse();

      expect(json).toHaveBeenCalledWith({ limit: "100kb" });
      expect(urlencoded).toHaveBeenCalledWith({ extended: true });
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should add JSON parser with custom options", () => {
      middleware.parse({ json: { limit: "1mb" } });

      expect(json).toHaveBeenCalledWith({ limit: "1mb" });
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should add URL-encoded parser with custom options", () => {
      middleware.parse({ urlencoded: { extended: false } });

      expect(urlencoded).toHaveBeenCalledWith({ extended: false });
    });

    it("should add cookie parser when cookies option is provided", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      middleware.parse({ cookies: { secret: "my-secret" } });

      // Cookie parser is called with (secret, options) where options may be undefined
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieParser",
        "my-secret",
        undefined,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should not add JSON parser when json is false", () => {
      middleware.parse({ json: false });

      expect(json).not.toHaveBeenCalled();
      // Should still add urlencoded
      expect(urlencoded).toHaveBeenCalled();
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should not add URL-encoded parser when urlencoded is false", () => {
      middleware.parse({ urlencoded: false });

      expect(urlencoded).not.toHaveBeenCalled();
      // Should still add json
      expect(json).toHaveBeenCalled();
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should not add duplicate parsers when called multiple times", () => {
      middleware.parse();
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.parse();

      // Should not add duplicates
      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should handle empty options object", () => {
      middleware.parse({});

      // Should add both parsers with defaults
      expect(json).toHaveBeenCalledWith({ limit: "100kb" });
      expect(urlencoded).toHaveBeenCalledWith({ extended: true });
    });
  });
});

// End of unit tests for: parse
