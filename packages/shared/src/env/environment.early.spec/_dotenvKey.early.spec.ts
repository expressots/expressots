/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: _dotenvKey

import { _dotenvKey } from "../environment";

jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mock interface for IConfigOptions
class MockIConfigOptions {
  public vaultEnvKey: string = "";
}

describe("_dotenvKey() _dotenvKey method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the vaultEnvKey from options if it is provided and non-empty", () => {
    const mockOptions = new MockIConfigOptions();
    mockOptions.vaultEnvKey = "mockVaultKey";

    const result = _dotenvKey(mockOptions as any);

    expect(result).toBe("mockVaultKey");
  });

  it("should return the DOTENV_KEY from process.env if options.vaultEnvKey is not provided", () => {
    process.env.DOTENV_KEY = "envVaultKey";

    const result = _dotenvKey(undefined as any);

    expect(result).toBe("envVaultKey");
  });

  it("should return an empty string if neither options.vaultEnvKey nor process.env.DOTENV_KEY is provided", () => {
    delete process.env.DOTENV_KEY;

    const result = _dotenvKey(undefined as any);

    expect(result).toBe("");
  });

  it("should return the vaultEnvKey from options if both options.vaultEnvKey and process.env.DOTENV_KEY are provided", () => {
    const mockOptions = new MockIConfigOptions();
    mockOptions.vaultEnvKey = "mockVaultKey";
    process.env.DOTENV_KEY = "envVaultKey";

    const result = _dotenvKey(mockOptions as any);

    expect(result).toBe("mockVaultKey");
  });

  it("should handle empty options object gracefully", () => {
    const mockOptions = new MockIConfigOptions();

    const result = _dotenvKey(mockOptions as any);

    expect(result).toBe("envVaultKey");
  });
});

// End of unit tests for: _dotenvKey
