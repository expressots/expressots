// Unit tests for: decrypt

import crypto from "crypto";
import { decrypt } from "../environment";

jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(), // Mock the log function
  };
});

describe("decrypt() decrypt method", () => {
  // Test for successful decryption
  // Test for invalid key length
  it("should throw an error for an invalid key length", () => {
    const keyStr = "short_key";
    const encrypted = "some_base64_string";

    expect(() => decrypt(encrypted, keyStr)).toThrowError(
      new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)"),
    );
  });

  // Test for decryption failure
  it("should throw an error if decryption fails due to unsupported state or authentication failure", () => {
    const keyStr = "a".repeat(64);
    const encrypted = "invalid_base64_string";

    expect(() => decrypt(encrypted, keyStr)).toThrowError(
      new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY"),
    );
  });

  // Test for other errors
  it("should rethrow unexpected errors", () => {
    const keyStr = "a".repeat(64);
    const encrypted = "some_base64_string";

    // Mock crypto.createDecipheriv to throw an unexpected error
    jest.spyOn(crypto, "createDecipheriv").mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    expect(() => decrypt(encrypted, keyStr)).toThrowError("Unexpected error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

// End of unit tests for: decrypt
