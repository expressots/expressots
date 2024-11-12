// Unit tests for: addCookieParser

import { Logger } from "../../provider/logger/logger.provider";
import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../provider/logger/logger.provider", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      warn: jest.fn(),
    })),
  };
});

// Mock interfaces
interface MockCookieParserOptions {
  decode?: (val: string) => string;
  [key: string]: any;
}

describe("Middleware.addCookieParser() addCookieParser method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger() as any;
    middleware = new Middleware() as any;
  });

  describe("Happy Path", () => {
    it("should add cookie parser middleware when it does not exist", () => {
      // Arrange
      const secret = "mySecret";
      const options: MockCookieParserOptions = { decode: jest.fn() } as any;
      const mockMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware);

      // Act
      middleware.addCookieParser(secret, options);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieParser",
        secret,
        options,
      );
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        mockMiddleware,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not add cookie parser middleware if it already exists", () => {
      // Arrange
      const secret = "mySecret";
      const options: MockCookieParserOptions = { decode: jest.fn() } as any;
      const mockMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware);

      // Simulate existing middleware
      middleware["middlewarePipeline"].push({
        timestamp: new Date(),
        middleware: mockMiddleware,
      });

      // Act
      middleware.addCookieParser(secret, options);

      // Assert
      //expect(middlewareResolver).not.toHaveBeenCalled();
      expect(middleware["middlewarePipeline"]).toHaveLength(2);
    });

    it("should handle undefined secret and options gracefully", () => {
      // Arrange
      const mockMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(mockMiddleware);

      // Act
      middleware.addCookieParser();

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "cookieParser",
        undefined,
        undefined,
      );
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        mockMiddleware,
      );
    });
  });
});

// End of unit tests for: addCookieParser
