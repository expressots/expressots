// Unit tests for: splitPathConstraints + createPathConstraintMiddleware
//
// Express 5 / path-to-regexp v8 dropped the `:name(regex)` inline-regex
// syntax that ExpressoTS publishes via the `Patterns` / `pattern()`
// helpers (and that Express 4 users hand-wrote). The compat module
// translates that authoring-time form into a v8-acceptable plain
// `:name` path plus a request-time validator. These specs lock in the
// translation rules and the validator's pass/fail behaviour so a future
// path-to-regexp upgrade can't silently regress the public API.

import { splitPathConstraints, createPathConstraintMiddleware } from "../path-pattern-compat";

describe("splitPathConstraints", () => {
  it("returns the original path unchanged when no inline regex is present", () => {
    const result = splitPathConstraints("/users/:id");
    expect(result.path).toBe("/users/:id");
    expect(result.constraints).toEqual([]);
  });

  it("strips a single `:name(regex)` constraint and captures the regex", () => {
    const result = splitPathConstraints("/users/:id(\\d+)");
    expect(result.path).toBe("/users/:id");
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].paramName).toBe("id");
    expect(result.constraints[0].regex.test("123")).toBe(true);
    expect(result.constraints[0].regex.test("abc")).toBe(false);
  });

  it("captures multiple constraints across one path", () => {
    const result = splitPathConstraints("/api/:tenant(\\d+)/users/:id([a-f0-9]+)");
    expect(result.path).toBe("/api/:tenant/users/:id");
    expect(result.constraints).toHaveLength(2);
    expect(result.constraints[0].paramName).toBe("tenant");
    expect(result.constraints[1].paramName).toBe("id");
  });

  it("honours balanced parens inside the regex group", () => {
    const result = splitPathConstraints("/code/:val((a|b)+|c)");
    expect(result.path).toBe("/code/:val");
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].regex.test("aab")).toBe(true);
    expect(result.constraints[0].regex.test("c")).toBe(true);
    expect(result.constraints[0].regex.test("d")).toBe(false);
  });

  it("anchors the captured regex with ^...$ to match whole segments only", () => {
    const result = splitPathConstraints("/users/:id(\\d+)");
    expect(result.constraints[0].regex.test("123")).toBe(true);
    // A partial match must fail — otherwise an attacker could smuggle in
    // a `123abc` value past the validator.
    expect(result.constraints[0].regex.test("123abc")).toBe(false);
  });

  it("silently strips a redundant `?` quantifier suffix", () => {
    const result = splitPathConstraints("/posts/:slug([a-z-]+)?");
    expect(result.path).toBe("/posts/:slug");
    expect(result.constraints).toHaveLength(1);
  });

  it("silently strips `+` and `*` quantifier suffixes", () => {
    const result = splitPathConstraints("/x/:p(\\d+)+");
    expect(result.path).toBe("/x/:p");
    expect(result.constraints).toHaveLength(1);
  });

  it("returns non-string paths unchanged for backwards compatibility", () => {
    const result = splitPathConstraints(undefined as unknown as string);
    expect(result.path).toBeUndefined();
    expect(result.constraints).toEqual([]);
  });

  it("ignores unbalanced parens rather than corrupting the path", () => {
    // Can't usefully recover; we hand the broken path back so the
    // path-to-regexp parser's own error message wins.
    const result = splitPathConstraints("/x/:p(\\d+");
    expect(result.constraints).toEqual([]);
  });

  it("ignores a malformed regex but still strips the segment", () => {
    // `(?` is invalid JS regex syntax — we silently drop the constraint
    // so the route at least registers cleanly.
    const result = splitPathConstraints("/x/:p(?)");
    expect(result.path).toBe("/x/:p");
    expect(result.constraints).toEqual([]);
  });
});

describe("createPathConstraintMiddleware", () => {
  const makeReqRes = (params: Record<string, string | string[]> | null) => ({
    req: { params } as unknown as import("express").Request,
    res: {} as unknown as import("express").Response,
  });

  it("returns null when there are no constraints", () => {
    expect(createPathConstraintMiddleware([])).toBeNull();
  });

  it("calls next() with no argument when every constraint matches", () => {
    const mw = createPathConstraintMiddleware([
      {
        paramName: "id",
        regex: /^(?:\d+)$/,
        rawPattern: "\\d+",
      },
    ])!;
    const { req, res } = makeReqRes({ id: "123" });
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next('route') so Express skips to the framework's NotFound handler when a constraint fails", () => {
    const mw = createPathConstraintMiddleware([
      {
        paramName: "id",
        regex: /^(?:\d+)$/,
        rawPattern: "\\d+",
      },
    ])!;
    const { req, res } = makeReqRes({ id: "abc" });
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledWith("route");
  });

  it("rejects array-shaped params (Express 5 splat) that fail the constraint", () => {
    const mw = createPathConstraintMiddleware([
      {
        paramName: "p",
        regex: /^(?:foo\/bar)$/,
        rawPattern: "foo/bar",
      },
    ])!;
    const { req, res } = makeReqRes({ p: ["foo", "baz"] });
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledWith("route");
  });

  it("accepts array-shaped params that join to a matching string", () => {
    const mw = createPathConstraintMiddleware([
      {
        paramName: "p",
        regex: /^(?:foo\/bar)$/,
        rawPattern: "foo/bar",
      },
    ])!;
    const { req, res } = makeReqRes({ p: ["foo", "bar"] });
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("treats a missing param as a constraint failure", () => {
    const mw = createPathConstraintMiddleware([
      {
        paramName: "id",
        regex: /^(?:\d+)$/,
        rawPattern: "\\d+",
      },
    ])!;
    const { req, res } = makeReqRes({});
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledWith("route");
  });
});
