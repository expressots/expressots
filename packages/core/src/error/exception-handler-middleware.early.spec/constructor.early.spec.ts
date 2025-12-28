// Unit tests for: ExceptionHandlerMiddleware constructor

import { ExceptionHandlerMiddleware } from "../exception-handler-middleware";
import { Container } from "../../di/inversify";
import { ExceptionFilterRegistry } from "../exception-filter-registry";
import { Logger } from "../../provider/logger/logger.provider";

describe("ExceptionHandlerMiddleware() ExceptionHandlerMiddleware constructor", () => {
  describe("Happy Path", () => {
    it("should create instance without container", () => {
      // Act
      const middleware = new ExceptionHandlerMiddleware();

      // Assert
      expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
    });

    it("should create instance with container", () => {
      // Arrange
      const container = new Container();
      container.bind(Logger).toConstantValue({} as Logger);

      // Act
      const middleware = new ExceptionHandlerMiddleware(container);

      // Assert
      expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
    });

    it("should create instance with container and registry", () => {
      // Arrange
      const container = new Container();
      container.bind(Logger).toConstantValue({} as Logger);
      const registry = new ExceptionFilterRegistry(container, {} as Logger);

      // Act
      const middleware = new ExceptionHandlerMiddleware(container, registry);

      // Assert
      expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
    });

    it("should create instance with showStackTrace enabled", () => {
      // Arrange
      const container = new Container();
      container.bind(Logger).toConstantValue({} as Logger);

      // Act
      const middleware = new ExceptionHandlerMiddleware(container, undefined, true);

      // Assert
      expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
    });

    it("should create registry from container if not provided", () => {
      // Arrange
      const container = new Container();
      container.bind(Logger).toConstantValue({} as Logger);
      container.bind(ExceptionFilterRegistry).toSelf();

      // Act
      const middleware = new ExceptionHandlerMiddleware(container);

      // Assert
      expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
    });
  });

  describe("Edge Cases", () => {
    it("should handle container without Logger gracefully", () => {
      // Arrange
      const container = new Container();

      // Act & Assert
      expect(() => {
        const middleware = new ExceptionHandlerMiddleware(container);
        expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
      }).not.toThrow();
    });

    it("should handle container errors gracefully", () => {
      // Arrange
      const container = new Container();
      // Mock container.get to throw error for Logger
      const originalGet = container.get.bind(container);
      jest.spyOn(container, "get").mockImplementation((serviceIdentifier) => {
        if (serviceIdentifier === Logger) {
          throw new Error("Container error");
        }
        return originalGet(serviceIdentifier);
      });

      // Act & Assert
      expect(() => {
        const middleware = new ExceptionHandlerMiddleware(container);
        expect(middleware).toBeInstanceOf(ExceptionHandlerMiddleware);
      }).not.toThrow();
    });
  });
});

// End of unit tests for: ExceptionHandlerMiddleware constructor

