// Unit tests for: addContentNegotiation

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

describe("Middleware.addContentNegotiation() addContentNegotiation method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should configure content negotiation service", () => {
      middleware.addContentNegotiation();

      const service = middleware.getContentNegotiationService();
      expect(service).toBeDefined();
    });

    it("should configure content negotiation with custom options", () => {
      middleware.addContentNegotiation({
        defaultFormat: "application/json",
        strictMode: true,
      });

      const service = middleware.getContentNegotiationService();
      expect(service).toBeDefined();
    });

    it("should reuse existing service on multiple calls", () => {
      middleware.addContentNegotiation();
      const service1 = middleware.getContentNegotiationService();

      middleware.addContentNegotiation({ defaultFormat: "application/xml" });
      const service2 = middleware.getContentNegotiationService();

      expect(service1).toBe(service2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options object", () => {
      middleware.addContentNegotiation({});

      const service = middleware.getContentNegotiationService();
      expect(service).toBeDefined();
    });

    it("should return undefined service when not configured", () => {
      const service = middleware.getContentNegotiationService();
      expect(service).toBeUndefined();
    });
  });
});

// End of unit tests for: addContentNegotiation
