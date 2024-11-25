// Unit tests for: patch

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock definitions
type MockMiddleware = jest.Mock;
class MockLogger {
  info = jest.fn();
}

describe("Route.patch() patch method", () => {
  let mockApp: express.Application;
  let mockLogger: MockLogger;
  let route: Route;

  beforeEach(() => {
    mockApp = express() as any;
    mockLogger = new MockLogger() as any;
    route = new Route(mockApp as any);
    (route as any).logger = mockLogger;
  });

  describe("Happy Paths", () => {
    it("should define a PATCH route with the correct path and handler", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.patch("/test", mockHandler, mockMiddleware as any);

      const expectedPath = "/test";
      const expectedMethod = "patch";

      expect(route.Routes).toHaveLength(1);
      expect(route.Routes[0]).toEqual({
        method: expectedMethod,
        path: expectedPath,
        handler: mockHandler,
        middleware: [mockMiddleware],
      } as any);
    });

    it("should apply global prefix to the route path", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();
      route.setGlobalRoutePrefix("/api");

      route.patch("/test", mockHandler, mockMiddleware as any);

      const expectedPath = "/api/test";

      expect(route.Routes[0].path).toBe(expectedPath);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      const mockHandler = jest.fn();

      route.patch("/test", mockHandler);

      expect(route.Routes[0].middleware).toEqual([]);
    });

    it("should handle leading and trailing slashes in global prefix and path", () => {
      const mockHandler = jest.fn();
      route.setGlobalRoutePrefix("/api/");

      route.patch("/test/", mockHandler);

      const expectedPath = "/api/test/";

      expect(route.Routes[0].path).toBe(expectedPath);
    });

    it("should handle multiple middleware functions", () => {
      const mockHandler = jest.fn();
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      route.patch("/test", mockHandler, mockMiddleware1 as any, mockMiddleware2 as any);

      expect(route.Routes[0].middleware).toEqual([mockMiddleware1, mockMiddleware2]);
    });
  });
});

// End of unit tests for: patch
