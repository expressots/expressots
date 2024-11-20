// Unit tests for: checkFile

import { parse } from "@expressots/shared";
import fs from "fs";
import path from "path";
import { EnvValidatorProvider } from "../env-validator.provider";

// Mocking fs and parse
jest.mock("fs");
jest.mock("@expressots/shared", () => ({
  parse: jest.fn(),
}));

describe("EnvValidatorProvider.checkFile() checkFile method", () => {
  let envValidatorProvider: EnvValidatorProvider;

  beforeEach(() => {
    envValidatorProvider = new EnvValidatorProvider();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should successfully validate and load environment variables from a valid .env file", () => {
      // Arrange
      const mockEnvFile = ".env";
      const mockEnvFilePath = path.join(process.cwd(), ".", mockEnvFile);
      const mockParsedEnv = { KEY1: "value1", KEY2: "value2" };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "KEY1=value1\nKEY2=value2",
      );
      (parse as jest.Mock).mockReturnValue(mockParsedEnv as any);

      process.env.KEY1 = "value1";
      process.env.KEY2 = "value2";

      // Act
      envValidatorProvider.checkFile(mockEnvFile);

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(mockEnvFilePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockEnvFilePath, "utf8");
      expect(parse).toHaveBeenCalledWith("KEY1=value1\nKEY2=value2");
    });
  });

  describe("Edge Cases", () => {
    it("should exit the process if the .env file does not exist", () => {
      // Arrange
      const mockEnvFile = ".env";
      const mockEnvFilePath = path.join(process.cwd(), ".", mockEnvFile);

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      // Act & Assert
      expect(() => envValidatorProvider.checkFile(mockEnvFile)).toThrow(
        "process.exit called",
      );
      expect(fs.existsSync).toHaveBeenCalledWith(mockEnvFilePath);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit the process if any environment variable is not defined", () => {
      // Arrange
      const mockEnvFile = ".env";
      const mockEnvFilePath = path.join(process.cwd(), ".", mockEnvFile);
      const mockParsedEnv = { KEY1: "value1", KEY2: "value2" };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "KEY1=value1\nKEY2=value2",
      );
      (parse as jest.Mock).mockReturnValue(mockParsedEnv as any);

      process.env.KEY1 = "value1";
      delete process.env.KEY2; // Simulate missing environment variable

      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      // Act & Assert
      expect(() => envValidatorProvider.checkFile(mockEnvFile)).toThrow(
        "process.exit called",
      );
      expect(fs.existsSync).toHaveBeenCalledWith(mockEnvFilePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockEnvFilePath, "utf8");
      expect(parse).toHaveBeenCalledWith("KEY1=value1\nKEY2=value2");
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

// End of unit tests for: checkFile
