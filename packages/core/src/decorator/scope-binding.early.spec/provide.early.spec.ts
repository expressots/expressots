// Unit tests for: provide

import { fluentProvide } from "../../di/binding-decorator";
import { provide } from "../scope-binding";

jest.mock("../../di/binding-decorator", () => {
    const doneMock = jest.fn(() => "mockedDoneResult");
    const fluentProvideMock = jest.fn(() => ({
      done: doneMock,
    }));
    return {
      fluentProvide: fluentProvideMock,
      __doneMock: doneMock, // Expose doneMock for assertions
    };
});
  
beforeEach(() => {
    jest.clearAllMocks();
});

describe("provide() provide method", () => { 
  describe("Happy Path", () => {
    it("should return the result of fluentProvide.done() when called with a valid identifier", () => {
      // Arrange
      const identifier = "validIdentifier";

      // Act
      const result = provide(identifier);

      // Assert
      const { fluentProvide, __doneMock: doneMock } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(result).toBe("mockedDoneResult");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null identifier gracefully", () => {
      // Arrange
      const identifier = null;

      // Act
      const result = provide(identifier);

      // Assert
      const { fluentProvide, __doneMock: doneMock } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(result).toBe("mockedDoneResult");
    });

    it("should handle undefined identifier gracefully", () => {
      // Arrange
      const identifier = undefined;

      // Act
      const result = provide(identifier);

      // Assert
      const { fluentProvide, __doneMock: doneMock } = require("../../di/binding-decorator");

      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      expect(doneMock).toHaveBeenCalled();
      expect(result).toBe("mockedDoneResult");
    });

    it("should handle numeric identifier gracefully", () => {
      // Arrange
      const identifier = 123;

      // Act
      const result = provide(identifier);

      // Assert
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      //      expect(fluentProvide(identifier).done).toHaveBeenCalled();
      expect(result).toBe("mockedDoneResult");
    });

    it("should handle object identifier gracefully", () => {
      // Arrange
      const identifier = { key: "value" };

      // Act
      const result = provide(identifier);

      // Assert
      expect(fluentProvide).toHaveBeenCalledWith(identifier);
      //      expect(fluentProvide(identifier).done).toHaveBeenCalled();
      expect(result).toBe("mockedDoneResult");
    });
  });
});

// End of unit tests for: provide
