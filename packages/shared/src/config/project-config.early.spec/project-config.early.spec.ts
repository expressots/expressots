import { Pattern } from "../project-config";

describe("Pattern", () => {
  it("should expose runtime enum values for scaffold patterns", () => {
    expect(Pattern.LOWER_CASE).toBe("lowercase");
    expect(Pattern.KEBAB_CASE).toBe("kebab-case");
    expect(Pattern.PASCAL_CASE).toBe("PascalCase");
    expect(Pattern.CAMEL_CASE).toBe("camelCase");
  });
});
