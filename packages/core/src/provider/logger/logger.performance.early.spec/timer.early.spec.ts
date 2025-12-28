// Unit tests for: Timer class

import { Timer } from "../logger.performance";
import { Logger } from "../logger.provider";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("Timer class", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
  });

  afterAll(() => {
    mockStdoutWrite.mockRestore();
    mockStderrWrite.mockRestore();
  });

  describe("Constructor", () => {
    it("should create timer with label and logger", () => {
      // Act
      const timer = new Timer("test-timer", logger);

      // Assert
      expect(timer.label).toBe("test-timer");
      expect(timer.startTime).toBeGreaterThan(0);
    });

    it("should use default logLevel of debug", () => {
      // Act
      const timer = new Timer("test-timer", logger);

      // Assert
      timer.end();
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Timer"),
      );
    });

    it("should accept custom logLevel", () => {
      // Act
      const timer = new Timer("test-timer", logger, "info");

      // Assert
      timer.end();
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Timer"),
      );
    });
  });

  describe("elapsed()", () => {
    it("should return elapsed time without ending timer", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);

      // Act
      const elapsed1 = timer.elapsed();
      const elapsed2 = timer.elapsed();

      // Assert
      expect(elapsed1).toBeGreaterThanOrEqual(0);
      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
      expect(mockStdoutWrite).not.toHaveBeenCalled();
    });
  });

  describe("end()", () => {
    it("should log timer completion with debug level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "debug");

      // Act
      timer.end();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining('Timer "test-timer" completed'),
      );
    });

    it("should log timer completion with info level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "info");

      // Act
      timer.end();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining('Timer "test-timer" completed'),
      );
    });

    it("should log timer completion with warn level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "warn");

      // Act
      timer.end();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining('Timer "test-timer" completed'),
      );
    });

    it("should return elapsed time", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);

      // Act
      const duration = timer.end();

      // Assert
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should not log if timer is cancelled", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);
      timer.cancel();

      // Act
      timer.end();

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalled();
    });

    it("should not log if timer is already ended", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);
      timer.end();
      mockStdoutWrite.mockClear();

      // Act
      timer.end();

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalled();
    });

    it("should return elapsed time even if cancelled", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);
      timer.cancel();

      // Act
      const duration = timer.end();

      // Assert
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should return elapsed time even if already ended", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);
      timer.end();
      const firstDuration = timer.elapsed();

      // Act
      const secondDuration = timer.end();

      // Assert
      expect(secondDuration).toBeGreaterThanOrEqual(firstDuration);
    });
  });

  describe("cancel()", () => {
    it("should cancel timer and prevent logging", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);

      // Act
      timer.cancel();
      timer.end();

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalled();
    });
  });
});

