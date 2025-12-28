// Unit tests for: PerformanceMetricsCollector class

import { PerformanceMetricsCollector } from "../logger.performance";
import { Logger } from "../logger.provider";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("PerformanceMetricsCollector class", () => {
  let logger: Logger;
  let collector: PerformanceMetricsCollector;

  beforeEach(() => {
    logger = new Logger();
    collector = new PerformanceMetricsCollector(logger);
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
  });

  afterAll(() => {
    mockStdoutWrite.mockRestore();
    mockStderrWrite.mockRestore();
  });

  describe("start()", () => {
    it("should start tracking a metric", () => {
      // Act
      collector.start("test-metric");

      // Assert
      const metrics = collector.getAll();
      expect(metrics.has("test-metric")).toBe(true);
    });

    it("should return this for chaining", () => {
      // Act & Assert
      expect(collector.start("test-metric")).toBe(collector);
    });

    it("should not restart if already started", () => {
      // Arrange
      collector.start("test-metric");
      const firstStartTime = collector.getAll().get("test-metric")!.startTime;

      // Act
      collector.start("test-metric");
      const secondStartTime = collector.getAll().get("test-metric")!.startTime;

      // Assert
      expect(secondStartTime).toBe(firstStartTime);
    });

    it("should preserve count and durations when restarting after end", () => {
      // Arrange
      collector.start("test-metric");
      collector.end("test-metric");
      const afterEnd = collector.getAll().get("test-metric")!;
      const count = afterEnd.count;
      const totalDuration = afterEnd.totalDuration;

      // Act
      collector.start("test-metric");

      // Assert
      const afterRestart = collector.getAll().get("test-metric")!;
      expect(afterRestart.count).toBe(count);
      expect(afterRestart.totalDuration).toBe(totalDuration);
    });
  });

  describe("end()", () => {
    it("should end tracking a metric", () => {
      // Arrange
      collector.start("test-metric");

      // Act
      collector.end("test-metric");

      // Assert
      const metric = collector.getAll().get("test-metric");
      expect(metric?.endTime).toBeDefined();
      expect(metric?.duration).toBeDefined();
    });

    it("should return this for chaining", () => {
      // Arrange
      collector.start("test-metric");

      // Act & Assert
      expect(collector.end("test-metric")).toBe(collector);
    });

    it("should increment count", () => {
      // Arrange
      collector.start("test-metric");
      collector.end("test-metric");
      const firstCount = collector.getAll().get("test-metric")!.count;

      // Act
      collector.start("test-metric");
      collector.end("test-metric");

      // Assert
      const secondCount = collector.getAll().get("test-metric")!.count;
      expect(secondCount).toBe(firstCount + 1);
    });

    it("should update min and max durations", async () => {
      // Arrange
      collector.start("test-metric");
      await new Promise((resolve) => setTimeout(resolve, 10));
      collector.end("test-metric");
      const firstDuration = collector.getAll().get("test-metric")!.duration!;

      collector.start("test-metric");
      await new Promise((resolve) => setTimeout(resolve, 20));
      collector.end("test-metric");
      const secondDuration = collector.getAll().get("test-metric")!.duration!;

      // Assert
      const metric = collector.getAll().get("test-metric")!;
      expect(metric.minDuration).toBeLessThanOrEqual(firstDuration);
      expect(metric.maxDuration).toBeGreaterThanOrEqual(secondDuration);
    });

    it("should not end if not started", () => {
      // Act
      collector.end("non-existent");

      // Assert
      expect(collector.getAll().has("non-existent")).toBe(false);
    });

    it("should not end if already ended", () => {
      // Arrange
      collector.start("test-metric");
      collector.end("test-metric");
      const firstEndTime = collector.getAll().get("test-metric")!.endTime;

      // Act
      collector.end("test-metric");

      // Assert
      const secondEndTime = collector.getAll().get("test-metric")!.endTime;
      expect(secondEndTime).toBe(firstEndTime);
    });
  });

  describe("get()", () => {
    it("should return current duration for active metric", () => {
      // Arrange
      collector.start("test-metric");

      // Act
      const duration = collector.get("test-metric");

      // Assert
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should return undefined for non-existent metric", () => {
      // Act
      const duration = collector.get("non-existent");

      // Assert
      expect(duration).toBeUndefined();
    });

    it("should return undefined for ended metric", () => {
      // Arrange
      collector.start("test-metric");
      collector.end("test-metric");

      // Act
      const duration = collector.get("test-metric");

      // Assert
      expect(duration).toBeUndefined();
    });
  });

  describe("reset()", () => {
    it("should clear all metrics", () => {
      // Arrange
      collector.start("metric1");
      collector.start("metric2");

      // Act
      collector.reset();

      // Assert
      expect(collector.getAll().size).toBe(0);
    });
  });

  describe("summary()", () => {
    it("should generate summary with completed metrics", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");
      collector.start("metric2");
      collector.end("metric2");

      // Act
      const summary = collector.summary({ log: false });

      // Assert
      expect(summary.totalTime).toBeGreaterThan(0);
      expect(summary.metrics.length).toBe(2);
      expect(summary.metrics[0]).toHaveProperty("label");
      expect(summary.metrics[0]).toHaveProperty("count");
      expect(summary.metrics[0]).toHaveProperty("totalDuration");
      expect(summary.metrics[0]).toHaveProperty("averageDuration");
      expect(summary.metrics[0]).toHaveProperty("minDuration");
      expect(summary.metrics[0]).toHaveProperty("maxDuration");
      expect(summary.metrics[0]).toHaveProperty("percentage");
    });

    it("should log summary by default", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");

      // Act
      collector.summary();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Performance Summary"),
      );
    });

    it("should not log if log option is false", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");

      // Act
      collector.summary({ log: false });

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalled();
    });

    it("should log with debug level", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");

      // Act
      collector.summary({ logLevel: "debug" });

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Performance Summary"),
      );
    });

    it("should log with warn level", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");

      // Act
      collector.summary({ logLevel: "warn" });

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Performance Summary"),
      );
    });

    it("should exclude incomplete metrics", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");
      collector.start("metric2"); // Not ended

      // Act
      const summary = collector.summary({ log: false });

      // Assert
      expect(summary.metrics.length).toBe(1);
      expect(summary.metrics[0].label).toBe("metric1");
    });

    it("should exclude metrics with zero count", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");
      const metric = collector.getAll().get("metric1")!;
      metric.count = 0; // Manually set to 0

      // Act
      const summary = collector.summary({ log: false });

      // Assert
      expect(summary.metrics.length).toBe(0);
    });

    it("should handle Infinity minDuration", () => {
      // Arrange
      collector.start("metric1");
      collector.end("metric1");
      const metric = collector.getAll().get("metric1")!;
      metric.minDuration = Infinity;

      // Act
      const summary = collector.summary({ log: false });

      // Assert
      expect(summary.metrics[0].minDuration).toBe(0);
    });

    it("should sort metrics by total duration descending", async () => {
      // Arrange
      collector.start("metric1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      collector.end("metric1");

      collector.start("metric2");
      await new Promise((resolve) => setTimeout(resolve, 20));
      collector.end("metric2");

      // Act
      const summary = collector.summary({ log: false });

      // Assert
      expect(summary.metrics[0].totalDuration).toBeGreaterThanOrEqual(
        summary.metrics[1].totalDuration,
      );
    });
  });

  describe("getAll()", () => {
    it("should return all metrics as a map", () => {
      // Arrange
      collector.start("metric1");
      collector.start("metric2");

      // Act
      const all = collector.getAll();

      // Assert
      expect(all.size).toBe(2);
      expect(all.has("metric1")).toBe(true);
      expect(all.has("metric2")).toBe(true);
    });

    it("should return a copy of the map", () => {
      // Arrange
      collector.start("metric1");

      // Act
      const all = collector.getAll();
      all.delete("metric1");

      // Assert
      expect(collector.getAll().has("metric1")).toBe(true);
    });
  });
});

