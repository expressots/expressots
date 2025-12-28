// Unit tests for: PermissionGuard.cacheKey

import { PermissionGuard } from "../permission.guard";
import type { GuardContext, Principal } from "../../guard.interface";

describe("PermissionGuard.cacheKey() cacheKey method", () => {
  let guard: PermissionGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
    guard = new PermissionGuard("documents:read");
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
    it("should generate cache key with permission and user id", () => {
      // Act
      const key = guard.cacheKey(mockContext);

      // Assert
      expect(key).toBe("permission:documents:read:user123");
    });

    it("should use anonymous when user id is not available", () => {
      // Arrange
      mockPrincipal.details = null;

      // Act
      const key = guard.cacheKey(mockContext);

      // Assert
      expect(key).toBe("permission:documents:read:anonymous");
    });
  });
});

// End of unit tests for: PermissionGuard.cacheKey

