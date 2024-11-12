// Unit tests for: addHelmet

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

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock interfaces and types
interface MockOptionsHelmet {
  contentSecurityPolicy?: boolean;
}

describe("Middleware.addHelmet() addHelmet method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    middleware = new Middleware();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should add helmet middleware when it does not exist", () => {
      // Arrange
      const mockOptions: MockOptionsHelmet = { contentSecurityPolicy: false };
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addHelmet(mockOptions as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith("helmet", mockOptions);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should not add helmet middleware if it already exists", () => {
      // Arrange
      const mockOptions: MockOptionsHelmet = { contentSecurityPolicy: false };
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});
      middleware.addHelmet(mockOptions as any);

      // Act
      middleware.addHelmet(mockOptions as any);

      // Assert
      expect(middleware.getMiddlewarePipeline().length).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options gracefully", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addHelmet(undefined as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith("helmet", undefined);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should handle null options gracefully", () => {
      // Arrange
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      // Act
      middleware.addHelmet(null as any);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith("helmet", null);
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });
  });
});

// End of unit tests for: addHelmet
