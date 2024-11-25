// Unit tests for: setGlobalRoutePrefix

import express from "express";
import { Route } from "../application-express-micro-route";

// Mock classes and interfaces

describe("Route.setGlobalRoutePrefix() setGlobalRoutePrefix method", () => {
  let mockApp: express.Application;
  let route: Route;

  beforeEach(() => {
    mockApp = express() as any;
    route = new Route(mockApp as any);
  });

  describe("Happy paths", () => {
    it("should set the global route prefix correctly", () => {
      // Arrange
      const prefix = "/api/v1";

      // Act
      route.setGlobalRoutePrefix(prefix);

      // Assert
      expect((route as any).globalPrefix).toBe(prefix);
    });

    it("should handle an empty prefix", () => {
      // Arrange
      const prefix = "";

      // Act
      route.setGlobalRoutePrefix(prefix);

      // Assert
      expect((route as any).globalPrefix).toBe(prefix);
    });
  });

  describe("Edge cases", () => {
    it("should handle a prefix with trailing slash", () => {
      // Arrange
      const prefix = "/api/v1/";

      // Act
      route.setGlobalRoutePrefix(prefix);

      // Assert
      expect((route as any).globalPrefix).toBe(prefix);
    });

    it("should handle a prefix with leading slash", () => {
      // Arrange
      const prefix = "/api/v1";

      // Act
      route.setGlobalRoutePrefix(prefix);

      // Assert
      expect((route as any).globalPrefix).toBe(prefix);
    });

    it("should handle a prefix with multiple slashes", () => {
      // Arrange
      const prefix = "///api/v1///";

      // Act
      route.setGlobalRoutePrefix(prefix);

      // Assert
      expect((route as any).globalPrefix).toBe(prefix);
    });
  });
});

// End of unit tests for: setGlobalRoutePrefix
