// Unit tests for: put

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock definitions
type MockMiddleware = jest.Mock;
class MockLogger {
  info = jest.fn();
}
type MockRouteDefinition = {
  method: string;
  path: string;
  handler: express.RequestHandler;
  middleware: Array<MockMiddleware>;
};

describe("Route.put() put method", () => {
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
    it("should define a PUT route with the correct path and handler", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.put("/test", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "put",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect(route.Routes).toContainEqual(expectedRoute as any);
    });

    it("should define a PUT route with global prefix", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();
      route.setGlobalRoutePrefix("/api");

      route.put("/test", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "put",
        path: "/api/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect(route.Routes).toContainEqual(expectedRoute as any);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      const mockHandler = jest.fn();

      route.put("/test", mockHandler);

      const expectedRoute: MockRouteDefinition = {
        method: "put",
        path: "/test",
        handler: mockHandler,
        middleware: [],
      };

      expect(route.Routes).toContainEqual(expectedRoute as any);
    });

    it("should handle leading and trailing slashes in global prefix and path", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();
      route.setGlobalRoutePrefix("/api/");

      route.put("/test/", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "put",
        path: "/api/test/",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect(route.Routes).toContainEqual(expectedRoute as any);
    });
  });
});

// End of unit tests for: put
