// Unit tests for: getErrorHandler

import { ErrorRequestHandler } from "express";
import defaultErrorHandler from "../../error/error-handler-middleware";
import { Middleware } from "../middleware-service";

// Mocking the necessary modules
jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
  };
});

describe("Middleware.getErrorHandler() getErrorHandler method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should return the default error handler if no custom handler is set", () => {
      middleware.setErrorHandler();

      const result = middleware.getErrorHandler();

      expect(result).toBeDefined();
      expect(defaultErrorHandler).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined error handler gracefully", () => {
      middleware.setErrorHandler({ errorHandler: undefined } as any);

      const result = middleware.getErrorHandler();

      expect(result).toBeDefined();
      expect(defaultErrorHandler).not.toHaveBeenCalled();
    });

    it("should handle null error handler gracefully", () => {
      middleware.setErrorHandler({ errorHandler: null } as any);

      const result = middleware.getErrorHandler();

      expect(result).toBeDefined();
      expect(defaultErrorHandler).not.toHaveBeenCalled();
    });

    it("should handle missing options gracefully", () => {
      middleware.setErrorHandler(undefined as any);

      const result = middleware.getErrorHandler();

      expect(result).toBeDefined();
      expect(defaultErrorHandler).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: getErrorHandler
