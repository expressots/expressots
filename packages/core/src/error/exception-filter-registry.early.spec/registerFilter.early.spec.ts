// Unit tests for: ExceptionFilterRegistry.registerFilter

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";
import {
  IExceptionFilter,
  ExceptionContext,
  ErrorConstructor,
} from "../exception-filter.interface";

class TestError extends Error {}
class AnotherError extends Error {}

class TestFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("ExceptionFilterRegistry.registerFilter() registerFilter method", () => {
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
    it("should register filter for single exception type", () => {
      // Arrange
      const filter = new TestFilter();

      // Act
      registry.registerFilter([TestError], filter);

      // Assert
      const filters = registry.getFilters(new TestError());
      expect(filters).toContain(filter);
    });

    it("should register filter for multiple exception types", () => {
      // Arrange
      const filter = new TestFilter();

      // Act
      registry.registerFilter([TestError, AnotherError], filter);

      // Assert
      expect(registry.getFilters(new TestError())).toContain(filter);
      expect(registry.getFilters(new AnotherError())).toContain(filter);
    });

    it("should append filters for same exception type", () => {
      // Arrange
      const filter1 = new TestFilter();
      const filter2 = new TestFilter();

      // Act
      registry.registerFilter([TestError], filter1);
      registry.registerFilter([TestError], filter2);

      // Assert
      const filters = registry.getFilters(new TestError());
      expect(filters.length).toBe(2);
      expect(filters).toContain(filter1);
      expect(filters).toContain(filter2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty exception types array", () => {
      // Arrange
      const filter = new TestFilter();

      // Act & Assert
      expect(() => registry.registerFilter([], filter)).not.toThrow();
    });
  });
});

// End of unit tests for: ExceptionFilterRegistry.registerFilter
