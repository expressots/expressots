// Unit tests for: Logger.noAutoContext() and enableAutoContext() methods

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger auto context methods", () => {
  let logger: Logger;
  let mockTransport: any;

  beforeEach(() => {
    logger = new Logger();
    mockTransport = {
      name: "test-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockResolvedValue(undefined),
    };
    logger.configure({ transports: [mockTransport] });
  });

  describe("noAutoContext()", () => {
    it("should disable auto context detection", () => {
      // Act
      const result = logger.noAutoContext();

      // Assert
      expect((logger as any).autoDetectContext).toBe(false);
      expect(result).toBe(logger);
    });

    it("should return logger instance for chaining", () => {
      // Act & Assert
      expect(logger.noAutoContext()).toBe(logger);
    });
  });

  describe("enableAutoContext()", () => {
    it("should enable auto context detection", () => {
      // Arrange
      logger.noAutoContext();

      // Act
      const result = logger.enableAutoContext();

      // Assert
      expect((logger as any).autoDetectContext).toBe(true);
      expect(result).toBe(logger);
    });

    it("should return logger instance for chaining", () => {
      // Act & Assert
      expect(logger.enableAutoContext()).toBe(logger);
    });
  });
});

