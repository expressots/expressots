/**
 * Tests for Zod schema extraction and the `schemaToJsonSchema` helper.
 *
 * Schemas are built with the Zod 4 API (`zod/v4`), which ships the native
 * `toJSONSchema` converter the adapter targets.
 */

import {
  ZodValidatorAdapter,
  createZodValidator,
} from "./adapters/zod.adapter";
import { schemaToJsonSchema } from "./schema-extract";

// `zod` is an optional peer at runtime (Studio and user apps install it).
// Listed in devDependencies so CI exercises the adapter without bundling zod.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { z } = require("zod/v4");

describe("ZodValidatorAdapter", () => {
  const adapter = createZodValidator();
  const schema = z.object({
    name: z.string(),
    age: z.number().int().optional(),
  });

  it("exposes the zod adapter name and priority", () => {
    expect(adapter.name).toBe("zod");
    expect(adapter.priority).toBe(90);
  });

  it("detects zod schemas and rejects non-schemas", () => {
    expect(adapter.canHandle(schema)).toBe(true);
    expect(adapter.canHandle(null)).toBe(false);
    expect(adapter.canHandle({})).toBe(false);
  });

  it("validates successful input via safeParse", async () => {
    const result = await adapter.validate({ name: "Ada" }, schema);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Ada" });
  });

  it("maps validation failures to field errors", async () => {
    const result = await adapter.validate({ name: 42 }, schema);

    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.path).toBe("name");
    expect(result.errors?.[0]?.message).toBeDefined();
  });

  it("returns parsed data from transform on success", async () => {
    const transformed = await adapter.transform(
      { name: "Ada", age: 30 },
      schema,
    );

    expect(transformed).toEqual({ name: "Ada", age: 30 });
  });

  it("returns the original value from transform on failure", async () => {
    const invalid = { name: 42 };
    const transformed = await adapter.transform(invalid, schema);

    expect(transformed).toBe(invalid);
  });
});

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
