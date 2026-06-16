// Unit tests for: messageServer edge cases

import { stdout } from "process";
import { ColorStyle, bgColorCodes, colorCodes } from "../color-codes";
import { Console } from "../console";
import { IConsoleMessage } from "@expressots/shared";

jest.mock("process", () => ({
  stdout: {
    write: jest.fn(),
  },
}));

describe("Console.messageServer() messageServer method - Additional Edge Cases", () => {
  let consoleInstance: Console;

  beforeEach(() => {
    consoleInstance = new Console();
    jest.clearAllMocks();
  });

  describe("Edge Cases", () => {
    it("should handle empty string environment", async () => {
      // Arrange
      const port = 3000;
      const environment = "";

      // Act
      await consoleInstance.messageServer(port, environment);

      // Assert
      const expectedMessage = `[App] version [not provided] is running on port [3000] - Environment: []`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Red]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle partial consoleMessage (only appName)", async () => {
      // Arrange
      const port = 3000;
      const environment = "development";
      const consoleMessage: Partial<IConsoleMessage> = {
        appName: "PartialApp",
      };

      // Act
      await consoleInstance.messageServer(
        port,
        environment,
        consoleMessage as IConsoleMessage,
      );

      // Assert
      const expectedMessage = `[PartialApp] version [not provided] is running on port [3000] - Environment: [development]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Yellow]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle partial consoleMessage (only appVersion)", async () => {
      // Arrange
      const port = 3000;
      const environment = "development";
      const consoleMessage: Partial<IConsoleMessage> = {
        appVersion: "5.0.0",
      };

      // Act
      await consoleInstance.messageServer(
        port,
        environment,
        consoleMessage as IConsoleMessage,
      );

      // Assert
      const expectedMessage = `[App] version [5.0.0] is running on port [3000] - Environment: [development]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Yellow]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle port 0 (OS-assigned port)", async () => {
      // Arrange
      const port = 0;
      const environment = "production";
      const consoleMessage: IConsoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };

      // Act
      await consoleInstance.messageServer(port, environment, consoleMessage);

      // Assert
      const expectedMessage = `[TestApp] version [1.0.0] is running on port [0] - Environment: [production]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Green]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle uppercase PRODUCTION environment", async () => {
      // Arrange
      const port = 3000;
      const environment = "PRODUCTION";

      // Act
      await consoleInstance.messageServer(port, environment);

      // Assert
      const expectedMessage = `[App] version [not provided] is running on port [3000] - Environment: [PRODUCTION]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Green]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle test environment (should use red)", async () => {
      // Arrange
      const port = 3000;
      const environment = "test";

      // Act
      await consoleInstance.messageServer(port, environment);

      // Assert
      const expectedMessage = `[App] version [not provided] is running on port [3000] - Environment: [test]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Red]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });
  });
});

// End of unit tests for: messageServer edge cases
