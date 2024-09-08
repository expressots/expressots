import { describe, expect, it } from "vitest";

import { ExpressoConfig, Pattern } from "../project-config";

const mockExpressoConfig: ExpressoConfig = {
  scaffoldPattern: Pattern.KEBAB_CASE,
  sourceRoot: "src",
  opinionated: true,
  scaffoldSchematics: {
    entity: "entity",
    controller: "controller",
    usecase: "usecase",
    dto: "dto",
    module: "module",
    provider: "provider",
    middleware: "middleware",
  },
};

describe("Pattern enum", () => {
  it("should have the correct values", () => {
    expect(Pattern.LOWER_CASE).toBe("lowercase");
    expect(Pattern.KEBAB_CASE).toBe("kebab-case");
    expect(Pattern.PASCAL_CASE).toBe("PascalCase");
    expect(Pattern.CAMEL_CASE).toBe("camelCase");
  });
});

describe("Expresso Config", () => {
  it("verify if type is correct", () => {
    expect(mockExpressoConfig.scaffoldPattern).toBeTypeOf("string");
    expect(mockExpressoConfig.sourceRoot).toBeTypeOf("string");
    expect(mockExpressoConfig.opinionated).toBeTypeOf("boolean");
    expect(mockExpressoConfig.scaffoldSchematics).toBeTypeOf("object");
  });
});
