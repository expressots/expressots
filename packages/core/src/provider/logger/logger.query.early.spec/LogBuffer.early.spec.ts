// Unit tests for: LogBuffer class

import { LogBuffer } from "../logger.query";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

describe("LogBuffer", () => {
  let buffer: LogBuffer;

  beforeEach(() => {
    buffer = new LogBuffer(5);
  });

  describe("constructor", () => {
    it("should create buffer with default size", () => {
      // Act
      const defaultBuffer = new LogBuffer();

      // Assert
      expect(defaultBuffer).toBeDefined();
    });

    it("should create buffer with custom size", () => {
      // Act
      const customBuffer = new LogBuffer(100);

      // Assert
      expect(customBuffer).toBeDefined();
    });
  });

  describe("add()", () => {
    it("should add entry when buffer not full", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      };

      // Act
      buffer.add(entry);

      // Assert
      expect(buffer.size()).toBe(1);
    });

    it("should use circular buffer when full", () => {
      // Arrange
      const entries: Array<LogEntry> = [];
      for (let i = 0; i < 7; i++) {
        entries.push({
          level: LogLevel.INFO,
          message: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      // Act
      entries.forEach((entry) => buffer.add(entry));

      // Assert
      expect(buffer.size()).toBe(5);
      const all = buffer.getAll();
      expect(all.length).toBe(5);
      // Should contain the last 5 entries
      expect(all[all.length - 1].message).toBe("Message 6");
    });
  });

  describe("getAll()", () => {
    it("should return entries in chronological order when not full", () => {
      // Arrange
      const baseTime = new Date("2024-01-01T00:00:00Z").getTime();
      for (let i = 0; i < 3; i++) {
        buffer.add({
          level: LogLevel.INFO,
          message: `Message ${i}`,
          timestamp: new Date(baseTime + i * 1000),
        });
      }

      // Act
      const all = buffer.getAll();

      // Assert
      expect(all.length).toBe(3);
      expect(all[0].message).toBe("Message 0");
      expect(all[2].message).toBe("Message 2");
    });

    it("should return entries in chronological order when full (circular)", () => {
      // Arrange
      const baseTime = new Date("2024-01-01T00:00:00Z").getTime();
      for (let i = 0; i < 7; i++) {
        buffer.add({
          level: LogLevel.INFO,
          message: `Message ${i}`,
          timestamp: new Date(baseTime + i * 1000),
        });
      }

      // Act
      const all = buffer.getAll();

      // Assert
      expect(all.length).toBe(5);
      // Should be in chronological order (oldest first)
      expect(all[0].message).toBe("Message 2");
      expect(all[4].message).toBe("Message 6");
    });
  });

  describe("query()", () => {
    beforeEach(() => {
      const baseTime = new Date("2024-01-01T00:00:00Z").getTime();
      buffer.add({
        level: LogLevel.INFO,
        message: "Info message",
        context: "Context1",
        timestamp: new Date(baseTime),
      });
      buffer.add({
        level: LogLevel.WARN,
        message: "Warn message",
        context: "Context2",
        timestamp: new Date(baseTime + 1000),
      });
    });

    it("should query by level", () => {
      // Act
      const results = buffer.query({ level: LogLevel.INFO });

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].level).toBe(LogLevel.INFO);
    });

    it("should query by context", () => {
      // Act
      const results = buffer.query({ context: "Context1" });

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].context).toBe("Context1");
    });

    it("should query by time range", () => {
      // Arrange
      const startTime = new Date("2024-01-01T00:00:00Z");
      const endTime = new Date("2024-01-01T00:00:00.500Z");

      // Act
      const results = buffer.query({ startTime, endTime });

      // Assert
      expect(results.length).toBe(1);
    });

    it("should query by search term", () => {
      // Act
      const results = buffer.query({ search: "Info" });

      // Assert
      expect(results.length).toBe(1);
    });

    it("should query by message regex", () => {
      // Act
      const results = buffer.query({ messageRegex: /Warn/ });

      // Assert
      expect(results.length).toBe(1);
    });

    it("should apply sorting", () => {
      // Act
      const results = buffer.query({ sort: "asc" });

      // Assert
      expect(results[0].timestamp.getTime()).toBeLessThanOrEqual(
        results[results.length - 1].timestamp.getTime(),
      );
    });

    it("should apply limit", () => {
      // Act
      const results = buffer.query({ limit: 1 });

      // Assert
      expect(results.length).toBe(1);
    });
  });

  describe("createQuery()", () => {
    it("should create query builder", () => {
      // Arrange
      buffer.add({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Act
      const query = buffer.createQuery();

      // Assert
      expect(query).toBeDefined();
      expect(query.execute().length).toBe(1);
    });
  });

  describe("clear()", () => {
    it("should clear all entries", () => {
      // Arrange
      buffer.add({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Act
      buffer.clear();

      // Assert
      expect(buffer.size()).toBe(0);
      expect(buffer.getAll().length).toBe(0);
    });

    it("should reset write index", () => {
      // Arrange
      for (let i = 0; i < 7; i++) {
        buffer.add({
          level: LogLevel.INFO,
          message: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      // Act
      buffer.clear();

      // Assert
      expect(buffer.size()).toBe(0);
      // After clear, next add should start at index 0
      buffer.add({
        level: LogLevel.INFO,
        message: "New",
        timestamp: new Date(),
      });
      const all = buffer.getAll();
      expect(all[0].message).toBe("New");
    });
  });

  describe("getStats()", () => {
    it("should return statistics", () => {
      // Arrange
      buffer.add({
        level: LogLevel.INFO,
        message: "Info",
        context: "Context1",
        timestamp: new Date("2024-01-01T00:00:00Z"),
      });
      buffer.add({
        level: LogLevel.WARN,
        message: "Warn",
        context: "Context2",
        timestamp: new Date("2024-01-01T00:00:01Z"),
      });

      // Act
      const stats = buffer.getStats();

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.byLevel.INFO).toBe(1);
      expect(stats.byLevel.WARN).toBe(1);
      expect(stats.byContext.Context1).toBe(1);
      expect(stats.byContext.Context2).toBe(1);
      expect(stats.oldest).toBeDefined();
      expect(stats.newest).toBeDefined();
    });

    it("should handle empty buffer", () => {
      // Act
      const stats = buffer.getStats();

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.oldest).toBeNull();
      expect(stats.newest).toBeNull();
    });
  });

  describe("size()", () => {
    it("should return current buffer size", () => {
      // Assert
      expect(buffer.size()).toBe(0);

      // Arrange & Act
      buffer.add({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Assert
      expect(buffer.size()).toBe(1);
    });

    it("should not exceed max size", () => {
      // Arrange & Act
      for (let i = 0; i < 10; i++) {
        buffer.add({
          level: LogLevel.INFO,
          message: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      // Assert
      expect(buffer.size()).toBe(5);
    });
  });
});


