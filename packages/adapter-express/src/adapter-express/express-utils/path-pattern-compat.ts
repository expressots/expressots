/**
 * Express 5 / path-to-regexp v8 compatibility for the `:name(regex)`
 * inline-constraint syntax.
 *
 * `path-to-regexp` v8 (the parser Express 5 ships with) removed the
 * inline regex form entirely — `/users/:id(\\d+)` now throws
 *
 *   Unexpected ( at index 10: /users/:id(\\d+)
 *
 * That breaks two things we ship as public API:
 *
 *   1. The {@link Patterns} / {@link pattern} helpers in
 *      `route-constraints.ts`, which were introduced specifically to
 *      encourage that pattern.
 *   2. Hand-written controller routes upgraded from v3, where users
 *      relied on Express 4 inline regex.
 *
 * Rather than break those at the surface of preview-3, we keep the
 * authoring-time syntax and translate it at decorator time:
 *
 *   - {@link splitPathConstraints} parses the path into a
 *     plain-`:name`-only form plus a list of `(name, regex)` pairs.
 *   - {@link createPathConstraintMiddleware} returns a middleware that
 *     runs at request time and 404s when any captured `req.params[name]`
 *     fails to match its constraint.
 *
 * The middleware emits an HTTP 404 (not 400) so the behaviour matches
 * Express 4's "no route matched" semantics — under v6 of path-to-regexp,
 * a non-matching `:id(\\d+)` simply meant the route wasn't selected and
 * the request fell through to the framework's NotFound handler.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface PathConstraint {
  /** The `:name` placeholder, without the leading colon. */
  paramName: string;
  /** Compiled regex. Anchored with `^...$` to match the whole segment. */
  regex: RegExp;
  /** The original raw regex text, for diagnostics. */
  rawPattern: string;
}

export interface SplitPath {
  /** Path string ready to hand to Express 5 / path-to-regexp v8. */
  path: string;
  /** Param-level regex constraints, in path declaration order. */
  constraints: Array<PathConstraint>;
}

/**
 * Split `:name(regex)` segments out of an Express-style route path.
 *
 * The walker honours balanced parens inside the regex (e.g.
 * `(\\d{4})` or `((a|b)+)`), which is more forgiving than a naive
 * single-pass regex match would be. Returns the original path and an
 * empty constraints list when no inline patterns are found, so this is
 * a no-op for the common case.
 */
export function splitPathConstraints(path: string): SplitPath {
  // Defensive: hand a non-string straight back. The decorators occasionally
  // see `undefined` or `null` paths in older test fixtures and we don't
  // want to crash decorator-time evaluation just because of input shape.
  if (typeof path !== "string") {
    return { path: path as unknown as string, constraints: [] };
  }

  const constraints: Array<PathConstraint> = [];
  let out = "";
  let i = 0;

  while (i < path.length) {
    const ch = path[i];
    if (ch !== ":") {
      out += ch;
      i++;
      continue;
    }

    // Found a `:` — scan the following identifier (matches `[A-Za-z0-9_]+`,
    // same character class path-to-regexp v8 accepts).
    const start = i;
    i++;
    let nameEnd = i;
    while (
      nameEnd < path.length &&
      /[A-Za-z0-9_]/.test(path[nameEnd] as string)
    ) {
      nameEnd++;
    }
    if (nameEnd === i) {
      // `:` not followed by an identifier — leave it to path-to-regexp.
      out += ":";
      continue;
    }

    const paramName = path.slice(i, nameEnd);
    out += `:${paramName}`;
    i = nameEnd;

    // Optional inline `(...regex...)` immediately after the name.
    if (path[i] !== "(") {
      continue;
    }

    let depth = 1;
    let j = i + 1;
    while (j < path.length && depth > 0) {
      const c = path[j];
      if (c === "\\" && j + 1 < path.length) {
        j += 2;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") depth--;
      j++;
    }

    if (depth !== 0) {
      // Unbalanced — leave the original path intact and let path-to-regexp
      // raise its own (better-located) error.
      out += path.slice(i);
      i = path.length;
      break;
    }

    const rawPattern = path.slice(i + 1, j - 1);
    try {
      constraints.push({
        paramName,
        regex: new RegExp(`^(?:${rawPattern})$`),
        rawPattern,
      });
    } catch {
      // The regex inside the parens is malformed. We don't want a
      // decorator-time crash — fall back to dropping the constraint so
      // the route at least registers; runtime validation simply won't
      // run for this param.
    }

    // Consume the `(...)` segment without re-emitting it into `out`,
    // since path-to-regexp v8 doesn't accept the syntax.
    i = j;

    // Quietly consume a trailing redundant `?` (older code wrote
    // `:foo(\\d+)?`); v8 spells optional segments with `{...}` braces,
    // and "drop the constraint, keep the param" is the sane fallback.
    if (path[i] === "?") {
      i++;
    }

    // Path-to-regexp v6 supported quantifier suffixes (`+`, `*`); v8
    // dropped them. We strip them silently for the same reason.
    while (path[i] === "+" || path[i] === "*") {
      i++;
    }

    void start;
  }

  return { path: out, constraints };
}

/**
 * Build a middleware that enforces the given param-level regex
 * constraints on `req.params`. Returns `null` when the list is empty
 * (so callers can avoid wiring an unnecessary middleware).
 *
 * When a constraint fails, the middleware delegates to `next()` without
 * a value; the framework's NotFound handler then converts that into a
 * 404 — same observable behaviour as Express 4's "no route matched".
 */
export function createPathConstraintMiddleware(
  constraints: Array<PathConstraint>,
): RequestHandler | null {
  if (constraints.length === 0) return null;

  return (req: Request, res: Response, next: NextFunction): void => {
    for (const c of constraints) {
      const value = req.params?.[c.paramName];
      // Express 5 sometimes hands back `string[]` for splat params, but
      // inline-regex params are always scalar strings; coerce defensively.
      const scalar = Array.isArray(value) ? value.join("/") : value;
      if (typeof scalar !== "string" || !c.regex.test(scalar)) {
        // Skip to the next handler so the framework's 404 path runs.
        return next("route");
      }
    }
    next();
  };
}
