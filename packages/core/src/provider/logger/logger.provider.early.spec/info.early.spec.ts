// Unit tests for: info

import { Logger } from "../logger.provider";

// ConsoleTransport routes INFO-level logs through console.info
const mockConsoleLog = jest
  .spyOn(console, "info")
  .mockImplementation(() => undefined);

describe("Logger.info() info method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockConsoleLog.mockClear();
  });

  describe("Happy Path", () => {
    it("should log an informational message with the correct format", () => {
      // Arrange
      const message = "This is an info message";
      const module = "TestModule";

      // Act
      logger.info(message, module);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(module),
      );
    });

    it("should log an informational message without a module", () => {
      // Arrange
      const message = "This is an info message";

      // Act
      logger.info(message);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
      );
    });
  });
});

// End of unit tests for: info
