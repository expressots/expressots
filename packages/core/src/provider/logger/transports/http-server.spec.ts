// Unit tests for: http-server.ts (Phase 10: Advanced Transports)

import { HttpLogServer, HttpLogQueryOptions, LogStats } from "./http-server";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";
import { createLogEntry } from "../utils/log-entry";

describe("HttpLogServer - Phase 10 Tests", () => {
  let server: HttpLogServer;

  beforeEach(() => {
    server = new HttpLogServer({ maxLogs: 100 });
  });

  describe("LogBuffer - Basic Operations", () => {
    it("should add log entries to buffer", () => {
      const entry = createLogEntry(LogLevel.INFO, "Test message", {
        context: "TestContext",
      });
      server.addLog(entry);

      const stats = server.getStats();
      expect(stats.total).toBe(1);
    });

    it("should respect max buffer size", () => {
      const maxLogs = 10;
      const server = new HttpLogServer({ maxLogs });

      // Add more than maxLogs
      for (let i = 0; i < maxLogs + 5; i++) {
        const entry = createLogEntry(LogLevel.INFO, `Message ${i}`);
        server.addLog(entry);
      }

      const stats = server.getStats();
      expect(stats.total).toBe(maxLogs);
    });

    it("should clear all logs", () => {
      const entry = createLogEntry(LogLevel.INFO, "Test message");
      server.addLog(entry);
      server.addLog(entry);

      expect(server.getStats().total).toBe(2);

      server.clearLogs();

      expect(server.getStats().total).toBe(0);
    });
  });

  describe("LogBuffer - Query Operations", () => {
    beforeEach(() => {
      // Add test entries with different levels and contexts
      server.addLog(
        createLogEntry(LogLevel.INFO, "Info message", { context: "ServiceA" }),
      );
      server.addLog(
        createLogEntry(LogLevel.WARN, "Warning message", {
          context: "ServiceA",
        }),
      );
      server.addLog(
        createLogEntry(LogLevel.ERROR, "Error message", {
          context: "ServiceB",
        }),
      );
      server.addLog(
        createLogEntry(LogLevel.DEBUG, "Debug message", {
          context: "ServiceA",
        }),
      );
    });

    it("should filter by log level", () => {
      const options: HttpLogQueryOptions = { level: LogLevel.INFO };
      const results = server.queryLogs(options);

      expect(results.length).toBe(1);
      expect(results[0].level).toBe(LogLevel.INFO);
      expect(results[0].message).toBe("Info message");
    });

    it("should filter by context", () => {
      const options: HttpLogQueryOptions = { context: "ServiceA" };
      const results = server.queryLogs(options);

      expect(results.length).toBe(3);
      results.forEach((entry) => {
        expect(entry.context).toBe("ServiceA");
      });
    });

    it("should filter by time range", () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const oneHourLater = now + 60 * 60 * 1000;

      // Add an entry with a specific timestamp
      const oldEntry = createLogEntry(LogLevel.INFO, "Old message");
      oldEntry.timestamp = new Date(oneHourAgo - 1000);
      server.addLog(oldEntry);

      const newEntry = createLogEntry(LogLevel.INFO, "New message");
      newEntry.timestamp = new Date(now);
      server.addLog(newEntry);

      const options: HttpLogQueryOptions = {
        startTime: oneHourAgo,
        endTime: oneHourLater,
      };
      const results = server.queryLogs(options);

      // Should include the new entry and all entries from beforeEach
      expect(results.length).toBeGreaterThan(0);
      results.forEach((entry) => {
        const entryTime = entry.timestamp.getTime();
        expect(entryTime).toBeGreaterThanOrEqual(oneHourAgo);
        expect(entryTime).toBeLessThanOrEqual(oneHourLater);
      });
    });

    it("should filter by search term in message", () => {
      const options: HttpLogQueryOptions = { search: "Error" };
      const results = server.queryLogs(options);

      expect(results.length).toBe(1);
      expect(results[0].message).toContain("Error");
    });

    it("should filter by search term in data", () => {
      const entry = createLogEntry(LogLevel.INFO, "Test message", {
        data: { userId: "12345", action: "login" },
      });
      server.addLog(entry);

      const options: HttpLogQueryOptions = { search: "12345" };
      const results = server.queryLogs(options);

      expect(results.length).toBeGreaterThan(0);
      const found = results.some((e) =>
        JSON.stringify(e.data || {}).includes("12345"),
      );
      expect(found).toBe(true);
    });

    it("should combine multiple filters", () => {
      const options: HttpLogQueryOptions = {
        level: LogLevel.INFO,
        context: "ServiceA",
      };
      const results = server.queryLogs(options);

      expect(results.length).toBe(1);
      expect(results[0].level).toBe(LogLevel.INFO);
      expect(results[0].context).toBe("ServiceA");
    });

    it("should limit results", () => {
      // Add more entries
      for (let i = 0; i < 10; i++) {
        server.addLog(createLogEntry(LogLevel.INFO, `Message ${i}`));
      }

      const options: HttpLogQueryOptions = { limit: 5 };
      const results = server.queryLogs(options);

      expect(results.length).toBe(5);
    });

    it("should sort results newest first", () => {
      const entry1 = createLogEntry(LogLevel.INFO, "First");
      entry1.timestamp = new Date(1000);
      server.addLog(entry1);

      const entry2 = createLogEntry(LogLevel.INFO, "Second");
      entry2.timestamp = new Date(2000);
      server.addLog(entry2);

      const entry3 = createLogEntry(LogLevel.INFO, "Third");
      entry3.timestamp = new Date(3000);
      server.addLog(entry3);

      const results = server.queryLogs({ level: LogLevel.INFO });

      // Should be sorted newest first (descending)
      expect(results.length).toBeGreaterThanOrEqual(3);
      const infoResults = results.filter((e) => e.level === LogLevel.INFO);
      if (infoResults.length >= 3) {
        expect(infoResults[0].timestamp.getTime()).toBeGreaterThanOrEqual(
          infoResults[1].timestamp.getTime(),
        );
      }
    });
  });

  describe("LogBuffer - Statistics", () => {
    it("should calculate statistics correctly", () => {
      server.addLog(
        createLogEntry(LogLevel.INFO, "Info 1", { context: "ServiceA" }),
      );
      server.addLog(
        createLogEntry(LogLevel.INFO, "Info 2", { context: "ServiceA" }),
      );
      server.addLog(
        createLogEntry(LogLevel.WARN, "Warn 1", { context: "ServiceB" }),
      );
      server.addLog(
        createLogEntry(LogLevel.ERROR, "Error 1", { context: "ServiceA" }),
      );

      const stats = server.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byLevel[LogLevel.INFO]).toBe(2);
      expect(stats.byLevel[LogLevel.WARN]).toBe(1);
      expect(stats.byLevel[LogLevel.ERROR]).toBe(1);
      expect(stats.byContext["ServiceA"]).toBe(3);
      expect(stats.byContext["ServiceB"]).toBe(1);
    });

    it("should return null for oldest/newest when buffer is empty", () => {
      const stats = server.getStats();

      expect(stats.oldest).toBeNull();
      expect(stats.newest).toBeNull();
    });

    it("should return correct oldest and newest timestamps", () => {
      const entry1 = createLogEntry(LogLevel.INFO, "First");
      entry1.timestamp = new Date(1000);
      server.addLog(entry1);

      const entry2 = createLogEntry(LogLevel.INFO, "Second");
      entry2.timestamp = new Date(2000);
      server.addLog(entry2);

      const stats = server.getStats();

      expect(stats.oldest).toBe(1000);
      expect(stats.newest).toBe(2000);
    });

    it("should handle entries without context in statistics", () => {
      server.addLog(createLogEntry(LogLevel.INFO, "No context"));
      server.addLog(
        createLogEntry(LogLevel.INFO, "With context", {
          context: "ServiceA",
        }),
      );

      const stats = server.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byContext["ServiceA"]).toBe(1);
    });
  });

  describe("HttpLogServer - Configuration", () => {
    it("should use default configuration", () => {
      const defaultServer = new HttpLogServer();
      const stats = defaultServer.getStats();

      expect(stats.total).toBe(0);
    });

    it("should use custom configuration", () => {
      const customServer = new HttpLogServer({
        port: 3002,
        maxLogs: 500,
        enableWebSocket: false,
        enableRestApi: false,
        apiPath: "/custom/logs",
      });

      const stats = customServer.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe("HttpLogServer - Edge Cases", () => {
    it("should handle empty query results", () => {
      const options: HttpLogQueryOptions = { level: LogLevel.FATAL };
      const results = server.queryLogs(options);

      expect(results.length).toBe(0);
    });

    it("should handle search with no matches", () => {
      server.addLog(createLogEntry(LogLevel.INFO, "Test message"));

      const options: HttpLogQueryOptions = { search: "nonexistent" };
      const results = server.queryLogs(options);

      expect(results.length).toBe(0);
    });

    it("should handle case-insensitive search", () => {
      server.addLog(createLogEntry(LogLevel.INFO, "Test Message"));

      const options: HttpLogQueryOptions = { search: "test" };
      const results = server.queryLogs(options);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle entries with special characters in search", () => {
      server.addLog(
        createLogEntry(LogLevel.INFO, "Message with @#$% special chars"),
      );

      const options: HttpLogQueryOptions = { search: "@#$%" };
      const results = server.queryLogs(options);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle very large buffer", () => {
      const largeServer = new HttpLogServer({ maxLogs: 10000 });

      for (let i = 0; i < 10000; i++) {
        largeServer.addLog(
          createLogEntry(LogLevel.INFO, `Message ${i}`, {
            context: `Context${i % 10}`,
          }),
        );
      }

      const stats = largeServer.getStats();
      expect(stats.total).toBe(10000);
    });
  });

  describe("HttpLogServer - Time Range Filtering", () => {
    it("should filter entries before startTime", () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const oldEntry = createLogEntry(LogLevel.INFO, "Old");
      oldEntry.timestamp = new Date(oneHourAgo - 1000);
      server.addLog(oldEntry);

      const newEntry = createLogEntry(LogLevel.INFO, "New");
      newEntry.timestamp = new Date(now);
      server.addLog(newEntry);

      const options: HttpLogQueryOptions = { startTime: oneHourAgo };
      const results = server.queryLogs(options);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((entry) => {
        expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo);
      });
    });

    it("should filter entries after endTime", () => {
      const now = Date.now();
      const oneHourLater = now + 60 * 60 * 1000;

      const currentEntry = createLogEntry(LogLevel.INFO, "Current");
      currentEntry.timestamp = new Date(now);
      server.addLog(currentEntry);

      const futureEntry = createLogEntry(LogLevel.INFO, "Future");
      futureEntry.timestamp = new Date(oneHourLater + 1000);
      server.addLog(futureEntry);

      const options: HttpLogQueryOptions = { endTime: oneHourLater };
      const results = server.queryLogs(options);

      results.forEach((entry) => {
        expect(entry.timestamp.getTime()).toBeLessThanOrEqual(oneHourLater);
      });
    });
  });
});
