// Unit tests for: UseFilters decorator

import "reflect-metadata";
import { UseFilters } from "../exception-filter-decorators";
import { EXCEPTION_FILTER_METADATA_KEY } from "../exception-filter-constants";
import { IExceptionFilter, ExceptionContext } from "../exception-filter.interface";

class Filter1 implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

class Filter2 implements IExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("UseFilters() UseFilters decorator", () => {
  beforeEach(() => {
    // Clear metadata before each test
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should register filters at controller level", () => {
      // Arrange
      @UseFilters(Filter1, Filter2)
      class TestController {}

      // Act
      const filters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
        TestController,
      ) as Array<new (...args: Array<unknown>) => IExceptionFilter>;

      // Assert
      expect(filters).toBeDefined();
      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBe(2);
      expect(filters).toContain(Filter1);
      expect(filters).toContain(Filter2);
    });

    it("should register filters at method level", () => {
      // Arrange
      class TestController {
        @UseFilters(Filter1)
        testMethod() {
          // Test implementation
        }
      }

      // Act
      const filters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        TestController,
        "testMethod",
      ) as Array<new (...args: Array<unknown>) => IExceptionFilter>;

      // Assert
      expect(filters).toBeDefined();
      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBe(1);
      expect(filters).toContain(Filter1);
    });

    it("should append filters when multiple decorators applied", () => {
      // Arrange
      class TestController {
        @UseFilters(Filter1)
        @UseFilters(Filter2)
        testMethod() {
          // Test implementation
        }
      }

      // Act
      const filters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        TestController,
        "testMethod",
      ) as Array<new (...args: Array<unknown>) => IExceptionFilter>;

      // Assert
      expect(filters).toBeDefined();
      expect(filters.length).toBe(2);
      expect(filters).toContain(Filter1);
      expect(filters).toContain(Filter2);
    });

    it("should handle single filter", () => {
      // Arrange
      @UseFilters(Filter1)
      class TestController {}

      // Act
      const filters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
        TestController,
      ) as Array<new (...args: Array<unknown>) => IExceptionFilter>;

      // Assert
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe(Filter1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty filters array", () => {
      // Arrange
      @UseFilters()
      class TestController {}

      // Act
      const filters = Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
        TestController,
      ) as Array<new (...args: Array<unknown>) => IExceptionFilter>;

      // Assert
      expect(filters).toBeDefined();
      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBe(0);
    });
  });
});

// End of unit tests for: UseFilters decorator

