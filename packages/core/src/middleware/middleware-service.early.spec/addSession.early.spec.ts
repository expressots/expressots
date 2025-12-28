// Unit tests for: addSession

import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

// Mocking the necessary imports
jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

interface MockSessionOptions {
  secret?: string;
  resave?: boolean;
  saveUninitialized?: boolean;
}

describe("Middleware.addSession() addSession method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should add a session middleware when it does not already exist", () => {
      const mockSessionOptions: MockSessionOptions = {
        secret: "testSecret",
        resave: false,
        saveUninitialized: true,
      };

      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      middleware.addSession(mockSessionOptions as any);

      expect(middlewareResolver).toHaveBeenCalledWith(
        "session",
        mockSessionOptions,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should not add a session middleware if it already exists", () => {
      const mockSessionOptions: MockSessionOptions = {
        secret: "testSecret",
        resave: false,
        saveUninitialized: true,
      };

      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Add the session middleware once
      middleware.addSession(mockSessionOptions as any);
      const initialLength = middleware.getMiddlewarePipeline().length;
      const initialCallCount = (middlewareResolver as jest.Mock).mock.calls
        .length;

      // Try to add the same session middleware again
      middleware.addSession(mockSessionOptions as any);

      // Assert - Resolver NOT called again (early return when duplicate detected)
      expect(middlewareResolver).toHaveBeenCalledTimes(initialCallCount);
      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should handle undefined session options gracefully", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      middleware.addSession(undefined as any);

      expect(middlewareResolver).toHaveBeenCalledWith("session", undefined);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should handle null session options gracefully", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      middleware.addSession(null as any);

      expect(middlewareResolver).toHaveBeenCalledWith("session", null);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });
});

// End of unit tests for: addSession
