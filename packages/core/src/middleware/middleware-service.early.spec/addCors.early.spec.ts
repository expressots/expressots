// Unit tests for: addCors

import { Logger } from "../../provider/logger/logger.provider";
import { middlewareResolver } from "../middleware-resolver";
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

// Mock interfaces and types
interface MockCorsOptions {
  origin?: string;
  methods?: string[];
}

describe("Middleware.addCors() addCors method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should add CORS middleware when it does not already exist", () => {
      const mockCorsOptions: MockCorsOptions = { origin: "http://example.com" };
      const mockMiddleware = jest.fn();

      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware as any);

      middleware.addCors(mockCorsOptions as any);

      expect(middlewareResolver).toHaveBeenCalledWith("cors", mockCorsOptions);
      expect(middleware.getMiddlewarePipeline()).toHaveLength(1);
      expect(middleware.getMiddlewarePipeline()[0].middleware).toBe(
        mockMiddleware,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not add CORS middleware if it already exists", () => {
      const mockCorsOptions: MockCorsOptions = { origin: "http://example.com" };
      const mockMiddleware = jest.fn();

      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware as any);

      // Add CORS middleware for the first time
      middleware.addCors(mockCorsOptions as any);
      // Attempt to add CORS middleware again
      middleware.addCors(mockCorsOptions as any);

      expect(middlewareResolver).toHaveBeenCalledTimes(3);
      expect(middleware.getMiddlewarePipeline()).toHaveLength(2);
    });

    it("should handle undefined options gracefully", () => {
      const mockMiddleware = jest.fn();

      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware as any);

      middleware.addCors(undefined as any);

      expect(middlewareResolver).toHaveBeenCalledWith("cors", undefined);
      expect(middleware.getMiddlewarePipeline()).toHaveLength(1);
      expect(middleware.getMiddlewarePipeline()[0].middleware).toBe(
        mockMiddleware,
      );
    });

    it("should not add middleware if middlewareResolver returns undefined", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(undefined);

      middleware.addCors({} as any);

      expect(middleware.getMiddlewarePipeline()).toHaveLength(0);
    });
  });
});

// End of unit tests for: addCors
