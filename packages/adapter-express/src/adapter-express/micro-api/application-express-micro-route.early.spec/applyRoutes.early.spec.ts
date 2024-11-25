// Unit tests for: applyRoutes

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock classes and interfaces

describe("Route.applyRoutes() applyRoutes method", () => {
  let mockApp: express.Application;
  let route: Route;

  beforeEach(() => {
    mockApp = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    } as any;

    route = new Route(mockApp as any);
  });

  describe("Happy paths", () => {
    it("should apply a GET route correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.get("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.get).toHaveBeenCalledWith("/test", ...middleware, handler);
    });

    it("should apply a POST route correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.post("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.post).toHaveBeenCalledWith("/test", ...middleware, handler);
    });

    it("should apply a PUT route correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.put("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.put).toHaveBeenCalledWith("/test", ...middleware, handler);
    });

    it("should apply a DELETE route correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.delete("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.delete).toHaveBeenCalledWith("/test", ...middleware, handler);
    });

    it("should apply a PATCH route correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.patch("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.patch).toHaveBeenCalledWith("/test", ...middleware, handler);
    });
  });

  describe("Edge cases", () => {
    it("should handle routes with no middleware", () => {
      const handler = jest.fn();

      route.get("/test", handler);
      route.applyRoutes();

      expect(mockApp.get).toHaveBeenCalledWith("/test", handler);
    });

    it("should handle routes with multiple middleware", () => {
      const handler = jest.fn();
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      route.get("/test", handler, middleware1, middleware2);
      route.applyRoutes();

      expect(mockApp.get).toHaveBeenCalledWith("/test", middleware1, middleware2, handler);
    });

    it("should apply global prefix to routes", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.setGlobalRoutePrefix("/api");
      route.get("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.get).toHaveBeenCalledWith("/api/test", ...middleware, handler);
    });

    it("should normalize paths correctly", () => {
      const handler = jest.fn();
      const middleware = [jest.fn()];

      route.setGlobalRoutePrefix("/api/");
      route.get("/test", handler, ...middleware);
      route.applyRoutes();

      expect(mockApp.get).toHaveBeenCalledWith("/api/test", ...middleware, handler);
    });
  });
});

// End of unit tests for: applyRoutes
