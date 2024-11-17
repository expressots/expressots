// Unit tests for: serveStatic

import { static as expressStatic } from "express";
import { ServeStaticOptions } from "../interfaces/serve-static.interface";
import { Middleware } from "../middleware-service";

// Mocking the necessary modules
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

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    static: jest.fn(),
  };
});

// Mock interfaces and types
interface MockServeStaticOptions extends ServeStaticOptions {}

// Test suite for serveStatic method
describe("Middleware.serveStatic() serveStatic method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should add a static middleware to the pipeline when it does not exist", () => {
      const root = "/public";
      const options: MockServeStaticOptions = {} as any;

      middleware.serveStatic(root, options as any);

      expect(expressStatic).toHaveBeenCalledWith(root, options);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should not add a static middleware if it already exists", () => {
      const root = "/public";
      const options: MockServeStaticOptions = {} as any;

      middleware.serveStatic(root, options as any);
      middleware.serveStatic(root, options as any);

      expect(expressStatic).toHaveBeenCalledTimes(2);
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options gracefully", () => {
      const root = "/public";

      middleware.serveStatic(root);

      expect(expressStatic).toHaveBeenCalledWith(root, undefined);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should handle empty string as root gracefully", () => {
      const root = "";
      const options: MockServeStaticOptions = {} as any;

      middleware.serveStatic(root, options as any);

      expect(expressStatic).toHaveBeenCalledWith(root, options);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });
});

// End of unit tests for: serveStatic
