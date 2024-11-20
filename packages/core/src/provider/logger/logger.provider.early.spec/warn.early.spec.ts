// Unit tests for: warn

import { Logger } from "../logger.provider";

// Mocking the process.stdout.write and process.stderr.write
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("Logger.warn() warn method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
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
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should log a warning message without a module name", () => {
      // Arrange
      const message = "This is a warning message";

      // Act
      logger.warn(message);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
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
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
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
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
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
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });
  });
});

// End of unit tests for: warn
