// Unit tests for: info

import { Logger } from "../logger.provider";

// Mocking the process.stdout.write and process.stderr.write
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("Logger.info() info method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
  });

  describe("Happy Path", () => {
    it("should log an informational message with the correct format", () => {
      // Arrange
      const message = "This is an info message";
      const module = "TestModule";

      // Act
      logger.info(message, module);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should log an informational message without a module", () => {
      // Arrange
      const message = "This is an info message";

      // Act
      logger.info(message);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty message gracefully", () => {
      // Arrange
      const message = "";
      const module = "TestModule";

      // Act
      logger.info(message, module);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should handle a very long message", () => {
      // Arrange
      const message = "a".repeat(1000);
      const module = "TestModule";

      // Act
      logger.info(message, module);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
    });

    it("should handle special characters in the message", () => {
      // Arrange
      const message = "Special characters: !@#$%^&*()_+";
      const module = "TestModule";

      // Act
      logger.info(message, module);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
    });
  });
});

// End of unit tests for: info
