// Unit tests for: LogQueryManager class

import { LogQueryManager } from "../logger.query";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

describe("LogQueryManager", () => {
  describe("constructor", () => {
    it("should create manager with enabled config", () => {
      // Act
      const manager = new LogQueryManager({ enabled: true, bufferSize: 100 });

      // Assert
      expect(manager).toBeDefined();
      expect(manager.isEnabled()).toBe(true);
    });

    it("should create manager with disabled config", () => {
      // Act
      const manager = new LogQueryManager({ enabled: false });

      // Assert
      expect(manager).toBeDefined();
      expect(manager.isEnabled()).toBe(false);
    });

    it("should use default config when not provided", () => {
      // Act
      const manager = new LogQueryManager({});

      // Assert
      expect(manager).toBeDefined();
    });
  });

  describe("addEntry()", () => {
    it("should add entry when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      };

      // Act
      manager.addEntry(entry);

      // Assert
      expect(manager.getAll().length).toBe(1);
    });

    it("should not add entry when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      };

      // Act
      manager.addEntry(entry);

      // Assert
      expect(manager.getAll().length).toBe(0);
    });
  });

  describe("query()", () => {
    it("should return empty array when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act
      const results = manager.query({ level: LogLevel.INFO });

      // Assert
      expect(results).toEqual([]);
    });

    it("should query entries when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Info",
        timestamp: new Date(),
      });
      manager.addEntry({
        level: LogLevel.WARN,
        message: "Warn",
        timestamp: new Date(),
      });

      // Act
      const results = manager.query({ level: LogLevel.INFO });

      // Assert
      expect(results.length).toBe(1);
    });
  });

  describe("createQuery()", () => {
    it("should return empty query when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act
      const query = manager.createQuery();

      // Assert
      expect(query.execute()).toEqual([]);
    });

    it("should create query when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Act
      const query = manager.createQuery();

      // Assert
      expect(query.execute().length).toBe(1);
    });
  });

  describe("getAll()", () => {
    it("should return empty array when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act
      const results = manager.getAll();

      // Assert
      expect(results).toEqual([]);
    });

    it("should return all entries when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Test1",
        timestamp: new Date(),
      });
      manager.addEntry({
        level: LogLevel.WARN,
        message: "Test2",
        timestamp: new Date(),
      });

      // Act
      const results = manager.getAll();

      // Assert
      expect(results.length).toBe(2);
    });
  });

  describe("clear()", () => {
    it("should clear entries when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Act
      manager.clear();

      // Assert
      expect(manager.getAll().length).toBe(0);
    });

    it("should not throw when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act & Assert
      expect(() => manager.clear()).not.toThrow();
    });
  });

  describe("getStats()", () => {
    it("should return empty stats when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act
      const stats = manager.getStats();

      // Assert
      expect(stats).toEqual({
        total: 0,
        byLevel: {},
        byContext: {},
        oldest: null,
        newest: null,
      });
    });

    it("should return stats when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Test",
        context: "Context1",
        timestamp: new Date(),
      });

      // Act
      const stats = manager.getStats();

      // Assert
      expect(stats.total).toBe(1);
      expect(stats.byLevel.INFO).toBe(1);
    });
  });

  describe("isEnabled()", () => {
    it("should return true when enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true });

      // Assert
      expect(manager.isEnabled()).toBe(true);
    });

    it("should return false when disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Assert
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe("configure()", () => {
    it("should enable buffer when config changes to enabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: false });

      // Act
      manager.configure({ enabled: true, bufferSize: 50 });

      // Assert
      expect(manager.isEnabled()).toBe(true);
    });

    it("should disable buffer when config changes to disabled", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });
      manager.addEntry({
        level: LogLevel.INFO,
        message: "Test",
        timestamp: new Date(),
      });

      // Act
      manager.configure({ enabled: false });

      // Assert
      expect(manager.isEnabled()).toBe(false);
      expect(manager.getAll().length).toBe(0);
    });

    it("should update buffer size", () => {
      // Arrange
      const manager = new LogQueryManager({ enabled: true, bufferSize: 10 });

      // Act
      manager.configure({ bufferSize: 20 });

      // Assert
      expect(manager.isEnabled()).toBe(true);
    });
  });
});
