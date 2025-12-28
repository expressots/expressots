// Unit tests for: RoleGuard.canActivate

import { RoleGuard } from "../role.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal } from "../../guard.interface";
import { AppError, StatusCode } from "../../../error";

describe("RoleGuard.canActivate() canActivate method", () => {
  let guard: RoleGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
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
    it("should allow access when user has one of the required roles", async () => {
      // Arrange
      guard = new RoleGuard(["admin", "moderator"]);
      (mockPrincipal.isInRole as jest.Mock)
        .mockResolvedValueOnce(false) // admin check
        .mockResolvedValueOnce(true); // moderator check

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(mockPrincipal.isInRole).toHaveBeenCalledTimes(2);
    });

    it("should allow access when user has the first required role", async () => {
      // Arrange
      guard = new RoleGuard(["admin", "moderator"]);
      (mockPrincipal.isInRole as jest.Mock).mockResolvedValueOnce(true); // admin check

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
    });

    it("should deny access when user has none of the required roles", async () => {
      // Arrange
      guard = new RoleGuard(["admin", "moderator"]);
      (mockPrincipal.isInRole as jest.Mock)
        .mockResolvedValueOnce(false) // admin check
        .mockResolvedValueOnce(false); // moderator check

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.Forbidden);
      expect(result.error?.message).toContain(
        "Requires one of: admin, moderator",
      );
    });
  });
});

// End of unit tests for: RoleGuard.canActivate
