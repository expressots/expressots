// Unit tests for: Logger log filters (exclude/include)

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger log filters", () => {
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

  describe("exclude filter", () => {
    it("should exclude logs from excluded contexts", () => {
      // Arrange
      logger.configure({
        filters: {
          exclude: ["ExcludedContext"],
        },
      });

      // Act
      logger.info("Test message", "ExcludedContext");

      // Assert
      expect(mockTransport.log).not.toHaveBeenCalled();
    });

    it("should allow logs from non-excluded contexts", () => {
      // Arrange
      logger.configure({
        filters: {
          exclude: ["ExcludedContext"],
        },
      });

      // Act
      logger.info("Test message", "AllowedContext");

      // Assert
      expect(mockTransport.log).toHaveBeenCalled();
    });
  });

  describe("include filter", () => {
    it("should only allow logs from included contexts", () => {
      // Arrange
      logger.configure({
        filters: {
          include: ["IncludedContext"],
        },
      });

      // Act
      logger.info("Test message", "IncludedContext");
      logger.info("Test message", "ExcludedContext");

      // Assert
      expect(mockTransport.log).toHaveBeenCalledTimes(1);
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "IncludedContext",
        }),
      );
    });

    it("should allow all logs when include is empty", () => {
      // Arrange
      logger.configure({
        filters: {
          include: [],
        },
      });

      // Act
      logger.info("Test message", "AnyContext");

      // Assert
      expect(mockTransport.log).toHaveBeenCalled();
    });
  });

  describe("combined filters", () => {
    it("should apply exclude before include", () => {
      // Arrange
      logger.configure({
        filters: {
          exclude: ["ExcludedContext"],
          include: ["IncludedContext", "ExcludedContext"],
        },
      });

      // Act
      logger.info("Test message", "ExcludedContext");
      logger.info("Test message", "IncludedContext");

      // Assert
      expect(mockTransport.log).toHaveBeenCalledTimes(1);
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "IncludedContext",
        }),
      );
    });
  });
});

