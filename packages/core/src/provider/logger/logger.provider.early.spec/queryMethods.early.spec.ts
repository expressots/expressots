// Unit tests for: Logger query methods

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";
import { LogEntry } from "../utils/log-entry";

describe("Logger query methods", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    logger.configure({
      query: {
        enabled: true,
        bufferSize: 100,
      },
    });
  });

  describe("queryLogs()", () => {
    it("should return empty array when query manager not enabled", () => {
      // Arrange
      const loggerWithoutQuery = new Logger();
      loggerWithoutQuery.configure({ query: { enabled: false } });

      // Act
      const result = loggerWithoutQuery.queryLogs();

      // Assert
      expect(result).toEqual([]);
    });

    it("should query logs with options", () => {
      // Arrange
      logger.info("Info message", "Context1");
      logger.warn("Warn message", "Context2");
      logger.error("Error message", "Context1");

      // Act
      const result = logger.queryLogs({ level: LogLevel.INFO });

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((entry) => entry.level === LogLevel.INFO)).toBe(true);
    });
  });

  describe("query()", () => {
    it("should return empty query when query manager not enabled", () => {
      // Arrange
      const loggerWithoutQuery = new Logger();
      loggerWithoutQuery.configure({ query: { enabled: false } });

      // Act
      const query = loggerWithoutQuery.query();

      // Assert
      expect(query.execute()).toEqual([]);
    });

    it("should create chainable query", () => {
      // Arrange
      logger.info("Info message", "Context1");
      logger.warn("Warn message", "Context2");

      // Act
      const results = logger
        .query()
        .level(LogLevel.INFO)
        .context("Context1")
        .execute();

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((entry) => entry.level === LogLevel.INFO)).toBe(
        true,
      );
      expect(results.every((entry) => entry.context === "Context1")).toBe(true);
    });
  });

  describe("getAllLogs()", () => {
    it("should return empty array when query manager not enabled", () => {
      // Arrange
      const loggerWithoutQuery = new Logger();
      loggerWithoutQuery.configure({ query: { enabled: false } });

      // Act
      const result = loggerWithoutQuery.getAllLogs();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return all logs", () => {
      // Arrange
      logger.info("Message 1");
      logger.warn("Message 2");
      logger.error("Message 3");

      // Act
      const result = logger.getAllLogs();

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getLogStats()", () => {
    it("should return empty stats when query manager not enabled", () => {
      // Arrange
      const loggerWithoutQuery = new Logger();
      loggerWithoutQuery.configure({ query: { enabled: false } });

      // Act
      const stats = loggerWithoutQuery.getLogStats();

      // Assert
      expect(stats).toEqual({
        total: 0,
        byLevel: {},
        byContext: {},
        oldest: null,
        newest: null,
      });
    });

    it("should return log statistics", () => {
      // Arrange
      logger.info("Info message", "Context1");
      logger.warn("Warn message", "Context2");

      // Act
      const stats = logger.getLogStats();

      // Assert
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byLevel).toBeDefined();
      expect(stats.byContext).toBeDefined();
    });
  });

  describe("clearLogs()", () => {
    it("should clear all logs", () => {
      // Arrange
      logger.info("Message 1");
      logger.warn("Message 2");

      // Act
      logger.clearLogs();

      // Assert
      expect(logger.getAllLogs()).toEqual([]);
    });

    it("should not throw when query manager not enabled", () => {
      // Arrange
      const loggerWithoutQuery = new Logger();
      loggerWithoutQuery.configure({ query: { enabled: false } });

      // Act & Assert
      expect(() => loggerWithoutQuery.clearLogs()).not.toThrow();
    });
  });

  describe("exportLogsToMarkdown()", () => {
    it("should export logs to markdown", () => {
      // Arrange
      logger.info("Info message", "Context1");
      logger.warn("Warn message", "Context2");

      // Act
      const markdown = logger.exportLogsToMarkdown();

      // Assert
      expect(markdown).toContain("Info message");
      expect(markdown).toContain("Warn message");
      expect(markdown).toContain("#");
    });

    it("should export with custom options", () => {
      // Arrange
      logger.info("Info message", "Context1");

      // Act
      const markdown = logger.exportLogsToMarkdown({
        title: "Custom Title",
        includeStats: true,
        groupBy: "level",
      });

      // Assert
      expect(markdown).toContain("Custom Title");
    });

    it("should export filtered logs", () => {
      // Arrange
      logger.info("Info message");
      logger.warn("Warn message");

      // Act
      const markdown = logger.exportLogsToMarkdown({
        query: { level: LogLevel.INFO },
      });

      // Assert
      expect(markdown).toContain("Info message");
      expect(markdown).not.toContain("Warn message");
    });
  });
});
