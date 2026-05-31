// Unit tests for: Timer class

import { Timer } from "../logger.performance";
import { Logger } from "../logger.provider";

// ConsoleTransport routes logs through console.* methods
const mockConsoleLog = jest
  .spyOn(console, "log")
  .mockImplementation(() => undefined);
const mockConsoleInfo = jest
  .spyOn(console, "info")
  .mockImplementation(() => undefined);
const mockConsoleDebug = jest
  .spyOn(console, "debug")
  .mockImplementation(() => undefined);
const mockConsoleWarn = jest
  .spyOn(console, "warn")
  .mockImplementation(() => undefined);
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

function anyConsoleCalled(): boolean {
  return (
    mockConsoleLog.mock.calls.length +
      mockConsoleInfo.mock.calls.length +
      mockConsoleDebug.mock.calls.length +
      mockConsoleWarn.mock.calls.length +
      mockConsoleError.mock.calls.length >
    0
  );
}

function clearAllMocks(): void {
  mockConsoleLog.mockClear();
  mockConsoleInfo.mockClear();
  mockConsoleDebug.mockClear();
  mockConsoleWarn.mockClear();
  mockConsoleError.mockClear();
}

describe("Timer class", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleDebug.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
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
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining("Timer"),
      );
    });

    it("should accept custom logLevel", () => {
      // Act
      const timer = new Timer("test-timer", logger, "info");

      // Assert
      timer.end();
      expect(mockConsoleInfo).toHaveBeenCalledWith(
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
      expect(anyConsoleCalled()).toBe(false);
    });
  });

  describe("end()", () => {
    it("should log timer completion with debug level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "debug");

      // Act
      timer.end();

      // Assert
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('Timer "test-timer" completed'),
      );
    });

    it("should log timer completion with info level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "info");

      // Act
      timer.end();

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Timer "test-timer" completed'),
      );
    });

    it("should log timer completion with warn level", () => {
      // Arrange
      const timer = new Timer("test-timer", logger, "warn");

      // Act
      timer.end();

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
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
      expect(anyConsoleCalled()).toBe(false);
    });

    it("should not log if timer is already ended", () => {
      // Arrange
      const timer = new Timer("test-timer", logger);
      timer.end();
      clearAllMocks();

      // Act
      timer.end();

      // Assert
      expect(anyConsoleCalled()).toBe(false);
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
      expect(anyConsoleCalled()).toBe(false);
    });
  });
});
