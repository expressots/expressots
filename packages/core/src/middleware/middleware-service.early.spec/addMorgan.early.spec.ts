// Unit tests for: addMorgan

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

interface MockOptionsMorgan {
  stream?: any;
  skip?: (req: any, res: any) => boolean;
}

describe("Middleware.addMorgan() addMorgan method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger() as any;
    middleware = new Middleware() as any;
  });

  describe("Happy Path", () => {
    it("should add Morgan middleware when it does not exist", () => {
      // Arrange
      const format = "combined";
      const options: MockOptionsMorgan = { stream: process.stdout };
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Act
      middleware.addMorgan(format, options as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "morgan",
        format,
        options,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should not add Morgan middleware if it already exists", () => {
      // Arrange
      const format = "combined";
      const options: MockOptionsMorgan = { stream: process.stdout };
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Add Morgan once
      middleware.addMorgan(format, options as any);
      const initialLength = middleware.getMiddlewarePipeline().length;
      const initialCallCount = (middlewareResolver as jest.Mock).mock.calls.length;

      // Act - Try to add again
      middleware.addMorgan(format, options as any);

      // Assert - Resolver NOT called again (early return when duplicate detected)
      expect(middlewareResolver).toHaveBeenCalledTimes(initialCallCount);
      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should handle undefined options gracefully", () => {
      // Arrange
      const format = "combined";
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Act
      middleware.addMorgan(format, undefined);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "morgan",
        format,
        undefined,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should handle function format correctly", () => {
      // Arrange
      const format = jest.fn();
      const options: MockOptionsMorgan = { stream: process.stdout };
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Act
      middleware.addMorgan(format, options as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "morgan",
        format,
        options,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });
});

// End of unit tests for: addMorgan
