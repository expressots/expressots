// Unit tests for: getSymbolDescription

import { getSymbolDescription } from "../serialization";

describe("getSymbolDescription() getSymbolDescription function", () => {
  describe("Happy Path", () => {
    it("should extract description from symbol", () => {
      // Arrange
      const symbol = Symbol("TestSymbol");

      // Act
      const result = getSymbolDescription(symbol);

      // Assert
      expect(result).toBe("TestSymbol");
    });

    it("should handle symbol without description", () => {
      // Arrange
      const symbol = Symbol();

      // Act
      const result = getSymbolDescription(symbol);

      // Assert
      expect(result).toBe("");
    });
  });
});

// End of unit tests for: getSymbolDescription
