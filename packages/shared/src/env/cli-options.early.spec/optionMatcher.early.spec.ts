// Unit tests for: optionMatcher

import { optionMatcher } from "../cli-options";

// Import necessary modules and types
// Mock the ENV_VAR_REGEX for testing purposes
jest.mock("../constants", () => ({
  ENV_VAR_REGEX: /^(\w+)=(.*)$/,
}));

describe("optionMatcher() optionMatcher method", () => {
  // Test: Should return an empty object when no arguments are passed
  it("should return an empty object when no arguments are passed", () => {
    const result = optionMatcher([]);
    expect(result).toEqual({});
  });

  // Test: Should correctly parse a single valid environment variable
  it("should correctly parse a single valid environment variable", () => {
    const result = optionMatcher(["KEY=value"]);
    expect(result).toEqual({ KEY: "value" });
  });

  // Test: Should correctly parse multiple valid environment variables
  it("should correctly parse multiple valid environment variables", () => {
    const result = optionMatcher(["KEY1=value1", "KEY2=value2"]);
    expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
  });

  // Test: Should ignore arguments that do not match the ENV_VAR_REGEX
  it("should ignore arguments that do not match the ENV_VAR_REGEX", () => {
    const result = optionMatcher(["KEY1=value1", "INVALID", "KEY2=value2"]);
    expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
  });

  // Test: Should handle empty values correctly
  it("should handle empty values correctly", () => {
    const result = optionMatcher(["KEY="]);
    expect(result).toEqual({ KEY: "" });
  });

  // Test: Should handle keys with special characters correctly
  it("should handle keys with special characters correctly", () => {
    const result = optionMatcher(["KEY_1=value"]);
    expect(result).toEqual({ KEY_1: "value" });
  });

  // Test: Should handle values with special characters correctly
  it("should handle values with special characters correctly", () => {
    const result = optionMatcher(["KEY=value_with_special_chars!@#$%^&*()"]);
    expect(result).toEqual({ KEY: "value_with_special_chars!@#$%^&*()" });
  });

  // Test: Should be case-sensitive
  it("should be case-sensitive", () => {
    const result = optionMatcher(["key=value", "KEY=anotherValue"]);
    expect(result).toEqual({ key: "value", KEY: "anotherValue" });
  });

  // Test: Should handle duplicate keys by overwriting with the last occurrence
  it("should handle duplicate keys by overwriting with the last occurrence", () => {
    const result = optionMatcher(["KEY=value1", "KEY=value2"]);
    expect(result).toEqual({ KEY: "value2" });
  });
});

// End of unit tests for: optionMatcher
