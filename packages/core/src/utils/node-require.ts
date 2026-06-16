/**
 * Cross-runtime synchronous `require()`.
 *
 * In the CJS build of this package, the per-module `require` function is
 * always available. In the ESM build, `require` is not in scope, so we
 * synthesize one with `node:module#createRequire` keyed on this file's
 * URL.
 *
 * Both branches are guarded behind `eval(...)` so the bare identifiers
 * (`require` / `import.meta.url`) never appear in the AST that TypeScript
 * type-checks - the CJS build has no `import.meta` and the ESM build has
 * no `require`, so a static reference would fail in one or the other.
 *
 * Used for: optional peer-dependency lookups (class-validator, zod,
 * amqplib) and a handful of sync circular-dependency-avoidance loads
 * inside the framework. For everything else, prefer a static `import`.
 */
import { createRequire } from "node:module";

let cached: NodeRequire | undefined;

function resolveRequire(): NodeRequire {
  if (cached) return cached;

  // CJS path: `typeof require` is the only way to test for `require`
  // without throwing a ReferenceError if it's absent. We hide the bare
  // identifier inside `eval` so this file compiles in ESM scope too.
  try {
    // eslint-disable-next-line no-eval
    const cjs = eval(
      "typeof require !== 'undefined' ? require : null",
    ) as NodeRequire | null;
    if (cjs) {
      cached = cjs;
      return cached;
    }
  } catch {
    // Ignore - fall through to ESM path.
  }

  // ESM path: `import.meta.url` is only valid syntax in ESM; we hide it
  // inside `eval` so the CJS build does not reject this file outright.
  // eslint-disable-next-line no-eval
  const url = eval("import.meta.url") as string;
  cached = createRequire(url);
  return cached;
}

/**
 * Synchronously load a module by specifier, working in both CJS and ESM
 * compiled outputs.
 *
 * @example
 *   const cv = nodeRequire("class-validator");
 *
 * @throws Whatever the underlying require throws (typically ENOENT for
 *   missing optional peer deps - callers should catch).
 */
export function nodeRequire<T = unknown>(specifier: string): T {
  return resolveRequire()(specifier) as T;
}
