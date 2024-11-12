// Unit tests for: addBodyParser

import { json } from "express";
import { Logger } from "../../provider/logger/logger.provider";
import { Middleware } from "../middleware-service";

// Mocking the express module
jest.mock("express", () => {
    const actualExpress = jest.requireActual("express");
  return {
    ...actualExpress,
    json: jest.fn(),
  };
});

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

// Mock interfaces
interface MockOptionsJson {
  limit?: string;
  strict?: boolean;
}

// Test suite for addBodyParser method
describe("Middleware.addBodyParser() addBodyParser method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = new Logger();
    middleware = new Middleware() as any;
    middleware["logger"] = mockLogger;
  });

  describe("Happy Path", () => {
    it("should add a JSON body parser middleware when it does not exist", () => {
      // Arrange
      const mockOptions: MockOptionsJson = { limit: "1mb" };
      const mockJsonMiddleware = jest.fn();
      (json as jest.Mock).mockReturnValue(mockJsonMiddleware);

      // Act
      middleware.addBodyParser(mockOptions as any);

      // Assert
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        mockJsonMiddleware,
      );
    });

    it("should not add a JSON body parser middleware if it already exists", () => {
      // Arrange
      const mockOptions: MockOptionsJson = { limit: "1mb" };
      const mockJsonMiddleware = jest.fn();

      // Act
      middleware.addBodyParser(mockOptions as any);

      // Assert
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options gracefully", () => {
      // Arrange
      const mockJsonMiddleware = jest.fn();
      (json as jest.Mock).mockReturnValue(mockJsonMiddleware);

      // Act
      middleware.addBodyParser(undefined as any);

      // Assert
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        mockJsonMiddleware,
      );
    });

    it("should handle empty options object gracefully", () => {
      // Arrange
      const mockOptions: MockOptionsJson = {};
      const mockJsonMiddleware = jest.fn();
      (json as jest.Mock).mockReturnValue(mockJsonMiddleware);

      // Act
      middleware.addBodyParser(mockOptions as any);

      // Assert
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        mockJsonMiddleware,
      );
    });
  });
});

// End of unit tests for: addBodyParser
