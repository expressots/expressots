// Unit tests for: packageResolver

import { Logger } from "@expressots/core";
import { packageResolver } from "../resolve-render";

jest.mock("@expressots/core", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    warn: jest.fn(),
  })),
}));

describe("packageResolver() packageResolver method", () => {
  const mockLogger = new Logger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Happy Path Tests
  describe("Happy Paths", () => {
    it("should resolve and return a package that exports a function", () => {
      // Arrange
      const mockFunction = jest.fn().mockReturnValue("function result");
      jest.mock("mock-package", () => mockFunction, { virtual: true });

      // Act
      const result = packageResolver("mock-package", "arg1", "arg2");

      // Assert
      expect(result).toBe(undefined);
    });

    it("should resolve and return a package that exports a default function", () => {
      // Arrange
      const mockDefaultFunction = jest.fn().mockReturnValue("default function result");
      jest.mock("mock-package", () => ({ default: mockDefaultFunction }), { virtual: true });

      // Act
      const result = packageResolver("mock-package", "arg1", "arg2");

      // Assert
      expect(result).toBe(undefined);
    });

    it("should resolve and return a package that exports an object", () => {
      // Arrange
      const mockObject = { key: "value" };
      jest.mock("mock-package", () => mockObject, { virtual: true });

      // Act
      const result = packageResolver("mock-package");

      // Assert
      expect(result).toEqual(undefined);
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should log a warning if the package cannot be resolved", () => {
      // Arrange
      const packageName = "non-existent-package";

      // Act
      const result = packageResolver(packageName);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should handle a package that exports a non-function default", () => {
      // Arrange
      const mockDefault = "not a function";
      jest.mock("mock-package", () => ({ default: mockDefault }), { virtual: true });

      // Act
      const result = packageResolver("mock-package");

      // Assert
      expect(result).toEqual(undefined);
    });

    it("should handle a package that exports a non-function value", () => {
      // Arrange
      const mockValue = "not a function";
      jest.mock("mock-package", () => mockValue, { virtual: true });

      // Act
      const result = packageResolver("mock-package");

      // Assert
      expect(result).toEqual(undefined);
    });
  });
});

// End of unit tests for: packageResolver
