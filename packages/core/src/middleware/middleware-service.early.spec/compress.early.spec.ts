// Unit tests for: compress

import {
  middlewareResolver,
  isPackageAvailable,
  resolvePackage,
} from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    isPackageAvailable: jest.fn(),
    resolvePackage: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.compress() compress method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
    (isPackageAvailable as jest.Mock).mockReturnValue(false);
    (resolvePackage as jest.Mock).mockReturnValue(null);
  });

  describe("Happy Path", () => {
    it("should add compression middleware with default options", () => {
      middleware.compress();

      expect(middlewareResolver).toHaveBeenCalledWith(
        "compression",
        undefined,
      );
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should add compression middleware with custom options", () => {
      const options = { level: 6, threshold: 1024 };

      middleware.compress(options);

      expect(middlewareResolver).toHaveBeenCalledWith("compression", options);
    });

    it("should prefer shrink-ray when implementation is auto and shrink-ray is available", () => {
      const mockShrinkRay = jest.fn().mockReturnValue(jest.fn());
      (isPackageAvailable as jest.Mock).mockReturnValue(true);
      (resolvePackage as jest.Mock).mockReturnValue(mockShrinkRay);

      middleware.compress({ implementation: "auto" });

      expect(resolvePackage).toHaveBeenCalledWith("shrink-ray-current");
      expect(middleware.getMiddlewarePipeline().length).toBe(1);
    });

    it("should use shrink-ray when explicitly specified", () => {
      const mockShrinkRay = jest.fn().mockReturnValue(jest.fn());
      (resolvePackage as jest.Mock).mockReturnValue(mockShrinkRay);

      middleware.compress({ implementation: "shrink-ray" });

      expect(resolvePackage).toHaveBeenCalledWith("shrink-ray-current");
    });

    it("should use compression when shrink-ray implementation specified but not available", () => {
      (resolvePackage as jest.Mock).mockReturnValue(null);

      middleware.compress({ implementation: "compression" });

      expect(middlewareResolver).toHaveBeenCalledWith("compression", {
        implementation: "compression",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should not add duplicate compression middleware", () => {
      middleware.compress();
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.compress();

      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });

    it("should not add middleware when resolver returns undefined", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(undefined);

      middleware.compress();

      expect(middleware.getMiddlewarePipeline().length).toBe(0);
    });

    it("should handle empty options object", () => {
      middleware.compress({});

      expect(middlewareResolver).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: compress
