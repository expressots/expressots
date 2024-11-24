import { Container, injectable } from "@expressots/core";
import { IOC } from "../application-express-micro-container";

let ioc: IOC;

describe("IOC.addTransient() method", () => {
  beforeEach(() => {
    ioc = new IOC();
  });

  it("should bind a class to the container in transient scope", () => {
    // Arrange
    @injectable()
    class TestClass {}
    const concrete = TestClass;

    // Act
    ioc.addTransient(concrete);

    // Assert
    const instance1 = ioc.get(concrete);
    const instance2 = ioc.get(concrete);
    expect(instance1).toBeInstanceOf(TestClass);
    expect(instance2).toBeInstanceOf(TestClass);
    expect(instance1).not.toBe(instance2); // Different instances for transient scope
  });

  it("should handle binding a class with no constructor parameters", () => {
    // Arrange
    @injectable()
    class NoParamClass {}
    const concrete = NoParamClass;

    // Act
    ioc.addTransient(concrete);

    // Assert
    const instance1 = ioc.get(concrete);
    const instance2 = ioc.get(concrete);
    expect(instance1).toBeInstanceOf(NoParamClass);
    expect(instance2).toBeInstanceOf(NoParamClass);
    expect(instance1).not.toBe(instance2); // Different instances for transient scope
  });
});
