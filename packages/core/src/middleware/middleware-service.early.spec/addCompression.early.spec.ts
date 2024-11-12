// Unit tests for: addCompression

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
interface MockCompressionOptions {
  level?: number;
  threshold?: number;
  filter?: (req: any, res: any) => boolean;
}

describe("Middleware.addCompression() addCompression method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = new Logger();
    middleware = new Middleware() as any;
    middleware["logger"] = mockLogger;
  });

  describe("Happy Path", () => {
    it("should add compression middleware when it does not exist", () => {
      const mockCompressionOptions: MockCompressionOptions = {
        level: 6,
        threshold: 1024,
      };

      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      middleware.addCompression(mockCompressionOptions as any);

      expect(middlewareResolver).toHaveBeenCalledWith(
        "compression",
        mockCompressionOptions,
      );
      expect(middleware["middlewarePipeline"].length).toBe(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should not add compression middleware if it already exists", () => {
      const mockCompressionOptions: MockCompressionOptions = {
        level: 6,
        threshold: 1024,
      };

      (middlewareResolver as jest.Mock).mockReturnValue(() => {});
      middleware["middlewarePipeline"].push({
        timestamp: new Date(),
        middleware: () => {},
      } as any);

      middleware.addCompression(mockCompressionOptions as any);

      expect(middleware["middlewarePipeline"].length).toBe(2);
    });

    it("should handle undefined options gracefully", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(() => {});

      middleware.addCompression(undefined as any);

      expect(middlewareResolver).toHaveBeenCalledWith("compression", undefined);
      expect(middleware["middlewarePipeline"].length).toBe(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBeDefined();
    });
  });
});

// End of unit tests for: addCompression
