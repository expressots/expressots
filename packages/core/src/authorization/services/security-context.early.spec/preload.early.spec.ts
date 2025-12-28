// Unit tests for: preload

import "reflect-metadata";
import { Container } from "../../../di/inversify";
import { injectable } from "../../../di/inversify";
import { Logger } from "../../../provider/logger/logger.provider";
import { SecurityContext } from "../security-context";
import type { IPermissionService } from "../permission-service.interface";

@injectable()
class MockPermissionService implements IPermissionService {
  async getPermissions(userId: string): Promise<Array<string>> {
    return ["permission1", "permission2"];
  }

  async hasPermission(
    userId: string,
    permission: string,
    tenantId?: string,
  ): Promise<boolean> {
    return ["permission1", "permission2"].includes(permission);
  }
}

describe("SecurityContext.preload() preload method", () => {
  let container: Container;
  let securityContext: SecurityContext;

  beforeEach(() => {
    container = new Container();
    container
      .bind<IPermissionService>("IPermissionService")
      .to(MockPermissionService)
      .inSingletonScope();
    container.bind(Logger).toSelf().inSingletonScope();

    securityContext = new SecurityContext(
      container.get<IPermissionService>("IPermissionService"),
      container.get(Logger),
    );
  });

  describe("Happy Path", () => {
    it("should preload permissions for user", async () => {
      // Act
      await securityContext.preload("user123");

      // Assert
      const permissions = await securityContext.getPermissions();
      expect(permissions).toContain("permission1");
      expect(permissions).toContain("permission2");
    });

    it("should not preload twice", async () => {
      // Arrange
      const service = container.get<IPermissionService>("IPermissionService");
      const getPermissionsSpy = jest.spyOn(service, "getPermissions");

      // Act
      await securityContext.preload("user123");
      await securityContext.preload("user123");

      // Assert
      expect(getPermissionsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing permission service", async () => {
      // Arrange
      const contextWithoutService = new SecurityContext(undefined, undefined);

      // Act & Assert
      await expect(
        contextWithoutService.preload("user123"),
      ).resolves.not.toThrow();
    });

    it("should handle permission service error", async () => {
      // Arrange
      const errorService: IPermissionService = {
        getPermissions: jest.fn().mockRejectedValue(new Error("Service error")),
        hasPermission: jest.fn().mockResolvedValue(false),
      };
      const contextWithError = new SecurityContext(errorService, undefined);

      // Act & Assert
      await expect(contextWithError.preload("user123")).resolves.not.toThrow();
    });
  });
});

// End of unit tests for: preload
