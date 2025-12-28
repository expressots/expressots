// Unit tests for: MiddlewareProfiler constructor

import { MiddlewareProfiler } from "../middleware-profiler";

describe("MiddlewareProfiler() MiddlewareProfiler constructor", () => {
  describe("Happy Path", () => {
    it("should create profiler with default options", () => {
      // Act
      const profiler = new MiddlewareProfiler();

      // Assert
      expect(profiler).toBeInstanceOf(MiddlewareProfiler);
      expect(profiler.isEnabled()).toBe(true);
    });

    it("should create profiler with custom maxSamples", () => {
      // Act
      const profiler = new MiddlewareProfiler({ maxSamples: 500 });

      // Assert
      expect(profiler).toBeInstanceOf(MiddlewareProfiler);
    });

    it("should create profiler with enabled false", () => {
      // Act
      const profiler = new MiddlewareProfiler({ enabled: false });

      // Assert
      expect(profiler.isEnabled()).toBe(false);
    });

    it("should create profiler with both options", () => {
      // Act
      const profiler = new MiddlewareProfiler({
        maxSamples: 2000,
        enabled: false,
      });

      // Assert
      expect(profiler.isEnabled()).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options object", () => {
      // Act
      const profiler = new MiddlewareProfiler({});

      // Assert
      expect(profiler).toBeInstanceOf(MiddlewareProfiler);
      expect(profiler.isEnabled()).toBe(true);
    });
  });
});

// End of unit tests for: MiddlewareProfiler constructor
