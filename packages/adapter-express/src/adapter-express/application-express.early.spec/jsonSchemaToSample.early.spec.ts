import express from "express";
import { AppExpress } from "../application-express";

describe("AppExpress.jsonSchemaToSample() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
  });

  const sample = (schema: Record<string, unknown>, depth?: number): unknown =>
    (
      appExpress as unknown as {
        jsonSchemaToSample: (s: Record<string, unknown>, d?: number) => unknown;
      }
    ).jsonSchemaToSample(schema, depth);

  it("returns null for non-object schemas", () => {
    expect(sample(null as unknown as Record<string, unknown>)).toBeNull();
    expect(sample("nope" as unknown as Record<string, unknown>)).toBeNull();
  });

  it("prefers enum, const, and default values", () => {
    expect(sample({ enum: ["a", "b"] })).toBe("a");
    expect(sample({ const: 42 })).toBe(42);
    expect(sample({ default: { ok: true } })).toEqual({ ok: true });
  });

  it("builds object and array samples", () => {
    expect(
      sample({
        type: "object",
        properties: {
          name: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      }),
    ).toEqual({ name: "", tags: [""] });
  });

  it("maps common string formats", () => {
    expect(sample({ type: "string", format: "email" })).toBe("user@example.com");
    expect(sample({ type: "string", format: "uuid" })).toBe("00000000-0000-0000-0000-000000000000");
    expect(sample({ type: "string", format: "date-time" })).toBe(new Date(0).toISOString());
  });

  it("handles numeric and boolean types", () => {
    expect(sample({ type: "integer" })).toBe(0);
    expect(sample({ type: "number" })).toBe(0);
    expect(sample({ type: "boolean" })).toBe(false);
    expect(sample({ type: "null" })).toBeNull();
  });

  it("samples the first composed schema variant", () => {
    expect(
      sample({
        allOf: [{ type: "object", properties: { id: { type: "integer" } } }],
      }),
    ).toEqual({ id: 0 });
  });

  it("stops recursing beyond the depth limit", () => {
    const deep = { type: "object", properties: { name: { type: "string" } } };
    expect(sample(deep, 5)).toBeNull();
  });
});
