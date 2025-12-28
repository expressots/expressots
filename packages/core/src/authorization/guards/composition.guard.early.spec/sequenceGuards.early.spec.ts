// Unit tests for: sequenceGuards

import { sequenceGuards, combineGuards } from "../composition.guard";
import { GuardResult } from "../../guard.interface";
import type { GuardContext, Principal, IGuard } from "../../guard.interface";

describe("sequenceGuards() sequenceGuards function", () => {
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
    it("should have same behavior as combineGuards", async () => {
      // Arrange
      const guard1: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;
      const sequenced = sequenceGuards(guard1, guard2);

      // Act
      const result = await sequenced.canActivate(mockContext);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect((result as GuardResult).allowed).toBe(true);
      expect(guard1.canActivate).toHaveBeenCalled();
      expect(guard2.canActivate).toHaveBeenCalled();
    });

    it("should execute guards sequentially", async () => {
      // Arrange
      const executionOrder: Array<number> = [];
      const guard1: IGuard = {
        canActivate: jest.fn().mockImplementation(async () => {
          executionOrder.push(1);
          return GuardResult.allow();
        }),
      } as unknown as IGuard;
      const guard2: IGuard = {
        canActivate: jest.fn().mockImplementation(async () => {
          executionOrder.push(2);
          return GuardResult.allow();
        }),
      } as unknown as IGuard;
      const sequenced = sequenceGuards(guard1, guard2);

      // Act
      await sequenced.canActivate(mockContext);

      // Assert
      expect(executionOrder).toEqual([1, 2]);
    });
  });
});

// End of unit tests for: sequenceGuards

