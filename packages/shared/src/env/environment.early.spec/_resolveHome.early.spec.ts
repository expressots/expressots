// Unit tests for: _resolveHome

import os from "os";
import path from "path";
import { _resolveHome } from "../environment";

// _resolveHome.test.ts

// _resolveHome.test.ts
// Mocking the logger module
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(), // Mock the log function
  };
});

describe("_resolveHome() _resolveHome method", () => {
  // Test: Should resolve home directory when path starts with '~'
  it('should resolve home directory when path starts with "~"', () => {
    const homeDir = os.homedir();
    const inputPath = "~/myFolder";
    const expectedPath = path.join(homeDir, "myFolder");

    const result = _resolveHome(inputPath);

    expect(result).toBe(expectedPath);
  });

  // Test: Should return the same path when it does not start with '~'
  it('should return the same path when it does not start with "~"', () => {
    const inputPath = "/usr/local/bin";
    const result = _resolveHome(inputPath);

    expect(result).toBe(inputPath);
  });

  // Test: Should handle edge case of empty string
  it("should handle edge case of empty string", () => {
    const inputPath = "";
    const result = _resolveHome(inputPath);

    expect(result).toBe(inputPath);
  });

  // Test: Should handle edge case of only "~"
  it('should handle edge case of only "~"', () => {
    const homeDir = os.homedir();
    const inputPath = "~";
    const expectedPath = homeDir;

    const result = _resolveHome(inputPath);

    expect(result).toBe(expectedPath);
  });

  // Test: Should handle edge case of "~/" (home directory root)
  it('should handle edge case of "~/"', () => {
    const homeDir = os.homedir();
    const inputPath = "~/";
    const expectedPath = path.join(homeDir, "/");

    const result = _resolveHome(inputPath);

    expect(result).toBe(expectedPath);
  });
});

// End of unit tests for: _resolveHome
