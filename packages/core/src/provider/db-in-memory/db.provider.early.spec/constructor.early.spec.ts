// Unit tests for: InMemoryDBProvider constructor

import { InMemoryDBProvider, InMemoryDBConfig } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

describe("InMemoryDBProvider constructor", () => {
  describe("Happy Path", () => {
    it("should create provider with default config", () => {
      // Act
      const provider = new InMemoryDBProvider();

      // Assert
      expect(provider).toBeInstanceOf(InMemoryDBProvider);
      expect(provider.name).toBe("In-Memory Database Provider");
      expect(provider.version).toBe("4.0.0");
      expect(provider.getConfig().timestamps).toBe(true);
      expect(provider.getConfig().softDelete).toBe(false);
      expect(provider.getConfig().logging).toBe(false);
      expect(provider.getConfig().maxRecordsPerTable).toBe(0);
    });

    it("should create provider with custom config", () => {
      // Arrange
      const config: InMemoryDBConfig = {
        timestamps: false,
        softDelete: true,
        logging: true,
        maxRecordsPerTable: 1000,
      };

      // Act
      const provider = new InMemoryDBProvider(config);

      // Assert
      expect(provider.getConfig().timestamps).toBe(false);
      expect(provider.getConfig().softDelete).toBe(true);
      expect(provider.getConfig().logging).toBe(true);
      expect(provider.getConfig().maxRecordsPerTable).toBe(1000);
    });

    it("should merge partial config with defaults", () => {
      // Arrange
      const config: Partial<InMemoryDBConfig> = {
        logging: true,
      };

      // Act
      const provider = new InMemoryDBProvider(config);

      // Assert
      expect(provider.getConfig().logging).toBe(true);
      expect(provider.getConfig().timestamps).toBe(true); // Default
      expect(provider.getConfig().softDelete).toBe(false); // Default
    });
  });
});

