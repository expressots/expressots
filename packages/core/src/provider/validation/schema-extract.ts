/**
 * Schema → JSON Schema extraction helper.
 *
 * Bridges the validation layer to OpenAPI generation: given any schema an
 * adapter understands (Zod today; class-validator / Yup once they
 * implement `extractSchema`), return a JSON Schema representation.
 *
 * Used by tooling (e.g. the CLI's `openapi emit`) to produce precise
 * request/response schemas rather than shapes inferred from samples.
 */

import { IValidationAdapter } from "./validation.interface.js";
import { ZodValidatorAdapter } from "./adapters/zod.adapter.js";
import { ClassValidatorAdapter } from "./adapters/class-validator.adapter.js";
import { YupValidatorAdapter } from "./adapters/yup.adapter.js";

/**
 * Default adapter pool, ordered by priority (descending). Adapters that
 * don't implement `extractSchema` are simply skipped.
 */
function defaultAdapters(): Array<IValidationAdapter> {
  return [
    new ClassValidatorAdapter(),
    new ZodValidatorAdapter(),
    new YupValidatorAdapter(),
  ].sort((a, b) => b.priority - a.priority);
}

/**
 * Convert a validation schema to JSON Schema using the first adapter that
 * both recognizes the schema and supports extraction.
 *
 * @param schema - A Zod schema, class-validator DTO class, Yup schema, etc.
 * @param adapters - Optional custom adapter pool (defaults to the built-ins).
 * @returns The JSON Schema, or `null` when no adapter can extract one.
 */
export function schemaToJsonSchema(
  schema: unknown,
  adapters?: Array<IValidationAdapter>,
): Record<string, unknown> | null {
  const pool = adapters
    ? [...adapters].sort((a, b) => b.priority - a.priority)
    : defaultAdapters();

  for (const adapter of pool) {
    if (typeof adapter.extractSchema !== "function") continue;
    let handles = false;
    try {
      handles = adapter.canHandle(schema);
    } catch {
      handles = false;
    }
    if (!handles) continue;
    try {
      return adapter.extractSchema(schema as never);
    } catch {
      // Adapter recognized the schema but failed to extract — try the next.
    }
  }

  return null;
}
