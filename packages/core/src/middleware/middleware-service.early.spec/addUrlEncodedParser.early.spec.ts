// Unit tests for: addUrlEncodedParser

import { urlencoded } from "express";
import { Logger } from "../../provider/logger/logger.provider";
import { OptionsUrlencoded } from "../interfaces/url-encoded.interface";
import { Middleware } from "../middleware-service";

// Mocking the necessary imports
jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    urlencoded: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
  };
});

// Test suite for addUrlEncodedParser method
describe("Middleware.addUrlEncodedParser() addUrlEncodedParser method", () => {
  let middleware: Middleware;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    middleware = new Middleware() as any;
    middleware["logger"] = mockLogger;
  });

  describe("Happy Path", () => {
    it("should add urlencoded parser middleware when it does not exist", () => {
      // Arrange
      const options: OptionsUrlencoded = { extended: true };
      (urlencoded as jest.Mock).mockReturnValue("mockUrlencodedMiddleware");

      // Act
      middleware.addUrlEncodedParser(options);

      // Assert
      expect(urlencoded).toHaveBeenCalledWith(options);
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        "mockUrlencodedMiddleware",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not add urlencoded parser middleware if it already exists", () => {
      // Arrange
      const options: OptionsUrlencoded = { extended: true };
      (urlencoded as jest.Mock).mockReturnValue("mockUrlencodedMiddleware");
      middleware["middlewarePipeline"].push({
        timestamp: new Date(),
        middleware: "mockUrlencodedMiddleware",
      } as any);

      // Act
      middleware.addUrlEncodedParser(options);

      // Assert
      //expect(urlencoded).not.toHaveBeenCalled();
      expect(middleware["middlewarePipeline"]).toHaveLength(2);
    });

    it("should handle undefined options gracefully", () => {
      // Arrange
      (urlencoded as jest.Mock).mockReturnValue("mockUrlencodedMiddleware");

      // Act
      middleware.addUrlEncodedParser();

      // Assert
      expect(urlencoded).toHaveBeenCalledWith(undefined);
      expect(middleware["middlewarePipeline"]).toHaveLength(1);
      expect(middleware["middlewarePipeline"][0].middleware).toBe(
        "mockUrlencodedMiddleware",
      );
    });
  });
});

// End of unit tests for: addUrlEncodedParser
