// Unit tests for: RequireAuth factory function

import { RequireAuth, AuthenticatedGuard } from "../authenticated.guard";

describe("RequireAuth() RequireAuth factory function", () => {
  describe("Happy Path", () => {
    it("should create an AuthenticatedGuard instance", () => {
      // Act
      const guard = RequireAuth();

      // Assert
      expect(guard).toBeInstanceOf(AuthenticatedGuard);
    });
  });
});

// End of unit tests for: RequireAuth factory function

