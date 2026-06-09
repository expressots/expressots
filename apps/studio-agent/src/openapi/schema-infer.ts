/**
 * Schema inference helpers shared by the single-exchange exporter (Studio
 * UI) and the full-app spec builder.
 *
 * Inference is intentionally shallow: primitives, arrays, and plain
 * objects only. The goal is a safe, parseable starting point that real
 * traffic and/or `extractSchema()` overrides can later sharpen.
 */

import type { JsonSchema } from './types.js';

/**
 * Infer a JSON Schema fragment from a single runtime value.
 *
 * Returns `null` for `undefined` / `null` so callers can decide whether
 * to omit the schema entirely (e.g. a GET with no body).
 *
 * @param includeExample - attach the seed value as `example`. Off when
 *   unioning many samples, where a representative example is chosen
 *   separately.
 */
export function inferSchema(
  value: unknown,
  includeExample = true,
): JsonSchema | null {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    return includeExample ? { type: 'string', example: value } : { type: 'string' };
  }
  if (typeof value === 'number') {
    const type = Number.isInteger(value) ? 'integer' : 'number';
    return includeExample ? { type, example: value } : { type };
  }
  if (typeof value === 'boolean') {
    return includeExample ? { type: 'boolean', example: value } : { type: 'boolean' };
  }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items:
        value.length > 0
          ? inferSchema(value[0], includeExample) ?? { type: 'object' }
          : { type: 'object' },
    };
  }
  if (typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const s = inferSchema(v, includeExample);
      if (s) properties[k] = s;
    }
    return { type: 'object', properties };
  }
  return null;
}

/**
 * Merge two inferred schemas into one that accepts both shapes.
 *
 * Used to widen a schema across many recorded samples:
 *   - objects merge property-by-property (recursively);
 *   - differing scalar types collapse to a `oneOf` (deduped);
 *   - `integer` + `number` widen to `number`;
 *   - arrays merge their `items`.
 *
 * `null` inputs act as identity so callers can fold over a list.
 */
export function unionSchema(
  a: JsonSchema | null,
  b: JsonSchema | null,
): JsonSchema | null {
  if (!a) return b;
  if (!b) return a;

  const aType = a.type;
  const bType = b.type;

  // Both plain objects: merge properties recursively.
  if (aType === 'object' && bType === 'object') {
    const aProps = (a.properties as Record<string, JsonSchema>) ?? {};
    const bProps = (b.properties as Record<string, JsonSchema>) ?? {};
    const merged: Record<string, JsonSchema> = {};
    for (const key of new Set([...Object.keys(aProps), ...Object.keys(bProps)])) {
      merged[key] = unionSchema(aProps[key] ?? null, bProps[key] ?? null) ?? {
        type: 'object',
      };
    }
    return { type: 'object', properties: merged };
  }

  // Both arrays: merge their item schemas.
  if (aType === 'array' && bType === 'array') {
    return {
      type: 'array',
      items:
        unionSchema(
          (a.items as JsonSchema) ?? null,
          (b.items as JsonSchema) ?? null,
        ) ?? { type: 'object' },
    };
  }

  // integer/number widening.
  if (
    (aType === 'integer' && bType === 'number') ||
    (aType === 'number' && bType === 'integer')
  ) {
    return { type: 'number' };
  }

  // Identical scalar types collapse to a single schema (drop examples so
  // a union doesn't carry a misleading single example).
  if (aType === bType && typeof aType === 'string') {
    return { type: aType };
  }

  // Genuinely different shapes: present both via oneOf.
  return { oneOf: [stripExample(a), stripExample(b)] };
}

function stripExample(schema: JsonSchema): JsonSchema {
  if (!('example' in schema)) return schema;
  const clone = { ...schema };
  delete clone.example;
  return clone;
}
