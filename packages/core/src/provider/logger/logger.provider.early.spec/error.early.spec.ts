// Unit tests for: error

import { colorCodes } from "../../../console/color-codes";
import { Logger } from "../logger.provider";

const stripAnsiCodes = (str) => str.replace(/\x1b\[[0-9;]*m/g, "");

describe("Logger.error() error method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe("Happy Path", () => {
    it("should log an error message with the correct format", () => {
      // Arrange
      const message = "This is an error message";
      const module = "TestModule";
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR [${module}] ${message}\n`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as any);
      const stderrSpy = jest
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = stderrSpy.mock.calls[0][0];
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      stderrSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty message gracefully", () => {
      // Arrange
      const message = "";
      const module = "TestModule";
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR [${module}] ${message}\n`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as any);
      const stderrSpy = jest
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = stderrSpy.mock.calls[0][0];
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      stderrSpy.mockRestore();
    });

    it("should handle undefined module gracefully", () => {
      // Arrange
      const message = "This is an error message";
      const module = undefined || "";
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR [${module}] ${message}\n`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as any);
      const stderrSpy = jest
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = stderrSpy.mock.calls[0][0];
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      stderrSpy.mockRestore();
    });
  });
});

// End of unit tests for: error
