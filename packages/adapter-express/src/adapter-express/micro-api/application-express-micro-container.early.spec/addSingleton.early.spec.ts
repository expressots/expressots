import { Container, injectable } from "@expressots/core";
import { IOC } from "../application-express-micro-container";

let ioc: IOC;

describe("IOC.addSingleton() method", () => {
  beforeEach(() => {
    ioc = new IOC();
  });

  it("should bind a class as a singleton", () => {
    // Arrange
    @injectable()
    class TestClass {}
    const concrete = TestClass;

    // Act
    ioc.addSingleton(concrete);

    // Assert
    expect(ioc.get(concrete)).toBeInstanceOf(TestClass);
  });

  it("should handle binding a class with no constructor parameters", () => {
    // Arrange
    @injectable()
    class NoParamClass {}
    const concrete = NoParamClass;

    // Act
    ioc.addSingleton(concrete);

    // Assert
    expect(ioc.get(concrete)).toBeInstanceOf(NoParamClass);
  });

  it("should not throw an error when binding a class that is already a singleton", () => {
    // Arrange
    @injectable()
    class ExistingSingletonClass {}
    const concrete = ExistingSingletonClass;

    // Act & Assert
    expect(() => ioc.addSingleton(concrete)).not.toThrow();

    // Assert
    const instance = ioc.get(concrete);
    expect(instance).toBeInstanceOf(ExistingSingletonClass);
  });
});
