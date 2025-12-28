// Unit tests for: AuthenticatedGuard.canActivate

import { AuthenticatedGuard } from "../authenticated.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal } from "../../guard.interface";
import { AppError, StatusCode } from "../../../error";

describe("AuthenticatedGuard.canActivate() canActivate method", () => {
  let guard: AuthenticatedGuard;
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
    guard = new AuthenticatedGuard();
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
    it("should allow access when user is authenticated", async () => {
      // Arrange
      (mockPrincipal.isAuthenticated as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(mockPrincipal.isAuthenticated).toHaveBeenCalled();
    });

    it("should deny access when user is not authenticated", async () => {
      // Arrange
      (mockPrincipal.isAuthenticated as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.statusCode).toBe(StatusCode.Unauthorized);
      expect(result.error?.message).toBe("Authentication required");
    });
  });
});

// End of unit tests for: AuthenticatedGuard.canActivate

