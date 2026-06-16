// Unit tests for: security

import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

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

describe("Middleware.security() security method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
  });

  describe("Happy Path", () => {
    it("should add helmet and cors middleware with 'standard' preset by default", () => {
      middleware.security();

      expect(middlewareResolver).toHaveBeenCalledWith("helmet", {});
      expect(middlewareResolver).toHaveBeenCalledWith("cors", { origin: true });
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should add helmet, cors, and rate limiting with 'api' preset", () => {
      middleware.security("api");

      expect(middlewareResolver).toHaveBeenCalledWith("helmet", {});
      expect(middlewareResolver).toHaveBeenCalledWith("cors", {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      });
      expect(middlewareResolver).toHaveBeenCalledWith("rateLimit", {
        windowMs: 60000,
        max: 100,
      });
      expect(middleware.getMiddlewarePipeline().length).toBe(3);
    });

    it("should add all security middleware with 'strict' preset", () => {
      middleware.security("strict");

      expect(middlewareResolver).toHaveBeenCalledWith("helmet", {});
      expect(middlewareResolver).toHaveBeenCalledWith("cors", {
        origin: false,
        credentials: true,
      });
      expect(middlewareResolver).toHaveBeenCalledWith("rateLimit", {
        windowMs: 60000,
        max: 60,
      });
    });

    it("should add only cors with 'minimal' preset", () => {
      middleware.security("minimal");

      expect(middlewareResolver).not.toHaveBeenCalledWith(
        "helmet",
        expect.anything(),
      );
      expect(middlewareResolver).toHaveBeenCalledWith("cors", { origin: true });
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });

  describe("Custom Configuration", () => {
    it("should configure helmet with custom options", () => {
      middleware.security({
        headers: { contentSecurityPolicy: false },
        cors: false,
      });

      expect(middlewareResolver).toHaveBeenCalledWith("helmet", {
        contentSecurityPolicy: false,
      });
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should configure cors with custom options", () => {
      middleware.security({
        headers: false,
        cors: { origin: "https://example.com", credentials: true },
      });

      expect(middlewareResolver).toHaveBeenCalledWith("cors", {
        origin: "https://example.com",
        credentials: true,
      });
    });

    it("should configure rate limiting with custom options", () => {
      middleware.security({
        headers: false,
        cors: false,
        rateLimit: { windowMs: 30000, max: 50 },
      });

      expect(middlewareResolver).toHaveBeenCalledWith("rateLimit", {
        windowMs: 30000,
        max: 50,
      });
    });

    it("should disable all security middleware when all options are false", () => {
      middleware.security({
        headers: false,
        cors: false,
        rateLimit: false,
      });

      expect(middleware.getMiddlewarePipeline().length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should not add duplicate middleware when called multiple times", () => {
      middleware.security();
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.security();

      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should not add middleware when resolver returns undefined", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(undefined);

      middleware.security();

      expect(middleware.getMiddlewarePipeline().length).toBe(0);
    });
  });
});

// End of unit tests for: security
