// Unit tests for: isInitialized

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import { GuardRegistry } from "../guard-registry";

describe("GuardRegistry.isInitialized() isInitialized method", () => {
  let container: Container;
  let logger: Logger;
  let registry: GuardRegistry;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    registry = new GuardRegistry(container, logger);
  });

  describe("Happy Path", () => {
    it("should return false before initialization", () => {
      // Act
      const result = registry.isInitialized();

      // Assert
      expect(result).toBe(false);
    });

    it("should return true after initialization", () => {
      // Act
      registry.initialize();
      const result = registry.isInitialized();

      // Assert
      expect(result).toBe(true);
    });
  });
});

// End of unit tests for: isInitialized

