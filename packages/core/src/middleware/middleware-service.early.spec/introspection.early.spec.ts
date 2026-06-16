// Unit tests for: introspection methods (getPipelineInfo, getFormattedView, visualizePipeline, etc.)

import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    getResolverStartupWarnings: jest.fn().mockReturnValue([]),
    clearResolverStartupWarnings: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware Introspection Methods", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("getPipelineInfo()", () => {
    it("should return empty info when no middleware added", () => {
      const info = middleware.getPipelineInfo();

      expect(info.total).toBe(0);
      expect(info.entries).toEqual([]);
      expect(info.byCategory.parser).toBe(0);
    });

    it("should return correct info after adding middleware", () => {
      const mockHandler = jest.fn();
      Object.defineProperty(mockHandler, "name", { value: "testMiddleware" });

      middleware.addMiddleware(mockHandler);

      const info = middleware.getPipelineInfo();

      expect(info.total).toBe(1);
      expect(info.entries.length).toBe(1);
      expect(info.entries[0].name).toBe("testMiddleware");
    });

    it("should categorize middleware correctly", () => {
      const parserHandler = jest.fn();
      Object.defineProperty(parserHandler, "name", { value: "jsonParser" });

      middleware.addMiddleware(parserHandler);

      const info = middleware.getPipelineInfo();

      expect(info.byCategory.parser).toBe(1);
    });
  });

  describe("getFormattedView()", () => {
    it("should return formatted view with limited entries", () => {
      // Add multiple middleware
      for (let i = 0; i < 10; i++) {
        const handler = jest.fn();
        Object.defineProperty(handler, "name", { value: `middleware${i}` });
        middleware.addMiddleware(handler);
      }

      const view = middleware.getFormattedView(3);

      expect(view.entries.length).toBe(3);
      expect(view.total).toBe(10);
      expect(view.remaining).toBe(7);
    });

    it("should use default limit of 6", () => {
      for (let i = 0; i < 10; i++) {
        const handler = jest.fn();
        Object.defineProperty(handler, "name", { value: `middleware${i}` });
        middleware.addMiddleware(handler);
      }

      const view = middleware.getFormattedView();

      expect(view.entries.length).toBe(6);
    });
  });

  describe("visualizePipeline()", () => {
    it("should return ASCII art representation", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "testMiddleware" });
      middleware.addMiddleware(handler);

      const visual = middleware.visualizePipeline();

      expect(visual).toContain("MIDDLEWARE PIPELINE");
      expect(visual).toContain("testMiddleware");
    });

    it("should show empty message when no middleware", () => {
      const visual = middleware.visualizePipeline();

      expect(visual).toContain("(empty)");
    });
  });

  describe("getPipelineSummary()", () => {
    it("should return summary string", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "testMiddleware" });
      middleware.addMiddleware(handler);

      const summary = middleware.getPipelineSummary();

      expect(summary).toContain("Middleware:");
      expect(summary).toContain("1 total");
    });
  });

  describe("getCountByCategory()", () => {
    it("should return counts by category", () => {
      const counts = middleware.getCountByCategory();

      expect(counts).toHaveProperty("parser");
      expect(counts).toHaveProperty("security");
      expect(counts).toHaveProperty("logging");
      expect(counts).toHaveProperty("other");
    });
  });

  describe("getByName()", () => {
    it("should find middleware by name", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "myMiddleware" });
      middleware.addMiddleware(handler);

      const found = middleware.getByName("myMiddleware");

      expect(found).toBeDefined();
      expect(found?.name).toBe("myMiddleware");
    });

    it("should return undefined for non-existent middleware", () => {
      const found = middleware.getByName("nonExistent");

      expect(found).toBeUndefined();
    });
  });

  describe("count()", () => {
    it("should return total middleware count", () => {
      expect(middleware.count()).toBe(0);

      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "test" });
      middleware.addMiddleware(handler);

      expect(middleware.count()).toBe(1);
    });
  });

  describe("remove()", () => {
    it("should remove middleware by name", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "toRemove" });
      middleware.addMiddleware(handler);

      expect(middleware.count()).toBe(1);

      const removed = middleware.remove("toRemove");

      expect(removed).toBe(true);
      expect(middleware.count()).toBe(0);
    });

    it("should return false for non-existent middleware", () => {
      const removed = middleware.remove("nonExistent");

      expect(removed).toBe(false);
    });
  });

  describe("clear()", () => {
    it("should remove all middleware", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "test" });
      middleware.addMiddleware(handler);
      middleware.addMiddleware(jest.fn());

      middleware.clear();

      expect(middleware.count()).toBe(0);
    });
  });
});

// End of unit tests for: introspection methods
