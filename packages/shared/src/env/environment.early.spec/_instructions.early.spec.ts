/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: _instructions

import { _instructions } from "../environment";

jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mock interface for IConfigOutput
class MockIConfigOutput {
  public parsed: { [key: string]: string } = {};
}

describe("_instructions() _instructions method", () => {
  let mockConfigOutput: MockIConfigOutput;

  beforeEach(() => {
    mockConfigOutput = new MockIConfigOutput();
  });

  test("should throw an error for invalid dotenvKey format", () => {
    const invalidKey = "invalid_key_format";

    expect(() => {
      _instructions(mockConfigOutput as any, invalidKey);
    }).toThrowError(
      "INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development",
    );
  });

  test("should throw an error for missing key in dotenvKey", () => {
    const missingKey = "dotenv://@dotenvx.com/vault/.env.vault?environment=development";

    expect(() => {
      _instructions(mockConfigOutput as any, missingKey);
    }).toThrowError("INVALID_DOTENV_KEY: Missing key part");
  });

  test("should throw an error for missing environment in dotenvKey", () => {
    const missingEnvironment = "dotenv://:key_1234@dotenvx.com/vault/.env.vault";

    expect(() => {
      _instructions(mockConfigOutput as any, missingEnvironment);
    }).toThrowError("INVALID_DOTENV_KEY: Missing environment part");
  });

  test("should throw an error if environment key is not found in parsed result", () => {
    const validKey = "dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=production";
    mockConfigOutput.parsed = {}; // No environment key

    expect(() => {
      _instructions(mockConfigOutput as any, validKey);
    }).toThrowError(
      "NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment DOTENV_VAULT_PRODUCTION in your .env.vault file.",
    );
  });

  test("should return ciphertext and key for valid dotenvKey and existing environment", () => {
    const validKey = "dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=production";
    mockConfigOutput.parsed = {
      DOTENV_VAULT_PRODUCTION: "ciphertext_value",
    };

    const result = _instructions(mockConfigOutput as any, validKey);

    expect(result).toEqual({
      ciphertext: "ciphertext_value",
      key: "key_1234",
    });
  });
});

// End of unit tests for: _instructions
