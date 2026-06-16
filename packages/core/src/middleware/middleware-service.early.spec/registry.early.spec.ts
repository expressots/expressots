// Unit tests for: registry methods (register, get, has, getRegisteredNames)

import { Middleware } from "../middleware-service";
import { resetMiddlewareRegistry } from "../middleware-registry";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    getResolverStartupWarnings: jest.fn().mockReturnValue([]),
    clearResolverStartupWarnings: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware Registry Methods", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton registry before each test
    resetMiddlewareRegistry();
    middleware = new Middleware();
  });

  describe("register()", () => {
    it("should register a single middleware handler", () => {
      const handler = jest.fn((req: any, res: any, next: any) => next());

      middleware.register("auth", handler);

      expect(middleware.has("auth")).toBe(true);
    });

    it("should register an array of middleware handlers", () => {
      const handlers = [
        jest.fn((req: any, res: any, next: any) => next()),
        jest.fn((req: any, res: any, next: any) => next()),
      ];

      middleware.register("validators", handlers);

      expect(middleware.has("validators")).toBe(true);
    });

    it("should register ExpressoMiddleware class instance", () => {
      // ExpressoMiddleware instance has a `use` method
      const middlewareInstance = {
        use: jest.fn((req: any, res: any, next: any) => next()),
      };

      middleware.register("custom", middlewareInstance);

      expect(middleware.has("custom")).toBe(true);
    });

    it("should track registered names for startup logs", () => {
      middleware.register(
        "auth",
        jest.fn((req: any, res: any, next: any) => next()),
      );
      middleware.register(
        "validation",
        jest.fn((req: any, res: any, next: any) => next()),
      );

      const logs = middleware.getStartupLogs();

      expect(logs.some((log) => log.message.includes("auth"))).toBe(true);
      expect(logs.some((log) => log.message.includes("validation"))).toBe(true);
    });
  });

  describe("get()", () => {
    it("should return registered middleware handler", () => {
      const handler = jest.fn((req: any, res: any, next: any) => next());
      middleware.register("test", handler);

      const retrieved = middleware.get("test");

      expect(retrieved).toBe(handler);
    });

    it("should return undefined for non-existent middleware", () => {
      const retrieved = middleware.get("nonExistent");

      expect(retrieved).toBeUndefined();
    });

    it("should return array of handlers when registered as array", () => {
      const handlers = [
        jest.fn((req: any, res: any, next: any) => next()),
        jest.fn((req: any, res: any, next: any) => next()),
      ];
      middleware.register("multi", handlers);

      const retrieved = middleware.get("multi");

      expect(Array.isArray(retrieved)).toBe(true);
      expect(retrieved).toHaveLength(2);
    });
  });

  describe("has()", () => {
    it("should return true for registered middleware", () => {
      middleware.register(
        "exists",
        jest.fn((req: any, res: any, next: any) => next()),
      );

      expect(middleware.has("exists")).toBe(true);
    });

    it("should return false for non-registered middleware", () => {
      expect(middleware.has("notExists")).toBe(false);
    });
  });

  describe("getRegisteredNames()", () => {
    it("should return empty array when no middleware registered", () => {
      expect(middleware.getRegisteredNames()).toEqual([]);
    });

    it("should return all registered middleware names", () => {
      middleware.register(
        "auth",
        jest.fn((req: any, res: any, next: any) => next()),
      );
      middleware.register(
        "validation",
        jest.fn((req: any, res: any, next: any) => next()),
      );
      middleware.register(
        "logging",
        jest.fn((req: any, res: any, next: any) => next()),
      );

      const names = middleware.getRegisteredNames();

      expect(names).toContain("auth");
      expect(names).toContain("validation");
      expect(names).toContain("logging");
      expect(names).toHaveLength(3);
    });
  });

  describe("Startup Logs", () => {
    it("should get startup logs", () => {
      middleware.register(
        "test",
        jest.fn((req: any, res: any, next: any) => next()),
      );

      const logs = middleware.getStartupLogs();

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should clear startup logs", () => {
      middleware.register(
        "test",
        jest.fn((req: any, res: any, next: any) => next()),
      );
      middleware.clearStartupLogs();

      const logs = middleware.getStartupLogs();

      expect(logs.some((log) => log.message.includes("test"))).toBe(false);
    });
  });
});

// End of unit tests for: registry methods
