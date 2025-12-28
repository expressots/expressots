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
    it("should return null if middlewareResolver returns null", () => {
      // setupMulter doesn't check for duplicates, it just returns what resolver returns
      (middlewareResolver as jest.Mock).mockReturnValue(null);

      const result = middleware.setupMulter();

      expect(middlewareResolver).toHaveBeenCalledWith("multer", undefined);
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
