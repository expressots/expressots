// Unit tests for: getErrorHints function

import { getErrorHints, formatSuggestions, getRouteRegistry } from "../logger.suggestions";

describe("getErrorHints", () => {
  beforeEach(() => {
    // Clear route registry before each test
    const registry = getRouteRegistry();
    registry.clear();
  });

  describe("database connection errors", () => {
    it("should suggest database connection hints", () => {
      // Arrange
      const error = new Error("Cannot connect to database");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("Database");
    });

    it("should not suggest when showErrorHints is false", () => {
      // Arrange
      const error = new Error("Cannot connect to database");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: false,
        showRouteSuggestions: false,
      });

      // Assert
      expect(hints.length).toBe(0);
    });
  });

  describe("port already in use", () => {
    it("should suggest port hints", () => {
      // Arrange
      const error = new Error("Port 3000 already in use");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("Port");
    });

    it("should extract port number", () => {
      // Arrange
      const error = new Error("EADDRINUSE: address already in use :::3000");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints[0].message).toContain("3000");
    });
  });

  describe("module not found", () => {
    it("should suggest module hints", () => {
      // Arrange
      const error = new Error("Cannot find module 'express'");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("Module");
    });

    it("should extract module name", () => {
      // Arrange
      const error = new Error("Cannot find module 'express'");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints[0].message).toContain("express");
    });
  });

  describe("authentication errors", () => {
    it("should suggest auth hints", () => {
      // Arrange
      const error = new Error("Unauthorized access");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("Authentication");
    });
  });

  describe("validation errors", () => {
    it("should suggest validation hints", () => {
      // Arrange
      const error = new Error("Validation failed");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("Validation");
    });
  });

  describe("404 route suggestions", () => {
    beforeEach(() => {
      const registry = getRouteRegistry();
      registry.register("GET", "/api/users");
      registry.register("POST", "/api/posts");
      registry.register("GET", "/api/users/:id");
    });

    it("should suggest similar routes for 404", () => {
      // Arrange
      const error = new Error("Route not found");
      const context = {
        statusCode: 404,
        path: "/api/user",
        method: "GET",
      };

      // Act
      const hints = getErrorHints(error, context, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      const routeHint = hints.find((h) => h.type === "route");
      expect(routeHint).toBeDefined();
      expect(routeHint?.routes).toBeDefined();
      expect(routeHint?.routes!.length).toBeGreaterThan(0);
    });

    it("should not suggest routes when showRouteSuggestions is false", () => {
      // Arrange
      const error = new Error("Route not found");
      const context = {
        statusCode: 404,
        path: "/api/user",
        method: "GET",
      };

      // Act
      const hints = getErrorHints(error, context, {
        showErrorHints: true,
        showRouteSuggestions: false,
      });

      // Assert
      const routeHint = hints.find((h) => h.type === "route");
      expect(routeHint).toBeUndefined();
    });

    it("should show hint when no routes found", () => {
      // Arrange
      const error = new Error("Route not found");
      const context = {
        statusCode: 404,
        path: "/unknown/route",
        method: "GET",
      };

      // Act
      const hints = getErrorHints(error, context, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      const hint = hints.find((h) => h.type === "hint" && h.title.includes("Route Not Found"));
      expect(hint).toBeDefined();
    });
  });

  describe("TypeScript errors", () => {
    it("should suggest TypeScript hints", () => {
      // Arrange
      const error = new Error("TypeScript compilation error");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("TypeScript");
    });
  });

  describe("file system errors", () => {
    it("should suggest file system hints", () => {
      // Arrange
      const error = new Error("ENOENT: file not found");

      // Act
      const hints = getErrorHints(error, undefined, {
        showErrorHints: true,
        showRouteSuggestions: true,
      });

      // Assert
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].type).toBe("hint");
      expect(hints[0].title).toContain("File System");
    });
  });
});

describe("formatSuggestions", () => {
  it("should return empty string for empty suggestions", () => {
    // Act
    const result = formatSuggestions([]);

    // Assert
    expect(result).toBe("");
  });

  it("should format suggestions with actions", () => {
    // Arrange
    const suggestions = [
      {
        type: "hint" as const,
        title: "Test Hint",
        message: "Test message",
        actions: ["Action 1", "Action 2"],
      },
    ];

    // Act
    const result = formatSuggestions(suggestions);

    // Assert
    expect(result).toContain("Test Hint");
    expect(result).toContain("Test message");
    expect(result).toContain("Action 1");
    expect(result).toContain("Action 2");
  });

  it("should format suggestions with routes", () => {
    // Arrange
    const suggestions = [
      {
        type: "route" as const,
        title: "Route Suggestions",
        message: "Did you mean:",
        routes: [
          {
            route: { method: "GET", path: "/api/users" },
            similarity: 0.8,
            reason: "Similar path",
          },
        ],
      },
    ];

    // Act
    const result = formatSuggestions(suggestions);

    // Assert
    expect(result).toContain("Route Suggestions");
    expect(result).toContain("/api/users");
    expect(result).toContain("80%");
    expect(result).toContain("Similar path");
  });

  it("should format multiple suggestions", () => {
    // Arrange
    const suggestions = [
      {
        type: "hint" as const,
        title: "Hint 1",
        message: "Message 1",
      },
      {
        type: "hint" as const,
        title: "Hint 2",
        message: "Message 2",
      },
    ];

    // Act
    const result = formatSuggestions(suggestions);

    // Assert
    expect(result).toContain("Hint 1");
    expect(result).toContain("Hint 2");
  });
});

