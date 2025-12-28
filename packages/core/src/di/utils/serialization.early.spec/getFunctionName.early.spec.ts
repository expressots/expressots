// Unit tests for: getFunctionName

import { getFunctionName } from "../serialization";

describe("getFunctionName() getFunctionName function", () => {
  describe("Happy Path", () => {
    it("should return function name when available", () => {
      // Arrange
      function TestFunction() {}
      const func = { name: "TestFunction" };

      // Act
      const result = getFunctionName(func);

      // Assert
      expect(result).toBe("TestFunction");
    });

    it("should extract name from function string when name is null", () => {
      // Arrange
      const func = {
        name: null,
        toString: () => "function MyFunction() {}",
      };

      // Act
      const result = getFunctionName(func);

      // Assert
      expect(result).toBe("MyFunction");
    });

    it("should return anonymous function string when name cannot be extracted", () => {
      // Arrange
      const func = {
        name: null,
        toString: () => "() => {}",
      };

      // Act
      const result = getFunctionName(func);

      // Assert
      expect(result).toContain("Anonymous function");
    });
  });
});

// End of unit tests for: getFunctionName

