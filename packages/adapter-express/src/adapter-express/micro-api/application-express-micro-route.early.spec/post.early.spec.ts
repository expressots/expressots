// Unit tests for: post

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock definitions
type MockMiddleware = jest.Mock;
class MockLogger {
  info = jest.fn();
}

describe("Route.post() post method", () => {
  let mockApp: express.Application;
  let route: Route;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockApp = express() as any;
    mockLogger = new MockLogger() as any;
    route = new Route(mockApp as any);
    (route as any).logger = mockLogger;
  });

  describe("Happy Paths", () => {
    it("should define a POST route with the correct path and handler", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.post("/test", mockHandler, mockMiddleware as any);

      expect((route as any).routes).toHaveLength(1);
      expect((route as any).routes[0]).toEqual({
        method: "post",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      } as any);
    });

    it("should apply global prefix to the route path", () => {
      const mockHandler = jest.fn();
      route.setGlobalRoutePrefix("/api");

      route.post("/test", mockHandler);

      expect((route as any).routes[0].path).toBe("/api/test");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      const mockHandler = jest.fn();

      route.post("/test", mockHandler);

      expect((route as any).routes[0].middleware).toEqual([]);
    });

    it("should handle leading and trailing slashes in global prefix and path", () => {
      const mockHandler = jest.fn();
      route.setGlobalRoutePrefix("/api/");

      route.post("/test/", mockHandler);

      expect((route as any).routes[0].path).toBe("/api/test");
    });

    it("should handle multiple middleware functions", () => {
      const mockHandler = jest.fn();
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      route.post("/test", mockHandler, mockMiddleware1 as any, mockMiddleware2 as any);

      expect((route as any).routes[0].middleware).toEqual([mockMiddleware1, mockMiddleware2]);
    });
  });
});

// End of unit tests for: post
