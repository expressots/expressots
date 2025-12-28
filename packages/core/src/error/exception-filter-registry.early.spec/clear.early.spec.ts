// Unit tests for: ExceptionFilterRegistry.clear

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";
import { IExceptionFilter, ExceptionContext } from "../exception-filter.interface";

class TestError extends Error {}

class TestFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("ExceptionFilterRegistry.clear() clear method", () => {
  let container: Container;
  let logger: Logger;
  let registry: ExceptionFilterRegistry;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    container.bind(Logger).toConstantValue(logger);
    container.bind(Container).toConstantValue(container);
    registry = new ExceptionFilterRegistry(container, logger);
  });

  describe("Happy Path", () => {
    it("should clear all registered filters", () => {
      // Arrange
      const filter = new TestFilter();
      registry.registerFilter([TestError], filter);
      expect(registry.getFilters(new TestError()).length).toBe(1);

      // Act
      registry.clear();

      // Assert
      expect(registry.getFilters(new TestError()).length).toBe(0);
    });

    it("should reset initialized flag", () => {
      // Arrange
      registry.initialize();

      // Act
      registry.clear();

      // Assert
      // After clear, initialize should work again
      expect(() => registry.initialize()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle clear when no filters registered", () => {
      // Act & Assert
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getFilters(new TestError()).length).toBe(0);
    });
  });
});

// End of unit tests for: ExceptionFilterRegistry.clear

