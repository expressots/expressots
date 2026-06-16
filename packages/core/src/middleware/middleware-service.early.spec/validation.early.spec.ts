// Unit tests for: addValidation

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

describe("Middleware.addValidation() addValidation method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should configure validation with options", () => {
      middleware.addValidation({
        smartDetection: true,
        autoDetection: true,
      });

      const config = middleware.getValidationConfig();
      expect(config).toBeDefined();
      expect(config?.smartDetection).toBe(true);
      expect(config?.autoDetection).toBe(true);
    });

    it("should configure validation without options", () => {
      middleware.addValidation();

      const config = middleware.getValidationConfig();
      expect(config).toBeDefined();
    });
  });

  describe("Validation Service Factory", () => {
    it("should set validation service factory", () => {
      const mockFactory = jest.fn().mockReturnValue({ validate: jest.fn() });

      middleware.setValidationServiceFactory(mockFactory);
      const service = middleware.getValidationService();

      expect(mockFactory).toHaveBeenCalled();
      expect(service).toBeDefined();
    });

    it("should return undefined when factory not set", () => {
      const service = middleware.getValidationService();

      expect(service).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined config when not configured", () => {
      const config = middleware.getValidationConfig();
      expect(config).toBeUndefined();
    });

    it("should handle empty options object", () => {
      middleware.addValidation({});

      const config = middleware.getValidationConfig();
      expect(config).toEqual({});
    });
  });
});

// End of unit tests for: addValidation
