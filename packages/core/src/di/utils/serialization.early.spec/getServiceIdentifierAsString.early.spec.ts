// Unit tests for: getServiceIdentifierAsString

import { getServiceIdentifierAsString } from "../serialization";
import { interfaces } from "../../interfaces/interfaces";

describe("getServiceIdentifierAsString() getServiceIdentifierAsString function", () => {
  describe("Happy Path", () => {
    it("should return function name for function identifier", () => {
      // Arrange
      class TestService {}
      const identifier: interfaces.ServiceIdentifier = TestService;

      // Act
      const result = getServiceIdentifierAsString(identifier);

      // Assert
      expect(result).toBe("TestService");
    });

    it("should return symbol string for symbol identifier", () => {
      // Arrange
      const identifier: interfaces.ServiceIdentifier = Symbol("TestService");

      // Act
      const result = getServiceIdentifierAsString(identifier);

      // Assert
      expect(result).toBe("Symbol(TestService)");
    });

    it("should return string for string identifier", () => {
      // Arrange
      const identifier: interfaces.ServiceIdentifier = "TestService";

      // Act
      const result = getServiceIdentifierAsString(identifier);

      // Assert
      expect(result).toBe("TestService");
    });
  });
});

// End of unit tests for: getServiceIdentifierAsString
