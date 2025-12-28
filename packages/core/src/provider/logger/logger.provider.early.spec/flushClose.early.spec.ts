// Unit tests for: Logger flush() and close() methods

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger flush() and close()", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe("flush()", () => {
    it("should flush all transports", async () => {
      // Arrange
      const mockTransport1 = {
        name: "transport1",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
      };
      const mockTransport2 = {
        name: "transport2",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
      };
      logger.configure({ transports: [mockTransport1, mockTransport2] });

      // Act
      await logger.flush();

      // Assert
      expect(mockTransport1.flush).toHaveBeenCalled();
      expect(mockTransport2.flush).toHaveBeenCalled();
    });

    it("should skip disabled transports", async () => {
      // Arrange
      const mockTransport = {
        name: "disabled-transport",
        enabled: false,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn(),
      };
      logger.configure({ transports: [mockTransport] });

      // Act
      await logger.flush();

      // Assert
      expect(mockTransport.flush).not.toHaveBeenCalled();
    });

    it("should skip transports without flush method", async () => {
      // Arrange
      const mockTransport = {
        name: "no-flush-transport",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
      };
      logger.configure({ transports: [mockTransport] });

      // Act & Assert
      await expect(logger.flush()).resolves.not.toThrow();
    });
  });

  describe("close()", () => {
    it("should close all transports and stop health monitoring", async () => {
      // Arrange
      logger.configure({
        health: {
          enabled: true,
          interval: 1000,
        },
      });
      logger.startHealthMonitoring();

      const mockTransport1 = {
        name: "transport1",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };
      const mockTransport2 = {
        name: "transport2",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };
      logger.configure({ transports: [mockTransport1, mockTransport2] });

      // Act
      await logger.close();

      // Assert
      expect(mockTransport1.close).toHaveBeenCalled();
      expect(mockTransport2.close).toHaveBeenCalled();
      expect((logger as any).healthMonitor).toBeNull();
    });

    it("should skip disabled transports", async () => {
      // Arrange
      const mockTransport = {
        name: "disabled-transport",
        enabled: false,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
      };
      logger.configure({ transports: [mockTransport] });

      // Act
      await logger.close();

      // Assert
      expect(mockTransport.close).not.toHaveBeenCalled();
    });

    it("should skip transports without close method", async () => {
      // Arrange
      const mockTransport = {
        name: "no-close-transport",
        enabled: true,
        level: LogLevel.DEBUG,
        log: jest.fn().mockResolvedValue(undefined),
      };
      logger.configure({ transports: [mockTransport] });

      // Act & Assert
      await expect(logger.close()).resolves.not.toThrow();
    });
  });
});

