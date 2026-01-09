// Unit tests for: profiling methods

import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware Profiling Methods", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("enableProfiling()", () => {
    it("should enable profiling and return profiler instance", () => {
      const profiler = middleware.enableProfiling();

      expect(profiler).toBeDefined();
      expect(middleware.getProfiler()).toBe(profiler);
    });

    it("should return same profiler instance on multiple calls", () => {
      const profiler1 = middleware.enableProfiling();
      const profiler2 = middleware.enableProfiling();

      expect(profiler1).toBe(profiler2);
    });

    it("should accept maxSamples option", () => {
      const profiler = middleware.enableProfiling({ maxSamples: 500 });

      expect(profiler).toBeDefined();
    });
  });

  describe("disableProfiling()", () => {
    it("should disable profiling", () => {
      middleware.enableProfiling();
      middleware.disableProfiling();

      // Profiler still exists but is disabled
      expect(middleware.getProfiler()).toBeDefined();
    });
  });

  describe("getProfiler()", () => {
    it("should return null when profiling not enabled", () => {
      expect(middleware.getProfiler()).toBeNull();
    });

    it("should return profiler when profiling is enabled", () => {
      middleware.enableProfiling();

      expect(middleware.getProfiler()).toBeDefined();
    });
  });

  describe("getProfilingMetrics()", () => {
    it("should return empty array when profiling not enabled", () => {
      const metrics = middleware.getProfilingMetrics();

      expect(metrics).toEqual([]);
    });

    it("should return metrics array when profiling is enabled", () => {
      middleware.enableProfiling();

      const metrics = middleware.getProfilingMetrics();

      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe("getProfilingStats()", () => {
    it("should return null when profiling not enabled", () => {
      const stats = middleware.getProfilingStats();

      expect(stats).toBeNull();
    });

    it("should return stats when profiling is enabled", () => {
      middleware.enableProfiling();

      const stats = middleware.getProfilingStats();

      expect(stats).toBeDefined();
    });
  });
});

// End of unit tests for: profiling methods
