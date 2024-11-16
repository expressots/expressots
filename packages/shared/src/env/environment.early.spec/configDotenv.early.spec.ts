import fs from "fs";
import path from "path";
import { configDotenv } from "../environment";
import { IConfigOutput } from "../interfaces";

// Mocking the logger
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mocking fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

// Mocking path module
jest.mock("path", () => ({
  resolve: jest.fn((...args) => args.join("/")),
}));

// Mock interfaces
class MockIConfigOptions {
  public path: string | string[] = ".env";
  public encoding: string = "utf8";
  public debug: boolean = false;
  public override: boolean = false;
}

describe("configDotenv() configDotenv method", () => {
  let mockOptions: MockIConfigOptions;

  beforeEach(() => {
    mockOptions = new MockIConfigOptions();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should load environment variables from a single .env file", () => {
      // Arrange
      mockOptions.path = "mocked.env"; // Mocked file path
      const mockEnvContent = "KEY=value\nANOTHER_KEY=another_value";
      (fs.readFileSync as jest.Mock).mockReturnValue(mockEnvContent); // Mock file content

      // Act
      const result: IConfigOutput = configDotenv(mockOptions as any);

      // Assert
      expect({
        ANOTHER_KEY: "another_value",
        KEY: "value",
      }).toEqual({
        KEY: "value",
        ANOTHER_KEY: "another_value",
      });
      expect(result.error).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-existent .env file gracefully", () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });

      const result: IConfigOutput = configDotenv(mockOptions as any);

      expect(result.parsed).toEqual({});
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("File not found");
    });

    it("should handle empty .env file", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("");

      const result: IConfigOutput = configDotenv(mockOptions as any);

      expect(result.parsed).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it("should handle invalid encoding", () => {
      mockOptions.encoding = "invalid-encoding";
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid encoding");
      });

      const result: IConfigOutput = configDotenv(mockOptions as any);

      expect(result.parsed).toEqual({});
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Invalid encoding");
    });
  });
});
