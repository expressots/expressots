// Unit tests for: get

import { EnvValidatorProvider } from "../env-validator.provider";

describe("EnvValidatorProvider.get() get method", () => {
  let envValidatorProvider: EnvValidatorProvider;

  beforeEach(() => {
    envValidatorProvider = new EnvValidatorProvider();
  });

  describe("Happy Path", () => {
    it("should return the value of an existing environment variable", () => {
      // Arrange
      const key = "EXISTING_VAR";
      const value = "someValue";
      process.env[key] = value;

      // Act
      const result = envValidatorProvider.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it("should return the default value if the environment variable is not set", () => {
      // Arrange
      const key = "NON_EXISTING_VAR";
      const defaultValue = "defaultValue";

      // Act
      const result = envValidatorProvider.get(key, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
    });

    it("should return undefined if the environment variable is not set and no default value is provided", () => {
      // Arrange
      const key = "ANOTHER_NON_EXISTING_VAR";

      // Act
      const result = envValidatorProvider.get(key);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should return an empty string if the environment variable is set to an empty string", () => {
      // Arrange
      const key = "EMPTY_STRING_VAR";
      process.env[key] = "";

      // Act
      const result = envValidatorProvider.get(key);

      // Assert
      expect(result).toBe("");
    });

    it("should handle environment variable keys with special characters", () => {
      // Arrange
      const key = "SPECIAL_CHAR_VAR!@#$%^&*()";
      const value = "specialValue";
      process.env[key] = value;

      // Act
      const result = envValidatorProvider.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it("should handle environment variable keys with mixed case sensitivity", () => {
      // Arrange
      const key = "MixedCaseVar";
      const value = "mixedCaseValue";
      process.env[key] = value;

      // Act
      const result = envValidatorProvider.get(key);

      // Assert
      expect(result).toBe(value);
    });
  });
});

// End of unit tests for: get
