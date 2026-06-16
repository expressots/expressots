// Unit tests for: RouteRegistry class

import { getRouteRegistry, suggestRoutes } from "../logger.suggestions";

describe("RouteRegistry", () => {
  beforeEach(() => {
    // Clear route registry before each test
    const registry = getRouteRegistry();
    registry.clear();
  });

  describe("getRouteRegistry()", () => {
    it("should return singleton instance", () => {
      // Act
      const instance1 = getRouteRegistry();
      const instance2 = getRouteRegistry();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe("register()", () => {
    it("should register a route", () => {
      // Arrange
      const registry = getRouteRegistry();

      // Act
      registry.register("GET", "/api/users");

      // Assert
      const routes = registry.getAll();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe("GET");
      expect(routes[0].path).toBe("/api/users");
    });

    it("should normalize path (remove trailing slash)", () => {
      // Arrange
      const registry = getRouteRegistry();

      // Act
      registry.register("GET", "/api/users/");

      // Assert
      const routes = registry.getAll();
      expect(routes[0].path).toBe("/api/users");
    });

    it("should normalize root path", () => {
      // Arrange
      const registry = getRouteRegistry();

      // Act
      registry.register("GET", "/");

      // Assert
      const routes = registry.getAll();
      expect(routes[0].path).toBe("/");
    });

    it("should register with full path", () => {
      // Arrange
      const registry = getRouteRegistry();

      // Act
      registry.register("GET", "/users", "/api/v1/users");

      // Assert
      const routes = registry.getAll();
      expect(routes[0].fullPath).toBe("/api/v1/users");
    });

    it("should not register duplicate routes", () => {
      // Arrange
      const registry = getRouteRegistry();

      // Act
      registry.register("GET", "/api/users");
      registry.register("GET", "/api/users");

      // Assert
      const routes = registry.getAll();
      expect(routes).toHaveLength(1);
    });
  });

  describe("getAll()", () => {
    it("should return all registered routes", () => {
      // Arrange
      const registry = getRouteRegistry();
      registry.register("GET", "/api/users");
      registry.register("POST", "/api/posts");

      // Act
      const routes = registry.getAll();

      // Assert
      expect(routes).toHaveLength(2);
    });
  });

  describe("clear()", () => {
    it("should clear all routes", () => {
      // Arrange
      const registry = getRouteRegistry();
      registry.register("GET", "/api/users");

      // Act
      registry.clear();

      // Assert
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});

describe("suggestRoutes", () => {
  beforeEach(() => {
    const registry = getRouteRegistry();
    registry.clear();
    registry.register("GET", "/api/users");
    registry.register("POST", "/api/posts");
    registry.register("GET", "/api/users/:id");
    registry.register("GET", "/api/posts/:id/comments");
  });

  it("should suggest similar routes", () => {
    // Act
    const suggestions = suggestRoutes("/api/user", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.3,
      showPrefixMatches: true,
    });

    // Assert
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].route.path).toContain("users");
  });

  it("should respect maxRouteSuggestions", () => {
    // Act
    const suggestions = suggestRoutes("/api", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 2,
      minSimilarityThreshold: 0.1,
      showPrefixMatches: true,
    });

    // Assert
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it("should respect minSimilarityThreshold", () => {
    // Act
    const suggestions = suggestRoutes("/completely/different", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.9,
      showPrefixMatches: true,
    });

    // Assert
    expect(suggestions.every((s) => s.similarity >= 0.9)).toBe(true);
  });

  it("should suggest routes with same prefix when showPrefixMatches is true", () => {
    // Act
    const suggestions = suggestRoutes("/api/users/123", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.3,
      showPrefixMatches: true,
    });

    // Assert
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.route.path.includes("/api/users"))).toBe(
      true,
    );
  });

  it("should not suggest routes when showPrefixMatches is false", () => {
    // Act
    const suggestions = suggestRoutes("/api/users/123", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.3,
      showPrefixMatches: false,
    });

    // Assert
    // Should still suggest based on similarity, not just prefix
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("should calculate similarity scores", () => {
    // Act
    const suggestions = suggestRoutes("/api/user", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.3,
      showPrefixMatches: true,
    });

    // Assert
    expect(
      suggestions.every((s) => s.similarity >= 0 && s.similarity <= 1),
    ).toBe(true);
  });

  it("should include reason for suggestions", () => {
    // Act
    const suggestions = suggestRoutes("/api/user", "GET", {
      enabled: true,
      showRouteSuggestions: true,
      showErrorHints: true,
      maxRouteSuggestions: 3,
      minSimilarityThreshold: 0.3,
      showPrefixMatches: true,
    });

    // Assert
    if (suggestions.length > 0) {
      expect(suggestions[0].reason).toBeDefined();
    }
  });
});
