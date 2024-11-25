// Unit tests for: get

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock types and classes
type MockMiddleware = jest.Mock;
class MockLogger {
  info = jest.fn();
}

describe("Route.get() get method", () => {
  let mockApp: express.Application;
  let route: Route;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockApp = express() as any;
    mockLogger = new MockLogger() as any;
    route = new Route(mockApp as any);
  });

  describe("Happy Paths", () => {
    it("should define a GET route with the correct path and handler", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.get("/test", mockHandler, mockMiddleware as any);

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: "get",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      } as any);
    });

    it("should define a GET route with global prefix", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.setGlobalRoutePrefix("/api");
      route.get("/test", mockHandler, mockMiddleware as any);

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: "get",
        path: "/api/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      } as any);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      const mockHandler = jest.fn();

      route.get("/test", mockHandler);

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: "get",
        path: "/test",
        handler: mockHandler,
        middleware: [],
      } as any);
    });

    it("should handle leading and trailing slashes in global prefix and path", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.setGlobalRoutePrefix("/api/");
      route.get("/test/", mockHandler, mockMiddleware as any);

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: "get",
        path: "/api/test/",
        handler: mockHandler,
        middleware: [mockMiddleware],
      } as any);
    });

    it("should handle multiple middleware functions", () => {
      const mockHandler = jest.fn();
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      route.get("/test", mockHandler, mockMiddleware1 as any, mockMiddleware2 as any);

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: "get",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware1, mockMiddleware2],
      } as any);
    });
  });
});

// End of unit tests for: get
