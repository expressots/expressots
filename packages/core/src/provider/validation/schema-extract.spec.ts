/**
 * Tests for Zod schema extraction and the `schemaToJsonSchema` helper.
 *
 * Schemas are built with the Zod 4 API (`zod/v4`), which ships the native
 * `toJSONSchema` converter the adapter targets.
 */

import { ZodValidatorAdapter } from "./adapters/zod.adapter";
import { schemaToJsonSchema } from "./schema-extract";

// `zod` is an optional peer dependency; require it dynamically so a missing
// install just skips these assertions rather than failing the whole suite.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { z } = require("zod/v4");

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
