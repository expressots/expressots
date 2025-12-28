// Unit tests for: whenGuard

import { whenGuard } from "../conditional.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal, IGuard } from "../../guard.interface";
import { AuthenticatedGuard } from "../authenticated.guard";

describe("whenGuard() whenGuard function", () => {
  let mockContext: GuardContext;
  let mockPrincipal: Principal;
  let mockGuard: IGuard;

  beforeEach(() => {
    mockPrincipal = {
      details: { id: "user123" },
      isAuthenticated: jest.fn().mockResolvedValue(true),
      isInRole: jest.fn(),
      isResourceOwner: jest.fn(),
    } as unknown as Principal;

    mockContext = {
      request: { method: "GET" } as any,
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

    mockGuard = {
      canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
    } as unknown as IGuard;
  });

  describe("Happy Path", () => {
    it("should execute guard when condition is true", async () => {
      // Arrange
      const condition = jest.fn().mockResolvedValue(true);
      const guard = whenGuard(condition, mockGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
      expect(condition).toHaveBeenCalledWith(mockContext);
      expect(mockGuard.canActivate).toHaveBeenCalledWith(mockContext);
    });

    it("should skip guard when condition is false", async () => {
      // Arrange
      const condition = jest.fn().mockResolvedValue(false);
      const guard = whenGuard(condition, mockGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
      expect(condition).toHaveBeenCalledWith(mockContext);
      expect(mockGuard.canActivate).not.toHaveBeenCalled();
    });

    it("should instantiate guard class when guard is a function", async () => {
      // Arrange
      const condition = jest.fn().mockResolvedValue(true);
      const guard = whenGuard(condition, AuthenticatedGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
    });

    it("should handle synchronous condition", async () => {
      // Arrange
      const condition = jest.fn().mockReturnValue(true);
      const guard = whenGuard(condition, mockGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
    });

    it("should handle guard returning boolean instead of GuardResult", async () => {
      // Arrange
      const condition = jest.fn().mockResolvedValue(true);
      const booleanGuard = {
        canActivate: jest.fn().mockResolvedValue(true),
      } as unknown as IGuard;
      const guard = whenGuard(condition, booleanGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
    });

    it("should handle guard returning false boolean", async () => {
      // Arrange
      const condition = jest.fn().mockResolvedValue(true);
      const booleanGuard = {
        canActivate: jest.fn().mockResolvedValue(false),
      } as unknown as IGuard;
      const guard = whenGuard(condition, booleanGuard);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(false);
    });
  });
});

// End of unit tests for: whenGuard

