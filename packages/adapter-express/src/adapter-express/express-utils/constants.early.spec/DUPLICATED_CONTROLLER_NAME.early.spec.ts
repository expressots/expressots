// Unit tests for: DUPLICATED_CONTROLLER_NAME

import { DUPLICATED_CONTROLLER_NAME } from "../constants";

describe("DUPLICATED_CONTROLLER_NAME() DUPLICATED_CONTROLLER_NAME method", () => {
  // Happy Path Tests
  describe("Happy Path", () => {
    it("should return the correct error message for a given controller name", () => {
      // Test to ensure the function returns the expected string when provided with a valid controller name
      const controllerName = "UserController";
      const expectedMessage = "Two controllers cannot have the same name: UserController";
      const result = DUPLICATED_CONTROLLER_NAME(controllerName);
      expect(result).toBe(expectedMessage);
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle an empty string as a controller name", () => {
      // Test to ensure the function handles an empty string input gracefully
      const controllerName = "";
      const expectedMessage = "Two controllers cannot have the same name: ";
      const result = DUPLICATED_CONTROLLER_NAME(controllerName);
      expect(result).toBe(expectedMessage);
    });

    it("should handle a controller name with special characters", () => {
      // Test to ensure the function handles special characters in the controller name
      const controllerName = "@dm!nC0ntr0ller#";
      const expectedMessage = "Two controllers cannot have the same name: @dm!nC0ntr0ller#";
      const result = DUPLICATED_CONTROLLER_NAME(controllerName);
      expect(result).toBe(expectedMessage);
    });

    it("should handle a controller name with spaces", () => {
      // Test to ensure the function handles spaces in the controller name
      const controllerName = "User Controller";
      const expectedMessage = "Two controllers cannot have the same name: User Controller";
      const result = DUPLICATED_CONTROLLER_NAME(controllerName);
      expect(result).toBe(expectedMessage);
    });

    it("should handle a controller name with numeric values", () => {
      // Test to ensure the function handles numeric values in the controller name
      const controllerName = "Controller123";
      const expectedMessage = "Two controllers cannot have the same name: Controller123";
      const result = DUPLICATED_CONTROLLER_NAME(controllerName);
      expect(result).toBe(expectedMessage);
    });
  });
});

// End of unit tests for: DUPLICATED_CONTROLLER_NAME
