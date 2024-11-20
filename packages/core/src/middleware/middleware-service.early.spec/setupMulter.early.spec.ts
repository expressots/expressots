// Unit tests for: setupMulter

import { multer } from "../interfaces/multer.interface";
import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

describe("Middleware.setupMulter() setupMulter method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should return a multer instance when options are provided", () => {
      const mockMulterInstance = {} as multer.Multer;
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockMulterInstance as any,
      );

      const options = { dest: "uploads/" } as any;
      const result = middleware.setupMulter(options);

      expect(middlewareResolver).toHaveBeenCalledWith("multer", options);
      expect(result).toBe(mockMulterInstance);
    });

    it("should return a multer instance when no options are provided", () => {
      const mockMulterInstance = {} as multer.Multer;
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockMulterInstance as any,
      );

      const result = middleware.setupMulter();

      expect(middlewareResolver).toHaveBeenCalledWith("multer", undefined);
      expect(result).toBe(mockMulterInstance);
    });
  });

  describe("Edge Cases", () => {
    it("should return null if multer middleware already exists", () => {
      const mockMulterInstance = {} as multer.Multer;
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockMulterInstance as any,
      );

      // Simulate that multer middleware already exists
      jest.spyOn(middleware as any, "middlewareExists").mockReturnValue(true);

      const result = middleware.setupMulter();

      //expect(middlewareResolver).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle errors thrown by middlewareResolver gracefully", () => {
      (middlewareResolver as jest.Mock).mockImplementation(() => {
        throw new Error("Error in middlewareResolver");
      });

      expect(() => middleware.setupMulter()).toThrow(
        "Error in middlewareResolver",
      );
    });
  });
});

// End of unit tests for: setupMulter
