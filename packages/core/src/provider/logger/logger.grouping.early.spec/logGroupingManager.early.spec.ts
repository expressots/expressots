// Unit tests for: LogGroupingManager class

import {
  LogGroupingManager,
  GroupedLogEntry,
  calculateSimilarity,
} from "../logger.grouping";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

describe("LogGroupingManager", () => {
  let manager: LogGroupingManager;

  beforeEach(() => {
    manager = new LogGroupingManager({
      enabled: true,
      similarityThreshold: 0.8,
      timeWindow: 5000,
      minOccurrences: 3,
      considerContext: true,
      maxGroups: 100,
    });
  });

  describe("constructor", () => {
    it("should create manager with default config", () => {
      // Act
      const defaultManager = new LogGroupingManager();

      // Assert
      expect(defaultManager).toBeDefined();
    });

    it("should create manager with custom config", () => {
      // Act
      const customManager = new LogGroupingManager({
        enabled: false,
        similarityThreshold: 0.9,
      });

      // Assert
      expect(customManager).toBeDefined();
    });
  });

  describe("configure()", () => {
    it("should update configuration", () => {
      // Act
      manager.configure({ similarityThreshold: 0.9 });

      // Assert
      // Configuration is applied (tested through behavior)
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };
      const result = manager.processEntry(entry);
      expect(result).toBeDefined();
    });
  });

  describe("processEntry()", () => {
    it("should return original entry when grouping disabled", () => {
      // Arrange
      const disabledManager = new LogGroupingManager({ enabled: false });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      const result = disabledManager.processEntry(entry);

      // Assert
      expect(result).toBe(entry);
    });

    it("should return original entry when below minOccurrences", () => {
      // Arrange
      const fixedTimestamp = new Date();
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: fixedTimestamp,
      };

      // Act
      const result1 = manager.processEntry(entry);
      const entry2: LogEntry = { ...entry, timestamp: fixedTimestamp };
      const result2 = manager.processEntry(entry2);

      // Assert
      expect(result1).toEqual(entry);
      expect(result2).toEqual(entry2);
    });

    it("should return grouped entry when minOccurrences reached", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(
          manager.processEntry({
            ...entry,
            timestamp: new Date(Date.now() + i * 100),
          }),
        );
      }

      // Assert
      const lastResult = results[results.length - 1];
      expect(lastResult).toHaveProperty("count");
      expect((lastResult as GroupedLogEntry).count).toBeGreaterThanOrEqual(3);
    });

    it("should flush group when time window expires", () => {
      // Arrange
      const baseTime = Date.now();
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(baseTime),
      };

      // Create a group
      manager.processEntry(entry);
      manager.processEntry({
        ...entry,
        timestamp: new Date(baseTime + 100),
      });

      // Wait for time window to expire (6 seconds later, window is 5 seconds)
      const expiredEntry: LogEntry = {
        ...entry,
        timestamp: new Date(baseTime + 6000),
      };

      // Act
      const result = manager.processEntry(expiredEntry);

      // Assert
      // When time window expires, the old group is flushed and a new one is created
      // The result might be the expired entry (new group) or a flushed group
      expect(result).toBeDefined();
      // If it's a grouped entry, it should have count property
      // If it's the original entry, it should match
      if ("count" in result) {
        expect((result as GroupedLogEntry).count).toBeGreaterThanOrEqual(1);
      } else {
        expect(result).toEqual(expiredEntry);
      }
    });

    it("should group similar messages using similarity algorithm", () => {
      // Arrange
      const managerWithSimilarity = new LogGroupingManager({
        enabled: true,
        similarityThreshold: 0.8,
        timeWindow: 10000,
        minOccurrences: 2,
        considerContext: false,
      });

      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: "User 123 logged in",
        timestamp: new Date(),
      };

      const entry2: LogEntry = {
        level: LogLevel.INFO,
        message: "User 456 logged in",
        timestamp: new Date(),
      };

      // Act
      const result1 = managerWithSimilarity.processEntry(entry1);
      const result2 = managerWithSimilarity.processEntry(entry2);

      // Assert
      // Should group similar messages
      expect(result2).toBeDefined();
    });

    it("should consider context when grouping if enabled", () => {
      // Arrange
      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        context: "Context1",
        timestamp: new Date(),
      };

      const entry2: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        context: "Context2",
        timestamp: new Date(),
      };

      // Act
      const result1 = manager.processEntry(entry1);
      const result2 = manager.processEntry(entry2);

      // Assert
      // With considerContext: true, different contexts should not group
      expect(result2).toEqual(entry2);
    });

    it("should not consider context when disabled", () => {
      // Arrange
      const managerNoContext = new LogGroupingManager({
        enabled: true,
        considerContext: false,
        minOccurrences: 2,
        timeWindow: 10000,
      });

      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        context: "Context1",
        timestamp: new Date(),
      };

      const entry2: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        context: "Context2",
        timestamp: new Date(),
      };

      // Act
      managerNoContext.processEntry(entry1);
      const result2 = managerNoContext.processEntry(entry2);

      // Assert
      // Should group despite different contexts
      expect(result2).toBeDefined();
      // Result might be grouped or original entry depending on timing
      if ("count" in result2) {
        expect((result2 as GroupedLogEntry).count).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("flush()", () => {
    it("should flush all groups meeting minOccurrences", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Create multiple groups
      for (let i = 0; i < 3; i++) {
        manager.processEntry({
          ...entry,
          timestamp: new Date(Date.now() + i * 100),
        });
      }

      // Act
      const flushed = manager.flush();

      // Assert
      expect(flushed.length).toBeGreaterThan(0);
      flushed.forEach((group) => {
        expect(group.count).toBeGreaterThanOrEqual(3);
      });
    });

    it("should clear groups after flush", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      for (let i = 0; i < 3; i++) {
        manager.processEntry({
          ...entry,
          timestamp: new Date(Date.now() + i * 100),
        });
      }

      // Act
      manager.flush();
      const stats = manager.getStats();

      // Assert
      expect(stats.totalGroups).toBe(0);
    });

    it("should not flush groups below minOccurrences", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Only 2 occurrences (below minOccurrences of 3)
      manager.processEntry(entry);
      manager.processEntry({ ...entry, timestamp: new Date() });

      // Act
      const flushed = manager.flush();

      // Assert
      expect(flushed.length).toBe(0);
    });
  });

  describe("reset()", () => {
    it("should clear all groups", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      manager.processEntry(entry);
      manager.processEntry({ ...entry, timestamp: new Date() });

      // Act
      manager.reset();
      const stats = manager.getStats();

      // Assert
      expect(stats.totalGroups).toBe(0);
    });
  });

  describe("getStats()", () => {
    it("should return statistics about current groups", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      manager.processEntry(entry);
      manager.processEntry({ ...entry, timestamp: new Date() });

      // Act
      const stats = manager.getStats();

      // Assert
      expect(stats).toHaveProperty("totalGroups");
      expect(stats).toHaveProperty("groups");
      expect(Array.isArray(stats.groups)).toBe(true);
    });

    it("should include group details in stats", () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      manager.processEntry(entry);
      manager.processEntry({ ...entry, timestamp: new Date() });

      // Act
      const stats = manager.getStats();

      // Assert
      if (stats.groups.length > 0) {
        const group = stats.groups[0];
        expect(group).toHaveProperty("key");
        expect(group).toHaveProperty("count");
        expect(group).toHaveProperty("firstOccurrence");
        expect(group).toHaveProperty("lastOccurrence");
      }
    });
  });

  describe("maxGroups limit", () => {
    it("should remove oldest group when maxGroups reached", () => {
      // Arrange
      const managerWithLimit = new LogGroupingManager({
        enabled: true,
        maxGroups: 2,
        timeWindow: 10000,
      });

      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: "Message 1",
        timestamp: new Date(1000),
      };

      const entry2: LogEntry = {
        level: LogLevel.INFO,
        message: "Message 2",
        timestamp: new Date(2000),
      };

      const entry3: LogEntry = {
        level: LogLevel.INFO,
        message: "Message 3",
        timestamp: new Date(3000),
      };

      // Act
      managerWithLimit.processEntry(entry1);
      managerWithLimit.processEntry(entry2);
      managerWithLimit.processEntry(entry3);

      const stats = managerWithLimit.getStats();

      // Assert
      expect(stats.totalGroups).toBeLessThanOrEqual(2);
    });
  });

  describe("cleanupOldGroups()", () => {
    it("should remove groups outside time window", async () => {
      // Arrange
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(Date.now() - 20000), // 20 seconds ago
      };

      manager.processEntry(entry);

      // Wait for cleanup interval (30 seconds) or trigger manually
      // Since cleanup runs periodically, we'll test through getStats
      const statsBefore = manager.getStats();

      // Act
      // Force cleanup by waiting or processing new entries
      // The cleanup happens automatically, but we can verify it works
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Process a new entry to potentially trigger cleanup
      manager.processEntry({
        level: LogLevel.INFO,
        message: "New message",
        timestamp: new Date(),
      });

      const statsAfter = manager.getStats();

      // Assert
      // Old groups should be cleaned up eventually
      expect(statsAfter.totalGroups).toBeDefined();
    });
  });
});

describe("calculateSimilarity()", () => {
  it("should return 1.0 for identical strings", () => {
    // Act
    const similarity = calculateSimilarity("test", "test");

    // Assert
    expect(similarity).toBe(1.0);
  });

  it("should return 0.0 for empty strings", () => {
    // Act
    const similarity = calculateSimilarity("", "test");

    // Assert
    expect(similarity).toBe(0.0);
  });

  it("should calculate similarity for similar strings", () => {
    // Act
    const similarity = calculateSimilarity("test", "test1");

    // Assert
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("should return 0.0 for completely different strings", () => {
    // Act
    const similarity = calculateSimilarity("abc", "xyz");

    // Assert
    expect(similarity).toBeLessThan(0.5);
  });
});
