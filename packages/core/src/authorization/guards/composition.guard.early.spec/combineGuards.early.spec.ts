// Unit tests for: combineGuards

import { combineGuards } from "../composition.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal, IGuard } from "../../guard.interface";
import { AuthenticatedGuard } from "../authenticated.guard";

describe("combineGuards() combineGuards function", () => {
  let mockContext: GuardContext;
  let mockPrincipal: Principal;

  beforeEach(() => {
    mockPrincipal = {
      details: { id: "user123" },
      isAuthenticated: jest.fn().mockResolvedValue(true),
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
    it("should allow access when all guards allow", async () => {
      // Arrange
      const guard1: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const combined = combineGuards(guard1, guard2);

      // Act
      const result = await combined.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
      expect(guard1.canActivate).toHaveBeenCalled();
      expect(guard2.canActivate).toHaveBeenCalled();
    });

    it("should deny access when first guard denies", async () => {
      // Arrange
      const guard1: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.deny()),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const combined = combineGuards(guard1, guard2);

      // Act
      const result = await combined.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(false);
      expect(guard1.canActivate).toHaveBeenCalled();
      expect(guard2.canActivate).not.toHaveBeenCalled();
    });

    it("should deny access when second guard denies", async () => {
      // Arrange
      const guard1: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.deny()),
      } as unknown as IGuard;
      const combined = combineGuards(guard1, guard2);

      // Act
      const result = await combined.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(false);
      expect(guard1.canActivate).toHaveBeenCalled();
      expect(guard2.canActivate).toHaveBeenCalled();
    });

    it("should instantiate guard classes", async () => {
      // Arrange
      const combined = combineGuards(AuthenticatedGuard);

      // Act
      const result = await combined.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
    });

    it("should handle guards returning boolean instead of GuardResult", async () => {
      // Arrange
      const guard1: IGuard = {
        canActivate: jest.fn().mockResolvedValue(true),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockResolvedValue(false),
      } as unknown as IGuard;
      const combined = combineGuards(guard1, guard2);

      // Act
      const result = await combined.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(false);
    });
  });
});

// End of unit tests for: combineGuards

