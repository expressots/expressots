// Unit tests for: interopRequireDefault

import { Compiler } from "../compiler";

describe("Compiler.interopRequireDefault() interopRequireDefault method", () => {
  // Test to ensure that an ES module is returned as is
  it("should return the module as is if it is an ES module", () => {
    const esModule = { __esModule: true, default: "defaultExport" };
    jest.mock("esModule", () => esModule, { virtual: true });

    const result = Compiler.interopRequireDefault("esModule");
    expect(result).toBe(esModule);
  });

  // Test to ensure that a non-ES module is wrapped in a default property
  it("should wrap a non-ES module in a default property", () => {
    const nonEsModule = { someExport: "value" };
    jest.mock("nonEsModule", () => nonEsModule, { virtual: true });

    const result = Compiler.interopRequireDefault("nonEsModule");
    expect(result).toEqual({ default: nonEsModule });
  });

  // Test to ensure that a primitive value is wrapped in a default property
  it("should wrap a primitive value in a default property", () => {
    const primitiveValue = "primitive";
    jest.mock("primitiveModule", () => primitiveValue, { virtual: true });

    const result = Compiler.interopRequireDefault("primitiveModule");
    expect(result).toEqual({ default: primitiveValue });
  });

  // Test to ensure that an empty object is wrapped in a default property
  it("should wrap an empty object in a default property", () => {
    const emptyObject = {};
    jest.mock("emptyObjectModule", () => emptyObject, { virtual: true });

    const result = Compiler.interopRequireDefault("emptyObjectModule");
    expect(result).toEqual({ default: emptyObject });
  });

  // Test to ensure that a null value is wrapped in a default property
  it("should wrap a null value in a default property", () => {
    const nullValue = null;
    jest.mock("nullModule", () => nullValue, { virtual: true });

    const result = Compiler.interopRequireDefault("nullModule");
    expect(result).toEqual({ default: nullValue });
  });

  // Test to ensure that an undefined value is wrapped in a default property
  it("should wrap an undefined value in a default property", () => {
    const undefinedValue = undefined;
    jest.mock("undefinedModule", () => undefinedValue, { virtual: true });

    const result = Compiler.interopRequireDefault("undefinedModule");
    expect(result).toEqual({ default: undefinedValue });
  });
});

// End of unit tests for: interopRequireDefault
