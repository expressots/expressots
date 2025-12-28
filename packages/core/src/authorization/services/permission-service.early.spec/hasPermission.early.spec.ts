// Unit tests for: PermissionService.hasPermission

import { PermissionService } from "../permission-service";
import { Logger } from "../../../provider/logger/logger.provider";

describe("PermissionService.hasPermission() hasPermission method", () => {
  let service: PermissionService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
    } as unknown as Logger;
    service = new PermissionService(mockLogger);
  });

  describe("Happy Path", () => {
    it("should return true when user has permission", async () => {
      // Arrange
      const userId = "user123";
      const permission = "read";
      const permissions = ["read", "write"];
      (service as any).cache.set(`default:${userId}`, permissions);

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user does not have permission", async () => {
      // Arrange
      const userId = "user123";
      const permission = "delete";
      const permissions = ["read", "write"];
      (service as any).cache.set(`default:${userId}`, permissions);

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(false);
    });

    it("should check permissions with tenant scope", async () => {
      // Arrange
      const userId = "user123";
      const tenantId = "tenant1";
      const permission = "read";
      const permissions = ["read"];
      (service as any).cache.set(`${tenantId}:${userId}`, permissions);

      // Act
      const result = await service.hasPermission(userId, permission, tenantId);

      // Assert
      expect(result).toBe(true);
    });
  });
});

// End of unit tests for: PermissionService.hasPermission
