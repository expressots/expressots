// Unit tests for: PermissionGuard.canActivate

import { PermissionGuard } from "../permission.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal } from "../../guard.interface";
import type { ISecurityContext } from "../../services/security-context.interface";
import { AppError, StatusCode } from "../../../error";

describe("PermissionGuard.canActivate() canActivate method", () => {
  let guard: PermissionGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;
  let mockSecurityContext: ISecurityContext;

  beforeEach(() => {
    mockSecurityContext = {
      hasPermission: jest.fn(),
      addPermission: jest.fn(),
      getPermissions: jest.fn(),
      preload: jest.fn(),
    } as unknown as ISecurityContext;

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
    it("should allow access when SecurityContext has permission", async () => {
      // Arrange
      guard = new PermissionGuard("documents:read");
      (guard as any).securityContext = mockSecurityContext;
      (mockSecurityContext.hasPermission as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(mockSecurityContext.hasPermission).toHaveBeenCalledWith("documents:read");
    });

    it("should deny access when SecurityContext does not have permission", async () => {
      // Arrange
      guard = new PermissionGuard("documents:read");
      (guard as any).securityContext = mockSecurityContext;
      (mockSecurityContext.hasPermission as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.Forbidden);
      expect(result.error?.message).toContain("Missing permission: documents:read");
    });

    it("should use principal.hasPermission when SecurityContext is not available", async () => {
      // Arrange
      guard = new PermissionGuard("documents:read");
      (guard as any).securityContext = undefined;
      (mockPrincipal as any).hasPermission = jest.fn().mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect((mockPrincipal as any).hasPermission).toHaveBeenCalledWith("documents:read");
    });

    it("should deny access when principal.hasPermission returns false", async () => {
      // Arrange
      guard = new PermissionGuard("documents:read");
      (guard as any).securityContext = undefined;
      (mockPrincipal as any).hasPermission = jest.fn().mockResolvedValue(false);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error?.message).toContain("Missing permission: documents:read");
    });
  });

  describe("Edge Cases", () => {
    it("should deny access when no permission checking is available", async () => {
      // Arrange
      guard = new PermissionGuard("documents:read");
      (guard as any).securityContext = undefined;
      // Principal doesn't have hasPermission method

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error?.message).toContain("Permission check not available: documents:read");
    });
  });
});

// End of unit tests for: PermissionGuard.canActivate

