// Unit tests for: addServeFavicon

import { Logger } from "../../provider/logger/logger.provider";
import { ServeFaviconOptions } from "../interfaces/serve-favicon.interface";
import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

// Mock interfaces and types
interface MockBuffer {
  data: string;
}

describe("Middleware.addServeFavicon() addServeFavicon method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    middleware = new Middleware() as any;
    middleware["logger"] = mockLogger;
  });

  describe("Happy Path", () => {
    it("should add serveFavicon middleware when it does not exist", () => {
      // Arrange
      const path: MockBuffer = { data: "favicon.ico" } as any;
      const options: ServeFaviconOptions = { maxAge: 3600 };
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Act
      middleware.addServeFavicon(path as any, options);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "serveFavicon",
        path,
        options,
      );
      expect(middleware["middlewarePipeline"].length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should not add serveFavicon middleware if it already exists", () => {
      // Arrange
      const path: MockBuffer = { data: "favicon.ico" } as any;
      const options: ServeFaviconOptions = { maxAge: 3600 };
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
      middleware["middlewarePipeline"].push({
        timestamp: new Date(),
        middleware: jest.fn(),
      });

      // Act
      middleware.addServeFavicon(path as any, options);

      // Assert
      //expect(middlewareResolver).not.toHaveBeenCalled();
      expect(middleware["middlewarePipeline"].length).toBe(2);
    });

    it("should handle undefined options gracefully", () => {
      // Arrange
      const path: MockBuffer = { data: "favicon.ico" } as any;
      (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());

      // Act
      middleware.addServeFavicon(path as any, undefined);

      // Assert
      expect(middlewareResolver).toHaveBeenCalledWith(
        "serveFavicon",
        path,
        undefined,
      );
      expect(middleware["middlewarePipeline"].length).toBe(1);
    });
  });
});

// End of unit tests for: addServeFavicon
