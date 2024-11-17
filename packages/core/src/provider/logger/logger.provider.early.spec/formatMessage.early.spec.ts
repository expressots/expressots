// Unit tests for: formatMessage

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

describe("Logger.formatMessage() formatMessage method", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe("Happy Path", () => {
    it("should format an INFO level message correctly", () => {
      const message = "This is an info message";
      const module = "TestModule";
      const formattedMessage = (logger as any).formatMessage(
        "INFO" as any,
        message,
        module,
      );

      expect(formattedMessage).toContain(mockColorCodes.blue);
      expect(formattedMessage).toContain("INFO ");
      expect(formattedMessage).toContain(message);
      expect(formattedMessage).toContain(module);
    });

    it("should format a WARN level message correctly", () => {
      const message = "This is a warning message";
      const formattedMessage = (logger as any).formatMessage(
        "WARN" as any,
        message,
      );

      expect(formattedMessage).toContain(mockColorCodes.yellow);
      expect(formattedMessage).toContain("WARN ");
      expect(formattedMessage).toContain(message);
    });

    it("should format an ERROR level message correctly", () => {
      const message = "This is an error message";
      const formattedMessage = (logger as any).formatMessage(
        "ERROR" as any,
        message,
      );

      expect(formattedMessage).toContain(mockColorCodes.red);
      expect(formattedMessage).toContain("[ExpressoTS]");
      expect(formattedMessage).toContain(message);
    });

    it("should format a NONE level message correctly", () => {
      const message = "This is a none level message";
      const formattedMessage = (logger as any).formatMessage(
        "NONE" as any,
        message,
      );

      expect(formattedMessage).toContain(mockColorCodes.none);
      expect(formattedMessage).toContain("NONE ");
      expect(formattedMessage).toContain(message);
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty message", () => {
      const formattedMessage = (logger as any).formatMessage("INFO" as any, "");

      expect(formattedMessage).toContain(mockColorCodes.blue);
      expect(formattedMessage).toContain("INFO ");
      expect(formattedMessage).toContain("");
    });

    it("should handle undefined module name", () => {
      const message = "Message with undefined module";
      const formattedMessage = (logger as any).formatMessage(
        "INFO" as any,
        message,
        undefined,
      );

      expect(formattedMessage).toContain(mockColorCodes.blue);
      expect(formattedMessage).toContain("INFO ");
      expect(formattedMessage).toContain(message);
    });

    it("should handle a very long message", () => {
      const longMessage = "a".repeat(1000);
      const formattedMessage = (logger as any).formatMessage(
        "WARN" as any,
        longMessage,
      );

      expect(formattedMessage).toContain(mockColorCodes.yellow);
      expect(formattedMessage).toContain("WARN ");
      expect(formattedMessage).toContain(longMessage);
    });

    it("should handle a very long module name", () => {
      const message = "Message with long module name";
      const longModuleName = "Module".repeat(100);
      const formattedMessage = (logger as any).formatMessage(
        "ERROR" as any,
        message,
        longModuleName,
      );

      expect(formattedMessage).toContain(mockColorCodes.red);
      expect(formattedMessage).toContain("ERROR");
      expect(formattedMessage).toContain(message);
      expect(formattedMessage).toContain(longModuleName);
    });
  });
});

// End of unit tests for: formatMessage
