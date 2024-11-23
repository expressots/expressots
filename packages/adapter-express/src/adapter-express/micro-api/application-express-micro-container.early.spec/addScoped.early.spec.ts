// Unit tests for: addScoped

import { IOC } from "../application-express-micro-container";

// Mock definitions
type MockNewable<T> = { new (...args: any[]): T };

class MockContainer {
  bind = jest.fn().mockReturnThis();
  toSelf = jest.fn().mockReturnThis();
  inRequestScope = jest.fn().mockReturnThis();
}

interface MockContainerOptions {}

describe("IOC.addScoped() addScoped method", () => {
  let mockContainer: MockContainer;
  let ioc: IOC;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    ioc = new IOC({} as MockContainerOptions) as any;
    (ioc as any).container = mockContainer;
  });

  describe("Happy Paths", () => {
    it("should bind a class to the container in request scope", () => {
      // Arrange
      class TestClass {}
      const mockNewable: MockNewable<TestClass> = TestClass as any;

      // Act
      ioc.addScoped(mockNewable);

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(mockNewable);
      expect(mockContainer.toSelf).toHaveBeenCalled();
      expect(mockContainer.inRequestScope).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle binding a class with no constructor parameters", () => {
      // Arrange
      class NoParamClass {}
      const mockNewable: MockNewable<NoParamClass> = NoParamClass as any;

      // Act
      ioc.addScoped(mockNewable);

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(mockNewable);
      expect(mockContainer.toSelf).toHaveBeenCalled();
      expect(mockContainer.inRequestScope).toHaveBeenCalled();
    });

    it("should handle binding a class with multiple constructor parameters", () => {
      // Arrange
      class MultiParamClass {
        constructor(
          public param1: string,
          public param2: number,
        ) {}
      }
      const mockNewable: MockNewable<MultiParamClass> = MultiParamClass as any;

      // Act
      ioc.addScoped(mockNewable);

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(mockNewable);
      expect(mockContainer.toSelf).toHaveBeenCalled();
      expect(mockContainer.inRequestScope).toHaveBeenCalled();
    });

    it("should handle binding a class with complex constructor parameters", () => {
      // Arrange
      class ComplexParamClass {
        constructor(
          public param1: { key: string },
          public param2: () => void,
        ) {}
      }
      const mockNewable: MockNewable<ComplexParamClass> = ComplexParamClass as any;

      // Act
      ioc.addScoped(mockNewable);

      // Assert
      expect(mockContainer.bind).toHaveBeenCalledWith(mockNewable);
      expect(mockContainer.toSelf).toHaveBeenCalled();
      expect(mockContainer.inRequestScope).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: addScoped
