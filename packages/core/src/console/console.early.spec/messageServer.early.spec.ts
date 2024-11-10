// Unit tests for: messageServer

import { stdout } from "process";
import { ColorStyle, bgColorCodes, colorCodes } from "../color-codes";
import { Console, IConsoleMessage } from "../console";

jest.mock("process", () => ({
  stdout: {
    write: jest.fn(),
  },
}));

describe("Console.messageServer() messageServer method", () => {
  let consoleInstance: Console;

  beforeEach(() => {
    consoleInstance = new Console();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should print a message with yellow color for development environment", async () => {
      // Arrange
      const port = 3000;
      const environment = "development";
      const consoleMessage: IConsoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };

      // Act
      await consoleInstance.messageServer(port, environment, consoleMessage);

      // Assert
      const expectedMessage = `[TestApp] version [1.0.0] is running on port [3000] - Environment: [development]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Yellow]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should print a message with green color for production environment", async () => {
      // Arrange
      const port = 8080;
      const environment = "production";
      const consoleMessage: IConsoleMessage = {
        appName: "ProdApp",
        appVersion: "2.0.0",
      };

      // Act
      await consoleInstance.messageServer(port, environment, consoleMessage);

      // Assert
      const expectedMessage = `[ProdApp] version [2.0.0] is running on port [8080] - Environment: [production]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Green]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should print a message with red color for unknown environment", async () => {
      // Arrange
      const port = 5000;
      const environment = "staging";
      const consoleMessage: IConsoleMessage = {
        appName: "StagingApp",
        appVersion: "3.0.0",
      };

      // Act
      await consoleInstance.messageServer(port, environment, consoleMessage);

      // Assert
      const expectedMessage = `[StagingApp] version [3.0.0] is running on port [5000] - Environment: [staging]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Red]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should use default appName and appVersion if consoleMessage is not provided", async () => {
      // Arrange
      const port = 4000;
      const environment = "development";

      // Act
      await consoleInstance.messageServer(port, environment);

      // Assert
      const expectedMessage = `[App] version [not provided] is running on port [4000] - Environment: [development]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Yellow]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });

    it("should handle case-insensitive environment names", async () => {
      // Arrange
      const port = 6000;
      const environment = "DeVeLoPmEnT";
      const consoleMessage: IConsoleMessage = {
        appName: "CaseApp",
        appVersion: "4.0.0",
      };

      // Act
      await consoleInstance.messageServer(port, environment, consoleMessage);

      // Assert
      const expectedMessage = `[CaseApp] version [4.0.0] is running on port [6000] - Environment: [DeVeLoPmEnT]`;
      expect(stdout.write).toHaveBeenCalledWith(
        `${bgColorCodes[ColorStyle.Yellow]}${colorCodes["black"]}${expectedMessage}\x1b[0m\n`,
      );
    });
  });
});

// End of unit tests for: messageServer
