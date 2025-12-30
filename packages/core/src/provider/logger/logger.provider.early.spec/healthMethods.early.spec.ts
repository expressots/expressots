// Unit tests for: Logger health monitoring methods

import { Logger } from "../logger.provider";

describe("Logger health monitoring methods", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe("startHealthMonitoring()", () => {
    it("should start health monitoring when configured", () => {
      // Arrange
      logger.configure({
        health: {
          enabled: true,
          interval: 1000,
        },
      });

      // Act
      logger.startHealthMonitoring();

      // Assert
      expect((logger as any).healthMonitor).toBeDefined();
    });

    it("should not throw when health monitor not configured", () => {
      // Act & Assert
      expect(() => logger.startHealthMonitoring()).not.toThrow();
    });
  });

  describe("stopHealthMonitoring()", () => {
    it("should stop health monitoring", () => {
      // Arrange
      logger.configure({
        health: {
          enabled: true,
          interval: 1000,
        },
      });
      logger.startHealthMonitoring();

      // Act
      logger.stopHealthMonitoring();

      // Assert
      expect((logger as any).healthMonitor).toBeNull();
    });

    it("should not throw when health monitor not configured", () => {
      // Act & Assert
      expect(() => logger.stopHealthMonitoring()).not.toThrow();
    });
  });

  describe("getHealth()", () => {
    it("should return health status when monitor is initialized", async () => {
      // Arrange
      logger.configure({
        health: {
          enabled: true,
          interval: 1000,
        },
      });
      logger.startHealthMonitoring();

      // Act
      const health = await logger.getHealth();

      // Assert
      expect(health).toBeDefined();
      expect(health).toHaveProperty("status");
    });

    it("should return health status when monitor not initialized", async () => {
      // Act
      const health = await logger.getHealth();

      // Assert
      expect(health).toBeDefined();
      expect(health).toHaveProperty("status");
    });
  });
});


