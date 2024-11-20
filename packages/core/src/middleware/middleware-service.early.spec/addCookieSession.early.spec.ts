// Unit tests for: addCookieSession

import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

// Mocking the middlewareResolver function
jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

// Mock interfaces
interface MockCookieSessionOptions {
  name?: string;
  keys?: string[];
}

describe("Middleware.addCookieSession() addCookieSession method", () => {
  let middleware: Middleware;
  let mockOptions: MockCookieSessionOptions;

  beforeEach(() => {
    middleware = new Middleware();
    mockOptions = {
      name: "session",
      keys: ["key1", "key2"],
    };
    (middlewareResolver as jest.Mock).mockClear();
  });

  describe("Happy Path", () => {
    it("should add a cookie session middleware when it does not exist", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addCookieSession(mockOptions as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieSession",
        mockOptions,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should not add a duplicate cookie session middleware", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});
      middleware.addCookieSession(mockOptions as any);

      // Act
      middleware.addCookieSession(mockOptions as any);

      // Assert
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });

    it("should handle undefined options gracefully", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addCookieSession(undefined as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieSession",
        undefined,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should handle null options gracefully", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addCookieSession(null as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith("cookieSession", null);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });
});

// End of unit tests for: addCookieSession
