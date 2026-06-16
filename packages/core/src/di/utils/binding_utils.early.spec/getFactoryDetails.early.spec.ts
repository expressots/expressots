// Unit tests for: getFactoryDetails

import { getFactoryDetails } from "../binding_utils";
import { interfaces } from "../../interfaces/interfaces";
import { BindingTypeEnum } from "../../constants/literal_types";
import { FactoryType } from "../factory_type";

describe("getFactoryDetails() getFactoryDetails function", () => {
  describe("Happy Path", () => {
    it("should return factory details for Factory binding", () => {
      // Arrange
      const factory = () => "value";
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Factory,
        factory,
      } as any;

      // Act
      const result = getFactoryDetails(binding);

      // Assert
      expect(result.factory).toBe(factory);
      expect(result.factoryType).toBe(FactoryType.Factory);
    });

    it("should return factory details for Provider binding", () => {
      // Arrange
      const provider = () => ({ get: () => "value" });
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Provider,
        provider,
      } as any;

      // Act
      const result = getFactoryDetails(binding);

      // Assert
      expect(result.factory).toBe(provider);
      expect(result.factoryType).toBe(FactoryType.Provider);
    });

    it("should return factory details for DynamicValue binding", () => {
      // Arrange
      const dynamicValue = () => "value";
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.DynamicValue,
        dynamicValue,
      } as any;

      // Act
      const result = getFactoryDetails(binding);

      // Assert
      expect(result.factory).toBe(dynamicValue);
      expect(result.factoryType).toBe(FactoryType.DynamicValue);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error for unexpected binding type", () => {
      // Arrange
      const binding: interfaces.Binding<unknown> = {
        type: BindingTypeEnum.Constructor,
      } as any;

      // Act & Assert
      expect(() => getFactoryDetails(binding)).toThrow();
    });
  });
});

// End of unit tests for: getFactoryDetails
