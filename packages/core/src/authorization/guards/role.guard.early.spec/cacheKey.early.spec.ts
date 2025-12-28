// Unit tests for: RoleGuard.cacheKey

import { RoleGuard } from "../role.guard";
import type { GuardContext, Principal } from "../../guard.interface";

describe("RoleGuard.cacheKey() cacheKey method", () => {
  let guard: RoleGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
    guard = new RoleGuard(["admin", "user"]);
    mockPrincipal = {
      details: { id: "user123" },
      isAuthenticated: jest.fn(),
      isInRole: jest.fn(),
      isResourceOwner: jest.fn(),
    } as unknown as Principal;

    mockContext = {
      request: {} as any,
      response: {} as any,
      principal: mockPrincipal,
      container: {} as any,
      scope: { request: "req-123" },
      route: {
        controller: "TestController",
        method: "testMethod",
        path: "/test",
        params: {},
        query: {},
      },
      getScoped: jest.fn(),
      getTenantId: jest.fn(),
      getRequestId: jest.fn(),
    };
  });

  describe("Happy Path", () => {
    it("should generate cache key with roles and user id", () => {
      // Act
      const key = guard.cacheKey(mockContext);

      // Assert
      expect(key).toBe("role:admin,user:user123");
    });

    it("should use anonymous when user id is not available", () => {
      // Arrange
      mockPrincipal.details = null;

      // Act
      const key = guard.cacheKey(mockContext);

      // Assert
      expect(key).toBe("role:admin,user:anonymous");
    });

    it("should use anonymous when details is undefined", () => {
      // Arrange
      mockPrincipal.details = undefined;

      // Act
      const key = guard.cacheKey(mockContext);

      // Assert
      expect(key).toBe("role:admin,user:anonymous");
    });
  });
});

// End of unit tests for: RoleGuard.cacheKey

