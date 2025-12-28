// Unit tests for: NotFoundError constructor

import { NotFoundError } from "../not-found.error";
import { StatusCode } from "../status-code";

describe("NotFoundError() NotFoundError constructor", () => {
  describe("Happy Path", () => {
    it("should create NotFoundError with resource name", () => {
      // Act
      const error = new NotFoundError("User");

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
      expect(error.type).toBe("https://expressots.dev/errors/not-found");
      expect(error.details).toEqual({ resource: "User", id: undefined });
    });

    it("should create NotFoundError with resource name and id", () => {
      // Act
      const error = new NotFoundError("User", "123");

      // Assert
      expect(error.message).toBe("User with id 123 not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
      expect(error.details).toEqual({ resource: "User", id: "123" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty resource name", () => {
      // Act
      const error = new NotFoundError("");

      // Assert
      expect(error.message).toBe(" not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
    });

    it("should handle undefined id", () => {
      // Act
      const error = new NotFoundError("User", undefined);

      // Assert
      expect(error.message).toBe("User not found");
      expect(error.details).toEqual({ resource: "User", id: undefined });
    });
  });
});

// End of unit tests for: NotFoundError constructor

