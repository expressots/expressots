// Unit tests for: delete

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock definitions
type MockMiddleware = jest.Mock;
class MockLogger {
  info = jest.fn();
}

describe("Route.delete() delete method", () => {
  let app: express.Application;
  let route: Route;
  let mockLogger: MockLogger;

  beforeEach(() => {
    app = express();
    mockLogger = new MockLogger();
    route = new Route(app as any);
    (route as any).logger = mockLogger;
  });

  describe("Happy Paths", () => {
    it("should define a DELETE route with the correct path and handler", () => {
      const path = "/test";
      const handler = jest.fn();
      const middleware: MockMiddleware[] = [jest.fn(), jest.fn()];

      route.delete(path, handler, ...middleware);

      const expectedPath = `/${path.replace(/^\//, "")}`;
      expect((route as any).routes).toContainEqual({
        method: "delete",
        path: expectedPath,
        handler,
        middleware,
      } as any);
    });

    it("should define a DELETE route with global prefix", () => {
      const path = "/test";
      const handler = jest.fn();
      const middleware: MockMiddleware[] = [jest.fn()];
      const globalPrefix = "/api";

      route.setGlobalRoutePrefix(globalPrefix);
      route.delete(path, handler, ...middleware);

      const expectedPath = `${globalPrefix}/${path.replace(/^\//, "")}`;
      expect((route as any).routes).toContainEqual({
        method: "delete",
        path: expectedPath,
        handler,
        middleware,
      } as any);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      const path = "/test";
      const handler = jest.fn();

      route.delete(path, handler);

      const expectedPath = `/${path.replace(/^\//, "")}`;
      expect((route as any).routes).toContainEqual({
        method: "delete",
        path: expectedPath,
        handler,
        middleware: [],
      } as any);
    });

    it("should handle leading and trailing slashes in path and prefix", () => {
      const path = "/test/";
      const handler = jest.fn();
      const middleware: MockMiddleware[] = [jest.fn()];
      const globalPrefix = "/api/";

      route.setGlobalRoutePrefix(globalPrefix);
      route.delete(path, handler, ...middleware);

      const expectedPath = `${globalPrefix.replace(/\/$/, "")}/${path.replace(/^\//, "").replace(/\/$/, "")}`;
      expect((route as any).routes).toContainEqual({
        method: "delete",
        path: expectedPath + "/",
        handler,
        middleware,
      } as any);
    });
  });
});

// End of unit tests for: delete
