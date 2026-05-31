// Unit tests for: error

import { Logger } from "../logger.provider";

const stripAnsiCodes = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

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
      // console.* methods append the newline themselves, so the message
      // we capture from the spy has the trailing "\n" stripped by the
      // ConsoleTransport before being passed through console.error.
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR [${module}] ${message}`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as never);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = consoleErrorSpy.mock.calls[0][0] as string;
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty message gracefully", () => {
      // Arrange
      const message = "";
      const module = "TestModule";
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR [${module}] ${message}`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as never);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = consoleErrorSpy.mock.calls[0][0] as string;
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it("should handle undefined module gracefully", () => {
      // Arrange
      const message = "This is an error message";
      const module = undefined;
      // When module is undefined/empty, the formatter omits the [module] part
      const expectedOutput = `[ExpressoTS] 01/01/2023 00:00:00 [PID:${process.pid}] ERROR  ${message}`;

      jest
        .spyOn(global.Date.prototype, "toLocaleString")
        .mockReturnValue("01/01/2023, 00:00:00" as never);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      // Act
      logger.error(message, module);

      // Assert
      const actualOutput = consoleErrorSpy.mock.calls[0][0] as string;
      expect(stripAnsiCodes(actualOutput)).toEqual(expectedOutput);

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });
});

// End of unit tests for: error
