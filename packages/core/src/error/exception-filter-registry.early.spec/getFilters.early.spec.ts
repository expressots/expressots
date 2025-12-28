// Unit tests for: ExceptionFilterRegistry.getFilters

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";
import {
  IExceptionFilter,
  ExceptionContext,
} from "../exception-filter.interface";

class TestError extends Error {}
class ChildError extends TestError {}
class UnrelatedError extends Error {}

class TestFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

class GlobalFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("ExceptionFilterRegistry.getFilters() getFilters method", () => {
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
    it("should return filters for exact exception type", () => {
      // Arrange
      const filter = new TestFilter();
      registry.registerFilter([TestError], filter);

      // Act
      const filters = registry.getFilters(new TestError());

      // Assert
      expect(filters).toContain(filter);
    });

    it("should return filters for parent exception type (inheritance)", () => {
      // Arrange
      const filter = new TestFilter();
      registry.registerFilter([TestError], filter);

      // Act
      const filters = registry.getFilters(new ChildError());

      // Assert
      expect(filters).toContain(filter);
    });

    it("should return multiple filters for same exception type", () => {
      // Arrange
      const filter1 = new TestFilter();
      const filter2 = new TestFilter();
      registry.registerFilter([TestError], filter1);
      registry.registerFilter([TestError], filter2);

      // Act
      const filters = registry.getFilters(new TestError());

      // Assert
      expect(filters.length).toBe(2);
      expect(filters).toContain(filter1);
      expect(filters).toContain(filter2);
    });

    it("should return global Error filters for any exception", () => {
      // Arrange
      const globalFilter = new GlobalFilter();
      registry.registerFilter([Error], globalFilter);

      // Act
      const filters = registry.getFilters(new UnrelatedError());

      // Assert
      expect(filters).toContain(globalFilter);
    });

    it("should not return filters for unrelated exception types", () => {
      // Arrange
      const filter = new TestFilter();
      registry.registerFilter([TestError], filter);

      // Act
      const filters = registry.getFilters(new UnrelatedError());

      // Assert
      expect(filters).not.toContain(filter);
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array when no filters registered", () => {
      // Act
      const filters = registry.getFilters(new TestError());

      // Assert
      expect(filters).toEqual([]);
    });

    it("should handle Error base class correctly", () => {
      // Arrange
      const filter = new GlobalFilter();
      registry.registerFilter([Error], filter);

      // Act
      const filters = registry.getFilters(new Error("Test"));

      // Assert
      expect(filters).toContain(filter);
    });
  });
});

// End of unit tests for: ExceptionFilterRegistry.getFilters
