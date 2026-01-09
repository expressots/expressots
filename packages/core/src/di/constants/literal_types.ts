import { interfaces } from "../interfaces/interfaces";

const Scope: interfaces.Scope = {
  Request: "Request",
  Singleton: "Singleton",
  Transient: "Transient",
};

const BindingTypeEnum: interfaces.BindingTypeEnum = {
  ConstantValue: "ConstantValue",
  Constructor: "Constructor",
  DynamicValue: "DynamicValue",
  Factory: "Factory",
  Function: "Function",
  Instance: "Instance",
  Invalid: "Invalid",
  Provider: "Provider",
};

const TargetTypeEnum: interfaces.TargetTypeEnum = {
  ClassProperty: "ClassProperty",
  ConstructorArgument: "ConstructorArgument",
  Variable: "Variable",
};

export { Scope, BindingTypeEnum, TargetTypeEnum };
