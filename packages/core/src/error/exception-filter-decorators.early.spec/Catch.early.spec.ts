// Unit tests for: Catch decorator

import "reflect-metadata";
import { Catch } from "../exception-filter-decorators";
import { EXCEPTION_FILTER_METADATA_KEY } from "../exception-filter-constants";
import { IExceptionFilter, ExceptionContext } from "../exception-filter.interface";

class TestError extends Error {}
class AnotherError extends Error {}

class TestFilter implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("Catch() Catch decorator", () => {
  beforeEach(() => {
    // Clear metadata before each test
    Reflect.deleteMetadata(
      EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
      Reflect,
    );
  });

  describe("Happy Path", () => {
    it("should register filter for specific exception type", () => {
      // Arrange
      @Catch(TestError)
      class TestExceptionFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      const metadata = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        TestExceptionFilter,
      );

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.exceptionTypes).toEqual([TestError]);
      expect(metadata.filter).toBe(TestExceptionFilter);
    });

    it("should register filter for multiple exception types", () => {
      // Arrange
      @Catch(TestError, AnotherError)
      class MultiExceptionFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      const metadata = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        MultiExceptionFilter,
      );

      // Assert
      expect(metadata.exceptionTypes).toEqual([TestError, AnotherError]);
      expect(metadata.filter).toBe(MultiExceptionFilter);
    });

    it("should register filter in global registry", () => {
      // Arrange
      @Catch(TestError)
      class GlobalFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      const globalFilters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        Reflect,
      ) as Array<{ exceptionTypes: Array<Function>; filter: Function }>;

      // Assert
      expect(globalFilters).toBeDefined();
      expect(Array.isArray(globalFilters)).toBe(true);
      expect(globalFilters.length).toBeGreaterThan(0);
      expect(globalFilters.some((f) => f.filter === GlobalFilter)).toBe(true);
    });

    it("should use Error as default when no exception types provided", () => {
      // Arrange
      @Catch()
      class CatchAllFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      const metadata = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        CatchAllFilter,
      );

      // Assert
      expect(metadata.exceptionTypes).toEqual([Error]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty exception types array", () => {
      // Arrange
      @Catch()
      class EmptyFilter implements IExceptionFilter {
        catch(exception: Error, context: ExceptionContext): void {
          // Test implementation
        }
      }

      // Act
      const metadata = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        EmptyFilter,
      );

      // Assert
      expect(metadata.exceptionTypes).toEqual([Error]);
    });
  });
});

// End of unit tests for: Catch decorator

