// Unit tests for: LogQuery class

import { LogQuery } from "../logger.query";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

describe("LogQuery", () => {
  let entries: Array<LogEntry>;

  beforeEach(() => {
    const baseTime = new Date("2024-01-01T00:00:00Z").getTime();
    entries = [
      {
        level: LogLevel.INFO,
        message: "Info message",
        context: "Context1",
        timestamp: new Date(baseTime),
        data: { key: "value" },
      },
      {
        level: LogLevel.WARN,
        message: "Warn message",
        context: "Context2",
        timestamp: new Date(baseTime + 1000),
        data: { key: "value2" },
      },
      {
        level: LogLevel.ERROR,
        message: "Error message",
        context: "Context1",
        timestamp: new Date(baseTime + 2000),
      },
      {
        level: LogLevel.DEBUG,
        message: "Debug message",
        context: "Context3",
        timestamp: new Date(baseTime + 3000),
      },
    ];
  });

  describe("level()", () => {
    it("should filter by single level", () => {
      // Act
      const results = new LogQuery(entries).level(LogLevel.INFO).execute();

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].level).toBe(LogLevel.INFO);
    });

    it("should filter by multiple levels", () => {
      // Act
      const results = new LogQuery(entries)
        .level([LogLevel.INFO, LogLevel.WARN])
        .execute();

      // Assert
      expect(results.length).toBe(2);
      expect(results.every((e) => [LogLevel.INFO, LogLevel.WARN].includes(e.level))).toBe(true);
    });
  });

  describe("context()", () => {
    it("should filter by exact context string", () => {
      // Act
      const results = new LogQuery(entries).context("Context1").execute();

      // Assert
      expect(results.length).toBe(2);
      expect(results.every((e) => e.context === "Context1")).toBe(true);
    });

    it("should filter by regex pattern", () => {
      // Act
      const results = new LogQuery(entries).context(/Context[12]/).execute();

      // Assert
      expect(results.length).toBe(3);
    });

    it("should handle entries without context", () => {
      // Arrange
      const entriesWithoutContext = [
        {
          ...entries[0],
          context: undefined,
        },
      ];

      // Act
      const results = new LogQuery(entriesWithoutContext)
        .context("Context1")
        .execute();

      // Assert
      expect(results.length).toBe(0);
    });
  });

  describe("timeRange()", () => {
    it("should filter by start time (timestamp)", () => {
      // Arrange
      const startTime = new Date("2024-01-01T00:00:01Z").getTime();

      // Act
      const results = new LogQuery(entries).timeRange(startTime).execute();

      // Assert
      expect(results.length).toBe(3);
      expect(
        results.every((e) => e.timestamp.getTime() >= startTime),
      ).toBe(true);
    });

    it("should filter by start time (Date)", () => {
      // Arrange
      const startTime = new Date("2024-01-01T00:00:01Z");

      // Act
      const results = new LogQuery(entries).timeRange(startTime).execute();

      // Assert
      expect(results.length).toBe(3);
    });

    it("should filter by end time", () => {
      // Arrange
      const endTime = new Date("2024-01-01T00:00:01Z").getTime();

      // Act
      const results = new LogQuery(entries).timeRange(undefined, endTime).execute();

      // Assert
      expect(results.length).toBe(2);
      expect(
        results.every((e) => e.timestamp.getTime() <= endTime),
      ).toBe(true);
    });

    it("should filter by both start and end time", () => {
      // Arrange
      const startTime = new Date("2024-01-01T00:00:01Z").getTime();
      const endTime = new Date("2024-01-01T00:00:02Z").getTime();

      // Act
      const results = new LogQuery(entries)
        .timeRange(startTime, endTime)
        .execute();

      // Assert
      expect(results.length).toBe(1);
    });
  });

  describe("search()", () => {
    it("should search in message", () => {
      // Act
      const results = new LogQuery(entries).search("Info").execute();

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].message).toContain("Info");
    });

    it("should search in data", () => {
      // Act
      const results = new LogQuery(entries).search("value").execute();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should search in context", () => {
      // Act
      const results = new LogQuery(entries).search("Context1").execute();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should be case-insensitive", () => {
      // Act
      const results = new LogQuery(entries).search("INFO").execute();

      // Assert
      expect(results.length).toBe(1);
    });
  });

  describe("messageRegex()", () => {
    it("should filter by regex pattern (RegExp)", () => {
      // Act
      const results = new LogQuery(entries)
        .messageRegex(/Error|Warn/)
        .execute();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should filter by regex pattern (string)", () => {
      // Act
      const results = new LogQuery(entries).messageRegex("Error|Warn").execute();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should be case-insensitive for string patterns", () => {
      // Act
      const results = new LogQuery(entries).messageRegex("error").execute();

      // Assert
      expect(results.length).toBe(1);
    });
  });

  describe("limit()", () => {
    it("should limit results", () => {
      // Act
      const results = new LogQuery(entries).limit(2).execute();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should handle limit larger than results", () => {
      // Act
      const results = new LogQuery(entries).limit(10).execute();

      // Assert
      expect(results.length).toBe(4);
    });
  });

  describe("sort()", () => {
    it("should sort ascending by default", () => {
      // Act
      const results = new LogQuery(entries).sort("asc").execute();

      // Assert
      expect(results[0].timestamp.getTime()).toBeLessThanOrEqual(
        results[results.length - 1].timestamp.getTime(),
      );
    });

    it("should sort descending", () => {
      // Act
      const results = new LogQuery(entries).sort("desc").execute();

      // Assert
      expect(results[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        results[results.length - 1].timestamp.getTime(),
      );
    });

    it("should default to descending", () => {
      // Act
      const results = new LogQuery(entries).sort().execute();

      // Assert
      expect(results[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        results[results.length - 1].timestamp.getTime(),
      );
    });
  });

  describe("execute()", () => {
    it("should return copy of results", () => {
      // Arrange
      const query = new LogQuery(entries);
      const results1 = query.execute();
      const results2 = query.execute();

      // Assert
      expect(results1).not.toBe(results2);
      expect(results1).toEqual(results2);
    });
  });

  describe("count()", () => {
    it("should return count of results", () => {
      // Arrange
      const query = new LogQuery(entries).level(LogLevel.INFO);

      // Act
      const count = query.count();

      // Assert
      expect(count).toBe(1);
    });
  });

  describe("stats()", () => {
    it("should return statistics", () => {
      // Act
      const stats = new LogQuery(entries).stats();

      // Assert
      expect(stats.total).toBe(4);
      expect(stats.byLevel).toBeDefined();
      expect(stats.byContext).toBeDefined();
      expect(stats.oldest).toBeDefined();
      expect(stats.newest).toBeDefined();
    });

    it("should handle empty results", () => {
      // Arrange
      const query = new LogQuery([]);

      // Act
      const stats = query.stats();

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.oldest).toBeNull();
      expect(stats.newest).toBeNull();
    });

    it("should calculate oldest and newest correctly for sorted results", () => {
      // Arrange
      const query = new LogQuery(entries).sort("asc");

      // Act
      const stats = query.stats();

      // Assert
      expect(stats.oldest).toBe(entries[0].timestamp.getTime());
      expect(stats.newest).toBe(entries[entries.length - 1].timestamp.getTime());
    });
  });

  describe("chaining", () => {
    it("should support method chaining", () => {
      // Act
      const results = new LogQuery(entries)
        .level(LogLevel.INFO)
        .context("Context1")
        .limit(1)
        .execute();

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].level).toBe(LogLevel.INFO);
      expect(results[0].context).toBe("Context1");
    });
  });
});

