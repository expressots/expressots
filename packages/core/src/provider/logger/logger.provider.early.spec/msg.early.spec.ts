// Unit tests for: msg

import { Logger } from "../logger.provider";

// Mocking the Color type and colorCodes
type MockColor = "white" | "blue" | "yellow" | "red" | "none";
const mockColorCodes: Record<MockColor, string> = {
  white: "\x1b[37m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  none: "",
};

describe("Logger.msg() msg method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Happy Path", () => {
    it("should log a message with default NONE log level", () => {
      const message = "Test message";
      const module = "TestModule";

      logger.msg(message, module);

      const expectedOutput = `${mockColorCodes.none}[ExpressoTS] ${mockColorCodes.white}${new Date().toLocaleString().replace(",", "")}\x1b[0m ${mockColorCodes.none}[PID:${process.pid}] ${mockColorCodes.none}NONE  [${mockColorCodes.none}${module}] ${mockColorCodes.none}${message}\n`;

      expect(expectedOutput).toContain("[ExpressoTS]");
    });

    it("should log a message without a module name", () => {
      const message = "Test message";

      logger.msg(message);

      const expectedOutput = `${mockColorCodes.none}[ExpressoTS] ${mockColorCodes.white}${new Date().toLocaleString().replace(",", "")}\x1b[0m ${mockColorCodes.none}[PID:${process.pid}] ${mockColorCodes.none}NONE  [] ${mockColorCodes.none}${message}\n`;

      expect(expectedOutput).toContain("[ExpressoTS]");
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty message", () => {
      const message = "";
      const module = "TestModule";

      logger.msg(message, module);

      const expectedOutput = `${mockColorCodes.none}[ExpressoTS] ${mockColorCodes.white}${new Date().toLocaleString().replace(",", "")}\x1b[0m ${mockColorCodes.none}[PID:${process.pid}] ${mockColorCodes.none}NONE  [${mockColorCodes.none}${module}] ${mockColorCodes.none}${message}\n`;

      expect(expectedOutput).toContain("[ExpressoTS]");
    });

    it("should handle a very long message", () => {
      const message = "A".repeat(1000);
      const module = "TestModule";

      logger.msg(message, module);

      const expectedOutput = `${mockColorCodes.none}[ExpressoTS] ${mockColorCodes.white}${new Date().toLocaleString().replace(",", "")}\x1b[0m ${mockColorCodes.none}[PID:${process.pid}] ${mockColorCodes.none}NONE  [${mockColorCodes.none}${module}] ${mockColorCodes.none}${message}\n`;

      expect(expectedOutput).toContain("[ExpressoTS]");
    });

    it("should handle a null module name", () => {
      const message = "Test message";
      const module = null;

      logger.msg(message, module as any);

      const expectedOutput = `${mockColorCodes.none}[ExpressoTS] ${mockColorCodes.white}${new Date().toLocaleString().replace(",", "")}\x1b[0m ${mockColorCodes.none}[PID:${process.pid}] ${mockColorCodes.none}NONE  [] ${mockColorCodes.none}${message}\n`;

      expect(expectedOutput).toContain("[ExpressoTS]");
    });
  });
});

// End of unit tests for: msg
