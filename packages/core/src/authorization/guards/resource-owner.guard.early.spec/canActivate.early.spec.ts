// Unit tests for: ResourceOwnerGuard.canActivate

import { ResourceOwnerGuard } from "../resource-owner.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal } from "../../guard.interface";
import { AppError, StatusCode } from "../../../error";

describe("ResourceOwnerGuard.canActivate() canActivate method", () => {
  let guard: ResourceOwnerGuard;
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
        params: { id: "resource123" },
        query: {},
      },
      getScoped: jest.fn(),
      getTenantId: jest.fn(),
      getRequestId: jest.fn(),
    };
  });

  describe("Happy Path", () => {
    it("should allow access when user is resource owner", async () => {
      // Arrange
      guard = new ResourceOwnerGuard("id");
      (mockPrincipal.isResourceOwner as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(mockPrincipal.isResourceOwner).toHaveBeenCalledWith("resource123");
    });

    it("should deny access when user is not resource owner", async () => {
      // Arrange
      guard = new ResourceOwnerGuard("id");
      (mockPrincipal.isResourceOwner as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.Forbidden);
      expect(result.error?.message).toBe("Not resource owner");
    });

    it("should use custom param name", async () => {
      // Arrange
      guard = new ResourceOwnerGuard("documentId");
      mockContext.route.params = { documentId: "doc123" };
      (mockPrincipal.isResourceOwner as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result.allowed).toBe(true);
      expect(mockPrincipal.isResourceOwner).toHaveBeenCalledWith("doc123");
    });
  });

  describe("Edge Cases", () => {
    it("should deny access when resource ID parameter is missing", async () => {
      // Arrange
      guard = new ResourceOwnerGuard("id");
      mockContext.route.params = {};

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.BadRequest);
      expect(result.error?.message).toContain("Resource ID parameter 'id' is required");
    });
  });
});

// End of unit tests for: ResourceOwnerGuard.canActivate

