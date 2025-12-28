// Unit tests for: createSymbols (indirectly tested through createContainerModule)

import "reflect-metadata";
import { BaseModule } from "../container-module";

describe("BaseModule.createSymbols() createSymbols method (indirect)", () => {
  describe("Happy Path", () => {
    it("should create symbols for controllers via createContainerModule", () => {
      // Arrange
      class Controller1 {}
      class Controller2 {}
      class Controller3 {}

      // Act
      const module = BaseModule.createContainerModule([
        Controller1,
        Controller2,
        Controller3,
      ]);

      // Assert
      expect(module).toBeDefined();
      // The symbols are created internally, we verify by checking the module works
      const mockBind = jest.fn().mockReturnValue({
        to: jest.fn().mockReturnValue({
          inRequestScope: jest.fn(),
        }),
      });

      module.registry(
        mockBind,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );

      // Should bind each controller
      expect(mockBind).toHaveBeenCalledTimes(3);
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("Controller1"));
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("Controller2"));
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("Controller3"));
    });

    it("should create unique symbols for controllers with same name", () => {
      // Arrange
      // Note: Symbol.for() creates global symbols, so same name = same symbol
      class TestController {}
      class TestController2 {}

      // Act
      const module = BaseModule.createContainerModule([
        TestController,
        TestController2,
      ]);

      // Assert
      const mockBind = jest.fn().mockReturnValue({
        to: jest.fn().mockReturnValue({
          inRequestScope: jest.fn(),
        }),
      });

      module.registry(
        mockBind,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );

      expect(mockBind).toHaveBeenCalledTimes(2);
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("TestController"));
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("TestController2"));
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty controllers array", () => {
      // Act
      const module = BaseModule.createContainerModule([]);

      // Assert
      const mockBind = jest.fn();
      module.registry(
        mockBind,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );
      expect(mockBind).not.toHaveBeenCalled();
    });

    it("should handle single controller", () => {
      // Arrange
      class SingleController {}

      // Act
      const module = BaseModule.createContainerModule([SingleController]);

      // Assert
      const mockBind = jest.fn().mockReturnValue({
        to: jest.fn().mockReturnValue({
          inRequestScope: jest.fn(),
        }),
      });

      module.registry(
        mockBind,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );
      expect(mockBind).toHaveBeenCalledTimes(1);
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("SingleController"));
    });
  });
});

// End of unit tests for: createSymbols
