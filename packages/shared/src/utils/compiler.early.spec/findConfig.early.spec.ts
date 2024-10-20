// Unit tests for: findConfig

import { existsSync } from "node:fs";
import * as path from "path";
import { Compiler } from "../compiler";

jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
}));

jest.unmock("path");

describe("Compiler.findConfig() findConfig method", () => {
  const originalProcessExit = process.exit;
  let mockExit: jest.MockedFunction<(code?: string | number | null | undefined) => never>;

  beforeAll(() => {
    mockExit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    }) as jest.MockedFunction<(code?: string | number | null | undefined) => never>;
    process.exit = mockExit;
    jest.spyOn(console, "error").mockImplementation(() => {}); // Mock console.error to suppress error logs
  });

  afterAll(() => {
    process.exit = originalProcessExit;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the config path if the config file exists in the given directory", async () => {
    // Arrange
    const dir = "/some/dir";
    const configPath = path.join(dir, "expressots.config.ts");
    (existsSync as jest.Mock).mockReturnValue(true);

    // Act
    const result = await Compiler.findConfig(dir);

    // Assert
    expect(result).toBe(configPath);
    expect(existsSync).toHaveBeenCalledWith(configPath);
  });

  it("should exit the process with an error if no config file is found in any parent directory", async () => {
    // Arrange
    const dir = "/some/dir";
    (existsSync as jest.Mock).mockReturnValue(false);

    // Act & Assert
    await expect(Compiler.findConfig(dir)).rejects.toThrow("process.exit(1)");

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

// End of unit tests for: findConfig
