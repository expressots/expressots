// Unit tests for: ExceptionFilterRegistry.initialize

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";
import { EXCEPTION_FILTER_METADATA_KEY } from "../exception-filter-constants";
import { IExceptionFilter, ExceptionContext, ErrorConstructor } from "../exception-filter.interface";
import { Catch } from "../exception-filter-decorators";

class TestError extends Error {}
class AnotherError extends Error {}

class TestFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

@Catch(TestError)
class DecoratedFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("ExceptionFilterRegistry.initialize() initialize method", () => {
  let container: Container;
  let logger: Logger;
  let registry: ExceptionFilterRegistry;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    container.bind(Logger).toConstantValue(logger);
    container.bind(Container).toConstantValue(container);
    registry = new ExceptionFilterRegistry(container, logger);

    // Clear metadata before each test
    Reflect.deleteMetadata(
      EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
      Reflect,
    );
  });

  describe("Happy Path", () => {
    it("should initialize registry with filters from metadata", () => {
      // Arrange
      @Catch(TestError)
      class TestExceptionFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      registry.initialize();

      // Assert
      const testError = new TestError();
      const filters = registry.getFilters(testError);
      expect(filters.length).toBeGreaterThan(0);
    });

    it("should not initialize twice", () => {
      // Arrange
      @Catch(TestError)
      class TestExceptionFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      registry.initialize();
      const firstCallFilters = registry.getFilters(new TestError());
      registry.initialize();
      const secondCallFilters = registry.getFilters(new TestError());

      // Assert
      expect(firstCallFilters.length).toBe(secondCallFilters.length);
    });

    it("should register filter from container if bound", () => {
      // Arrange
      const filterInstance = new TestFilter();
      container.bind(TestFilter).toConstantValue(filterInstance);

      @Catch(TestError)
      class TestExceptionFilter extends TestFilter {}

      container.bind(TestExceptionFilter).toConstantValue(filterInstance);

      // Act
      registry.initialize();

      // Assert
      const filters = registry.getFilters(new TestError());
      expect(filters.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metadata gracefully", () => {
      // Act & Assert
      expect(() => registry.initialize()).not.toThrow();
    });

    it("should handle filter instantiation failure gracefully", () => {
      // Arrange
      // Create a filter that will fail to instantiate
      const metadata = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        Reflect,
      ) || [];
      
      // Add invalid filter metadata
      metadata.push({
        exceptionTypes: [TestError],
        filter: class InvalidFilter {
          constructor() {
            throw new Error("Cannot instantiate");
          }
        },
      });

      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        metadata,
        Reflect,
      );

      // Act & Assert
      expect(() => registry.initialize()).not.toThrow();
    });
  });
});

// End of unit tests for: ExceptionFilterRegistry.initialize

