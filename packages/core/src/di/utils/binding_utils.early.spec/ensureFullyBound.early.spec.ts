// Unit tests for: ensureFullyBound

import { ensureFullyBound } from "../binding_utils";
import { interfaces } from "../../interfaces/interfaces";
import { BindingTypeEnum } from "../../constants/literal_types";
import * as ERROR_MSGS from "../../constants/error_msgs";

describe("ensureFullyBound() ensureFullyBound function", () => {
  describe("Happy Path", () => {
    it("should not throw for ConstantValue binding with cache", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.ConstantValue,
        cache: "value",
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for Function binding with cache", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Function,
        cache: () => {},
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for Constructor binding with implementationType", () => {
      // Arrange
      class TestClass {}
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Constructor,
        implementationType: TestClass,
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for Instance binding with implementationType", () => {
      // Arrange
      const instance = {};
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Instance,
        implementationType: instance,
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for DynamicValue binding with dynamicValue", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.DynamicValue,
        dynamicValue: () => "value",
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for Provider binding with provider", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Provider,
        provider: () => ({ get: () => "value" }),
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });

    it("should not throw for Factory binding with factory", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Factory,
        factory: () => "value",
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should throw error for incomplete binding", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Constructor,
        implementationType: null,
        serviceIdentifier: "TestService",
      } as any;

      // Act & Assert
      expect(() => ensureFullyBound(binding)).toThrow();
    });
  });
});

// End of unit tests for: ensureFullyBound

