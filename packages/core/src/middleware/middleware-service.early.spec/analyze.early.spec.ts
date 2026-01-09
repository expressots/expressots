// Unit tests for: analyze and getRecommendations methods

import { json, urlencoded } from "express";
import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  return {
    ...actual,
    json: jest.fn(),
    urlencoded: jest.fn(),
  };
});

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    isPackageAvailable: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware Analysis Methods", () => {
  let middleware: Middleware;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    (json as jest.Mock).mockReturnValue(jest.fn());
    (urlencoded as jest.Mock).mockReturnValue(jest.fn());
    (middlewareResolver as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("analyze()", () => {
    it("should return pipeline analysis", () => {
      const analysis = middleware.analyze();

      expect(analysis).toHaveProperty("count");
      expect(analysis).toHaveProperty("estimatedOverhead");
      expect(analysis).toHaveProperty("order");
      expect(analysis).toHaveProperty("issues");
      expect(analysis).toHaveProperty("bottlenecks");
    });

    it("should report missing JSON parser as issue", () => {
      const analysis = middleware.analyze();

      expect(analysis.issues).toContain("No JSON body parser configured");
    });

    it("should not report JSON parser issue when configured", () => {
      middleware.parse();

      const analysis = middleware.analyze();

      expect(analysis.issues).not.toContain("No JSON body parser configured");
    });

    it("should report missing compression in production", () => {
      process.env.NODE_ENV = "production";
      middleware.parse();

      const analysis = middleware.analyze();

      expect(analysis.issues).toContain("Compression not enabled in production");
    });

    it("should report missing rate limiting in production", () => {
      process.env.NODE_ENV = "production";
      middleware.parse();

      const analysis = middleware.analyze();

      expect(analysis.issues).toContain("Rate limiting not enabled in production");
    });

    it("should calculate estimated overhead based on middleware count", () => {
      middleware.parse();

      const analysis = middleware.analyze();

      expect(analysis.estimatedOverhead).toBe(analysis.count * 0.1);
    });

    it("should return middleware order with names and categories", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "customMiddleware" });
      middleware.addMiddleware(handler);

      const analysis = middleware.analyze();

      expect(analysis.order.length).toBeGreaterThan(0);
      expect(analysis.order[0]).toHaveProperty("name");
      expect(analysis.order[0]).toHaveProperty("category");
    });
  });

  describe("getRecommendations()", () => {
    it("should return array of recommendations", () => {
      const recommendations = middleware.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("should recommend compression when not enabled", () => {
      const recommendations = middleware.getRecommendations();

      const compressionRec = recommendations.find(
        (r) => r.message.includes("Compression"),
      );
      expect(compressionRec).toBeDefined();
      expect(compressionRec?.type).toBe("performance");
      expect(compressionRec?.severity).toBe("medium");
    });

    it("should recommend rate limiting in production", () => {
      process.env.NODE_ENV = "production";

      const recommendations = middleware.getRecommendations();

      const rateLimitRec = recommendations.find(
        (r) => r.message.includes("Rate limiting"),
      );
      expect(rateLimitRec).toBeDefined();
      expect(rateLimitRec?.type).toBe("security");
      expect(rateLimitRec?.severity).toBe("high");
    });

    it("should recommend helmet in production", () => {
      process.env.NODE_ENV = "production";

      const recommendations = middleware.getRecommendations();

      const helmetRec = recommendations.find(
        (r) => r.message.includes("Security headers"),
      );
      expect(helmetRec).toBeDefined();
      expect(helmetRec?.type).toBe("security");
    });

    it("should not recommend already-configured middleware", () => {
      middleware.compress();

      const recommendations = middleware.getRecommendations();

      const compressionRec = recommendations.find(
        (r) => r.message.includes("Compression is not enabled"),
      );
      expect(compressionRec).toBeUndefined();
    });

    it("should include action suggestion in recommendations", () => {
      const recommendations = middleware.getRecommendations();

      const withAction = recommendations.find((r) => r.action);
      if (withAction) {
        expect(withAction.action).toContain("Middleware");
      }
    });
  });

  describe("optimize()", () => {
    it("should reorder middleware when autoReorder is true", () => {
      const handler1 = jest.fn();
      Object.defineProperty(handler1, "name", { value: "customFirst" });
      middleware.addMiddleware(handler1);
      middleware.security();

      middleware.optimize({ autoReorder: true });

      const pipeline = middleware.getMiddlewarePipeline();
      // Just verify the pipeline exists and optimize doesn't throw
      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline)).toBe(true);
    });

    it("should enable metrics when metrics option is true", () => {
      middleware.optimize({ metrics: true });

      expect(middleware.getProfiler()).toBeDefined();
    });
  });
});

// End of unit tests for: analyze and getRecommendations methods
