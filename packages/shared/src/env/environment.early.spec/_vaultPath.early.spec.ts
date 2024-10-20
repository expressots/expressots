// Unit tests for: _vaultPath

import fs from "fs";
import path from "path";
import { _vaultPath } from "../environment";

// Mock the logger to avoid actual logging during tests
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(), // Mock the log function
  };
});

// Mock the 'fs' module to control file system interactions
jest.mock("fs", () => {
  return {
    existsSync: jest.fn(),
  };
});

describe("_vaultPath() _vaultPath method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the path if a valid .vault file path is provided in options", () => {
    const options = { path: "/path/to/.env.vault" };
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = _vaultPath(options);
    expect(result).toBe("/path/to/.env.vault");
  });

  it("should append .vault to the path if not already present and the file exists", () => {
    const options = { path: "/path/to/.env" };
    (fs.existsSync as jest.Mock).mockImplementation(
      (filePath) => filePath === "/path/to/.env.vault",
    );

    const result = _vaultPath(options);
    expect(result).toBe("/path/to/.env.vault");
  });

  it("should return the first valid path from an array of paths", () => {
    const options = { path: ["/invalid/path", "/another/invalid/path", "/valid/path/.env.vault"] };
    (fs.existsSync as jest.Mock).mockImplementation(
      (filePath) => filePath === "/valid/path/.env.vault",
    );

    const result = _vaultPath(options);
    expect(result).toBe("/valid/path/.env.vault");
  });

  it("should return null if no valid .vault file path is found", () => {
    const options = { path: "/invalid/path" };
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = _vaultPath(options);
    expect(result).toBeNull();
  });

  it("should default to .env.vault in the current working directory if no path is provided", () => {
    const cwdVaultPath = path.resolve(process.cwd(), ".env.vault");
    (fs.existsSync as jest.Mock).mockImplementation((filePath) => filePath === cwdVaultPath);

    const result = _vaultPath({});
    expect(result).toBe(cwdVaultPath);
  });

  it("should return null if the default .env.vault file does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = _vaultPath({});
    expect(result).toBeNull();
  });
});

// End of unit tests for: _vaultPath
