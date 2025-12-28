// Unit tests for: AttributeBasedGuard.canActivate

import { AttributeBasedGuard } from "../attribute-based.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal } from "../../guard.interface";
import { AppError, StatusCode } from "../../../error";

describe("AttributeBasedGuard.canActivate() canActivate method", () => {
  let guard: AttributeBasedGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
    mockPrincipal = {
      details: { id: "user123", department: "IT" },
      isAuthenticated: jest.fn().mockResolvedValue(true),
      isInRole: jest.fn().mockImplementation((role: string) => {
        return Promise.resolve(role === "admin" || role === "user");
      }),
      isResourceOwner: jest.fn(),
    } as unknown as Principal;

    mockContext = {
      request: { ip: "192.168.1.1" } as any,
      response: {} as any,
      principal: mockPrincipal,
      container: {} as any,
      scope: { request: "req-123", tenant: "tenant1" },
      route: {
        controller: "DocumentController",
        method: "getDocument",
        path: "/documents/:id",
        params: { id: "doc123" },
        query: {},
      },
      getScoped: jest.fn(),
      getTenantId: jest.fn(),
      getRequestId: jest.fn(),
    };
  });

  describe("Happy Path", () => {
    it("should allow access when policy returns true", async () => {
      // Arrange
      const policy = jest.fn().mockResolvedValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(policy).toHaveBeenCalled();
      const attributes = policy.mock.calls[0][0];
      expect(attributes.user.id).toBe("user123");
      expect(attributes.resource.id).toBe("doc123");
      expect(attributes.environment.ip).toBe("192.168.1.1");
    });

    it("should deny access when policy returns false", async () => {
      // Arrange
      const policy = jest.fn().mockResolvedValue(false);
      guard = new AttributeBasedGuard(policy);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.Forbidden);
      expect(result.error?.message).toBe("Policy evaluation failed");
    });

    it("should handle synchronous policy function", async () => {
      // Arrange
      const policy = jest.fn().mockReturnValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
    });

    it("should build attributes correctly from context", async () => {
      // Arrange
      const policy = jest.fn().mockResolvedValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      await guard.canActivate(mockContext);

      // Assert
      const attributes = policy.mock.calls[0][0];
      expect(attributes.user.id).toBe("user123");
      expect(attributes.user.department).toBe("IT");
      expect(attributes.user.roles).toContain("admin");
      expect(attributes.user.roles).toContain("user");
      expect(attributes.resource.id).toBe("doc123");
      expect(attributes.resource.type).toBe("DocumentController");
      expect(attributes.environment.time).toBeInstanceOf(Date);
      expect(attributes.environment.ip).toBe("192.168.1.1");
      expect(attributes.environment.tenant).toBe("tenant1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle policy throwing error", async () => {
      // Arrange
      const policy = jest.fn().mockRejectedValue(new Error("Policy error"));
      guard = new AttributeBasedGuard(policy);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error?.message).toContain("Policy evaluation error");
    });

    it("should use anonymous when user details are missing", async () => {
      // Arrange
      mockPrincipal.details = null;
      const policy = jest.fn().mockResolvedValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      await guard.canActivate(mockContext);

      // Assert
      const attributes = policy.mock.calls[0][0];
      expect(attributes.user.id).toBe("anonymous");
    });

    it("should use query param when route param is missing", async () => {
      // Arrange
      mockContext.route.params = {};
      mockContext.route.query = { id: "query123" };
      const policy = jest.fn().mockResolvedValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      await guard.canActivate(mockContext);

      // Assert
      const attributes = policy.mock.calls[0][0];
      expect(attributes.resource.id).toBe("query123");
    });

    it("should handle missing resource ID", async () => {
      // Arrange
      mockContext.route.params = {};
      mockContext.route.query = {};
      const policy = jest.fn().mockResolvedValue(true);
      guard = new AttributeBasedGuard(policy);

      // Act
      await guard.canActivate(mockContext);

      // Assert
      const attributes = policy.mock.calls[0][0];
      expect(attributes.resource.id).toBe("");
    });
  });
});

// End of unit tests for: AttributeBasedGuard.canActivate

