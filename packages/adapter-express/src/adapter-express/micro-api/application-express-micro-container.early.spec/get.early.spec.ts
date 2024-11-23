import { Container, injectable } from "@expressots/core";
import { IOC } from "../application-express-micro-container";

let ioc: IOC;

describe("IOC.get() get method", () => {
  let mockContainer: Container;
  let ioc: IOC;

  beforeEach(() => {
    ioc = new IOC();
    mockContainer = new Container();
  });

  describe("Happy paths", () => {
    it("should return an instance when a valid identifier is provided", () => {
      // Arrange
      @injectable()
      class MockService {}
      mockContainer.bind(MockService).toSelf().inRequestScope();

      // Act
      const mock = mockContainer.get(MockService);

      // Assert
      expect(mock).toBeInstanceOf(MockService);
    });
  });
});

// End of unit tests for: get
