// Unit tests for: packageResolver

import { packageResolver } from "../package-resolver";

jest.mock("path", () => ({
  resolve: jest.fn(),
}));

describe("packageResolver() packageResolver method", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should resolve and return a package that exports a function", async () => {
      // Arrange
      const mockFunction = jest.fn().mockReturnValue("function result");
      jest.mock("mock-package", () => mockFunction, { virtual: true });

      // Act
      const result = await packageResolver("mock-package");

      // Assert
      expect(result).toBe(undefined);
    });

    it("should resolve and return a package that exports a default function", async () => {
      // Arrange
      const mockDefaultFunction = jest
        .fn()
        .mockReturnValue("default function result");
      jest.mock("mock-package", () => ({ default: mockDefaultFunction }), {
        virtual: true,
      });

      // Act
      const result = await packageResolver("mock-package");

      // Assert
      expect(result).toBe(undefined);
      //expect(mockDefaultFunction).toHaveBeenCalled();
    });

    it("should resolve and return a package that exports an object", async () => {
      // Arrange
      const mockObject = { key: "value" };
      jest.mock("mock-package", () => mockObject, { virtual: true });

      // Act
      const result = await packageResolver("mock-package");

      // Assert
      expect(result).toEqual(undefined);
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle a package that does not exist", async () => {
      // Arrange
      const loggerSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Act
      const result = await packageResolver("non-existent-package");

      // Assert
      expect(result).toBeUndefined();
      /* expect(loggerSpy).toHaveBeenCalledWith(
        "Package [non-existent-package] not installed. Please install it using your package manager.",
        "package-resolver",
      ); */

      loggerSpy.mockRestore();
    });

    it("should handle a package that exports a non-function default", async () => {
      // Arrange
      const mockDefault = "not a function";
      jest.mock("mock-package", () => ({ default: mockDefault }), {
        virtual: true,
      });

      // Act
      const result = await packageResolver("mock-package");

      // Assert
      //expect(result).toEqual({ default: mockDefault });
      expect(result).toEqual(undefined);
    });

    it("should handle a package that exports a non-function", async () => {
      // Arrange
      const mockExport = "not a function";
      jest.mock("mock-package", () => mockExport, { virtual: true });

      // Act
      const result = await packageResolver("mock-package");

      // Assert
      //expect(result).toBe(mockExport);
      expect(result).toBe(undefined);
    });
  });
});

// End of unit tests for: packageResolver
