/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: config

import fs from "fs";
import { _dotenvKey, _vaultPath, config, configDotenv } from "../environment";

// Import necessary modules and functions

// Import necessary modules and functions
// Mock the logger
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mock the fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock interfaces
class MockIConfigOptions {
  public path: string | Array<string> = ".env";
  public encoding: string = "utf8";
  public debug: boolean = false;
  public vaultEnvKey: string = "";
  public envObject: Record<string, any> | null = null;
}

describe("config() config method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle multiple paths in options", () => {
    // Arrange
    const mockOptions = new MockIConfigOptions() as any;
    mockOptions.path = ["/path/to/.env", "/another/path/to/.env"];
    jest
      .spyOn(fs, "existsSync")
      .mockImplementation((filePath) => filePath === ("/another/path/to/.env" as any));

    // Act
    const result = config(mockOptions);

    // Assert
    expect(result).toEqual(configDotenv(mockOptions));
  });

  test("should return null if no valid .env.vault path is found", () => {
    // Arrange
    const mockOptions = new MockIConfigOptions() as any;
    jest.spyOn(fs, "existsSync").mockReturnValue(false as any);

    // Act
    const result = _vaultPath(mockOptions);

    // Assert
    expect(result).toBeNull();
  });

  test("should return the correct DOTENV_KEY from options", () => {
    // Arrange
    const mockOptions = new MockIConfigOptions() as any;
    mockOptions.vaultEnvKey = "testKey";

    // Act
    const result = _dotenvKey(mockOptions);

    // Assert
    expect(result).toBe("testKey");
  });
});

// End of unit tests for: config
