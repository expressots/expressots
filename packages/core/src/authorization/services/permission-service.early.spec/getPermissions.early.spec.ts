// Unit tests for: PermissionService.getPermissions

import { PermissionService } from "../permission-service";
import { Logger } from "../../../provider/logger/logger.provider";

describe("PermissionService.getPermissions() getPermissions method", () => {
  let service: PermissionService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
    } as unknown as Logger;
    service = new PermissionService(mockLogger);
  });

  describe("Happy Path", () => {
    it("should return cached permissions when available", async () => {
      // Arrange
      const userId = "user123";
      const tenantId = "tenant1";
      const permissions = ["read", "write"];
      (service as any).cache.set(`${tenantId}:${userId}`, permissions);

      // Act
      const result = await service.getPermissions(userId, tenantId);

      // Assert
      expect(result).toEqual(permissions);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should return empty array and log warning when not implemented", async () => {
      // Arrange
      const userId = "user123";
      const tenantId = "tenant1";

      // Act
      const result = await service.getPermissions(userId, tenantId);

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect((service as any).cache.has(`${tenantId}:${userId}`)).toBe(true);
    });

    it("should use default tenant when tenantId is not provided", async () => {
      // Arrange
      const userId = "user123";

      // Act
      const result = await service.getPermissions(userId);

      // Assert
      expect(result).toEqual([]);
      expect((service as any).cache.has(`default:${userId}`)).toBe(true);
    });
  });
});

// End of unit tests for: PermissionService.getPermissions
