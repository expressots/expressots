/**
 * Tests for Zod schema extraction and the `schemaToJsonSchema` helper.
 *
 * Schemas are built with the Zod 4 API (`zod/v4`), which ships the native
 * `toJSONSchema` converter the adapter targets.
 */

import { ZodValidatorAdapter } from "./adapters/zod.adapter";
import { schemaToJsonSchema } from "./schema-extract";

// `zod` is an optional peer dependency at runtime (user apps and Studio
// install it in their own project). Core does not bundle it. When zod is
// not resolvable in this test environment, skip rather than fail.
function loadZodV4(): { z: any } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("zod/v4");
  } catch {
    return null;
  }
}

const zod = loadZodV4();

if (zod) {
  const { z } = zod;

  describe("ZodValidatorAdapter.extractSchema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().int().optional(),
    });

    it("extracts a JSON Schema object with properties", () => {
      const adapter = new ZodValidatorAdapter();
      const json = adapter.extractSchema(schema);
      expect(json.type).toBe("object");
      expect(json.properties).toBeDefined();
      const props = json.properties as Record<string, unknown>;
      expect(props.name).toBeDefined();
      expect(props.age).toBeDefined();
    });

    it("marks non-optional fields as required", () => {
      const adapter = new ZodValidatorAdapter();
      const json = adapter.extractSchema(schema);
      expect(json.required).toEqual(["name"]);
    });
  });

  describe("schemaToJsonSchema", () => {
    it("routes a Zod schema to the Zod adapter and returns JSON Schema", () => {
      const schema = z.object({ id: z.string() });
      const json = schemaToJsonSchema(schema);
      expect(json).not.toBeNull();
      expect(json?.type).toBe("object");
      expect((json?.properties as Record<string, unknown>).id).toBeDefined();
    });

    it("returns null for a value no adapter can handle", () => {
      expect(schemaToJsonSchema(12345)).toBeNull();
      expect(schemaToJsonSchema("not a schema")).toBeNull();
    });
  });
} else {
  describe.skip("ZodValidatorAdapter.extractSchema", () => {
    it("requires zod to be installed in the test environment", () => {});
  });

  describe.skip("schemaToJsonSchema", () => {
    it("requires zod to be installed in the test environment", () => {});
  });
}
