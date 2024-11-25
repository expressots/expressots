// Unit tests for: define

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock types and classes
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

describe("Route.define() define method", () => {
  let mockApp: express.Application;
  let route: Route;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockApp = express() as any;
    mockLogger = new MockLogger() as any;
    route = new Route(mockApp as any);
    (route as any).logger = mockLogger;
  });

  describe("Happy paths", () => {
    it("should add a route with the correct method, path, and handler", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.define("get", "/test", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "get",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect((route as any).routes).toContainEqual(expectedRoute as any);
    });

    it("should normalize the path with global prefix", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.setGlobalRoutePrefix("/api");
      route.define("post", "/test", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "post",
        path: "/api/test",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect((route as any).routes).toContainEqual(expectedRoute as any);
    });
  });

  describe("Edge cases", () => {
    it("should handle leading and trailing slashes in global prefix and path", () => {
      const mockHandler = jest.fn();
      const mockMiddleware: MockMiddleware = jest.fn();

      route.setGlobalRoutePrefix("/api/");
      route.define("put", "/test/", mockHandler, mockMiddleware as any);

      const expectedRoute: MockRouteDefinition = {
        method: "put",
        path: "/api/test/",
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      expect((route as any).routes).toContainEqual(expectedRoute as any);
    });

    it("should handle empty middleware array", () => {
      const mockHandler = jest.fn();

      route.define("delete", "/test", mockHandler);

      const expectedRoute: MockRouteDefinition = {
        method: "delete",
        path: "/test",
        handler: mockHandler,
        middleware: [],
      };

      expect((route as any).routes).toContainEqual(expectedRoute as any);
    });

    it("should handle multiple middleware functions", () => {
      const mockHandler = jest.fn();
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      route.define("patch", "/test", mockHandler, mockMiddleware1 as any, mockMiddleware2 as any);

      const expectedRoute: MockRouteDefinition = {
        method: "patch",
        path: "/test",
        handler: mockHandler,
        middleware: [mockMiddleware1, mockMiddleware2],
      };

      expect((route as any).routes).toContainEqual(expectedRoute as any);
    });
  });
});

// End of unit tests for: define
