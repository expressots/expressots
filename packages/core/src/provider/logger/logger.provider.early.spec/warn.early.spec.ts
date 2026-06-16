// Unit tests for: warn

import { Logger } from "../logger.provider";

// ConsoleTransport routes WARN-level logs through console.warn
const mockConsoleWarn = jest
  .spyOn(console, "warn")
  .mockImplementation(() => undefined);

describe("Logger.warn() warn method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockConsoleWarn.mockClear();
  });

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should log a warning message with the correct format", () => {
      // Arrange
      const message = "This is a warning message";
      const module = "TestModule";

      // Act
      logger.warn(message, module);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should log a warning message without a module name", () => {
      // Arrange
      const message = "This is a warning message";

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle an empty message gracefully", () => {
      // Arrange
      const message = "";
      const module = "TestModule";

      // Act
      logger.warn(message, module);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should handle a very long message", () => {
      // Arrange
      const message = "A".repeat(1000); // Very long message
      const module = "TestModule";

      // Act
      logger.warn(message, module);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should handle undefined module gracefully", () => {
      // Arrange
      const message = "This is a warning message";
      const module = undefined;

      // Act
      logger.warn(message, module as any);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });
  });
});

// End of unit tests for: warn
