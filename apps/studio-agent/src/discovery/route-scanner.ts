/**
 * Route scanner for ExpressoTS applications
 * Discovers routes, controllers, and services from the application
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  RouteInfo,
  ControllerInfo,
  ServiceInfo,
  AppStructure,
  HttpMethod,
  DependencyInfo,
  ModuleInfo,
  MiddlewareInfo,
} from '../types/index.js';

// NOTE: HTTP method decorators, controller decorators, and the
// `extends ExpressoMiddleware` pattern are matched inline below — the
// scanner uses balanced-paren walks rather than fragile capture-group
// regexes so it can handle decorator arguments like
// `@Get('/x', AuthMw, RoleGuard("admin"))`.

/**
 * Type names that look like dependencies syntactically but aren't ones we
 * want to plot on the architecture graph. Lowercased for cheap comparison.
 */
const PRIMITIVE_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'any',
  'unknown',
  'void',
  'never',
  'object',
  'null',
  'undefined',
  'date',
  'array',
  'map',
  'set',
  'promise',
  'function',
  'buffer',
]);

/**
 * Locate the constructor parameter list in `content`, honouring balanced
 * parentheses inside parameter decorators like `@inject(MyService)`.
 *
 * A naive `constructor\s*\(([^)]*)\)` regex breaks the moment a parameter
 * carries any decorator with arguments — it stops at the *inner* close
 * paren, leaving the parameter list truncated. That used to silently kill
 * the architecture graph for any class using `@inject(...)`.
 *
 * Returns `null` when no constructor is found.
 */
function findConstructorParams(content: string): string | null {
  const ctorIdx = content.search(/\bconstructor\s*\(/);
  if (ctorIdx < 0) return null;
  // Position the cursor at the `(` that opens the parameter list.
  const openIdx = content.indexOf('(', ctorIdx);
  if (openIdx < 0) return null;

  let depth = 0;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return content.slice(openIdx + 1, i);
      }
    }
  }
  // Unbalanced — bail out rather than produce garbage.
  return null;
}

/**
 * Extract injected dependency types from a constructor parameter list.
 *
 * Handles every shape ExpressoTS users hit in practice:
 *
 *   - parameter properties:        `private foo: Foo`
 *   - readonly properties:         `private readonly foo: Foo`
 *   - bare params:                 `foo: Foo`
 *   - explicit @inject decorators: `@inject(SYM) private foo: Foo`
 *   - multi-modifier combos:       `@inject(SYM) private readonly foo: Foo`
 *   - multiple params separated by commas
 *
 * For each parameter we return the most useful identifier for the
 * architecture graph — the `@inject(TOKEN)` argument when present (the
 * actual DI binding key, which always has a matching provider node),
 * otherwise the constructor parameter type. This restores edges that
 * previously dangled when controllers depended on an interface (e.g.
 * `IUserService`) bound to a concrete class (`UserService`).
 *
 * The previous implementation captured the access modifier (`private`)
 * instead of the type, so the architecture graph never drew a dependency
 * edge from a controller to its use case.
 */
/**
 * Generate a JSON-friendly placeholder for a TypeScript type literal.
 * Best-effort: union types collapse to the first arm, generics fall back
 * to `null`, arrays become `[]`. The result is meant to seed an HTTP
 * client form, not pass strict validation.
 */
function sampleForType(typeName: string): unknown {
  const t = typeName.trim();

  // Strip wrapping `()`s and trailing whitespace.
  const head = t.replace(/^\(+|\)+$/g, '').trim();

  // Array types: `Foo[]` or `Array<Foo>`.
  if (/\[\]$/.test(head) || /^Array\s*</i.test(head)) {
    return [];
  }

  // Union — pick the first non-null/undefined arm.
  if (head.includes('|')) {
    const arms = head
      .split('|')
      .map((a) => a.trim())
      .filter((a) => a && a !== 'null' && a !== 'undefined');
    if (arms.length > 0) return sampleForType(arms[0]);
    return null;
  }

  // Strip generics: `Promise<Foo>` → `Promise`. Unhandled below ⇒ null.
  const bare = head.replace(/<.*$/, '').toLowerCase();

  switch (bare) {
    case 'string':
      return '';
    case 'number':
    case 'bigint':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return new Date(0).toISOString();
    case 'object':
    case 'record':
      return {};
    case 'any':
    case 'unknown':
      return null;
    default:
      return null;
  }
}

/**
 * Split a comma-separated source fragment at top-level commas only,
 * respecting nested `()`, `[]`, and `{}`. Used to walk the fields of a
 * `z.object({ ... })` literal without a real parser.
 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  if (start < body.length) parts.push(body.slice(start));
  return parts;
}

/** Split a single `key: value` entry at the first top-level colon. */
function splitKeyValue(part: string): [string, string] | null {
  let depth = 0;
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ':' && depth === 0) {
      return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }
  }
  return null;
}

/** Parse a quoted/numeric/boolean literal token into a JSON value. */
function parseLiteralToken(raw: string): unknown {
  const s = raw.trim();
  if (/^['"`]/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  const n = Number(s);
  if (s !== '' && !Number.isNaN(n)) return n;
  return s;
}

/**
 * Best-effort sample value for a single Zod field expression, e.g.
 * `z.string().email().optional()` → `""`, `z.number().int()` → `0`,
 * `z.enum(['a','b'])` → `"a"`. Nested objects/arrays collapse to `{}`/`[]`
 * (one level), matching the static scanner's deliberate shallowness.
 */
function sampleForZodExpr(expr: string): unknown {
  const e = expr.trim();

  const enumMatch = e.match(/\.enum\s*\(\s*\[\s*(['"`])([\s\S]*?)\1/);
  if (enumMatch) return enumMatch[2];

  const literalMatch = e.match(/\.literal\s*\(\s*([\s\S]+?)\s*\)/);
  if (literalMatch) return parseLiteralToken(literalMatch[1]);

  // Order matters: arrays/objects before scalars so `z.string().array()`
  // resolves to `[]`, not `""`.
  if (/\.(array|tuple)\s*\(/.test(e)) return [];
  if (/\.(object|record)\s*\(/.test(e)) return {};
  if (/\.(string|email|url|uuid|cuid|ulid|datetime)\s*\(/.test(e)) return '';
  if (/\.(number|int|bigint)\s*\(/.test(e)) return 0;
  if (/\.boolean\s*\(/.test(e)) return false;
  if (/\.date\s*\(/.test(e)) return new Date(0).toISOString();

  const defaultMatch = e.match(/\.default\s*\(\s*([\s\S]+?)\s*\)/);
  if (defaultMatch) return parseLiteralToken(defaultMatch[1]);

  return null;
}

/**
 * Find the body between the brace at `openBraceIdx` and its matching
 * close brace. Returns `null` when unbalanced.
 */
function matchBraces(content: string, openBraceIdx: number): string | null {
  let depth = 0;
  for (let i = openBraceIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.slice(openBraceIdx + 1, i);
    }
  }
  return null;
}

/**
 * Parse the fields of a `z.object({ ... })` literal body into a sample
 * object. Each top-level `field: z.<chain>` entry becomes one sample value.
 */
function parseZodObjectFields(objectBody: string): Record<string, unknown> {
  const sample: Record<string, unknown> = {};
  for (const part of splitTopLevel(objectBody)) {
    const kv = splitKeyValue(part);
    if (!kv) continue;
    const [rawKey, valueExpr] = kv;
    if (!/z\s*\./.test(valueExpr)) continue;
    const key = rawKey.replace(/^['"`]|['"`]$/g, '').trim();
    if (!key || /[^A-Za-z0-9_$]/.test(key)) continue;
    sample[key] = sampleForZodExpr(valueExpr);
  }
  return sample;
}

/**
 * Starting at `fromIndex` in `content`, walk forward to the next method
 * declaration and return its name + the *balanced* parameter list.
 *
 * The previous implementation used a simple `\(([^)]*)\)` regex which
 * stops at the first `)` it sees — fatal for ExpressoTS controllers
 * because parameter decorators like `@body()` have their own parens.
 * That bug caused every route whose handler accepted `@body() / @param() /
 * @query() / @inject()` to silently disappear from the static scan,
 * which then forced the runtime scanner to fall back to
 * `controller: 'Unknown'` (the "Other" group in the Studio API client).
 *
 * Returns `null` when no method signature is found.
 */
function findNextMethodSignature(
  content: string,
  fromIndex: number,
): { name: string; params: string; absoluteEndIndex: number } | null {
  // A method signature looks like:
  //   <visibility?> <static?> <async?> name ( … ) <return-type?> {
  // We anchor on `name(` — once located we use balanced paren matching to
  // capture the parameter list, then verify a `{` follows (to skip
  // forward-declared arrow types or call expressions).
  const HEAD = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/g;
  HEAD.lastIndex = fromIndex;

  let match: RegExpExecArray | null;
  while ((match = HEAD.exec(content)) !== null) {
    const name = match[1];
    // Skip control-flow keywords that look like method names.
    if (
      name === 'if' ||
      name === 'for' ||
      name === 'while' ||
      name === 'switch' ||
      name === 'catch' ||
      name === 'return'
    ) {
      continue;
    }

    const openParen = match.index + match[0].length - 1; // points at '('
    let depth = 1;
    let i = openParen + 1;
    for (; i < content.length && depth > 0; i++) {
      const ch = content[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    if (depth !== 0) return null; // unbalanced — give up

    const closeParen = i - 1;
    const params = content.slice(openParen + 1, closeParen);

    // Walk past the optional return-type annotation up to the first
    // non-whitespace character after the `)`. Accept `{` as a method
    // body (skip ahead) and `=>` to also detect arrow assignments
    // (uncommon in controllers but harmless to allow).
    let j = closeParen + 1;
    while (j < content.length && /\s/.test(content[j])) j++;
    if (content[j] === ':') {
      // Skip `: ReturnType`
      while (j < content.length && content[j] !== '{' && content[j] !== ';' && content[j] !== '\n') {
        j++;
      }
      while (j < content.length && /\s/.test(content[j])) j++;
    }

    if (content[j] === '{') {
      return { name, params, absoluteEndIndex: j };
    }
    // Not a method body — keep scanning.
  }
  return null;
}

/**
 * Extract dependency identifiers from class-level field injection.
 *
 * ExpressoTS supports two equivalent DI patterns:
 *
 *   1. Constructor injection: `constructor(private foo: Foo) {}`
 *   2. Field injection:       `@inject(Foo) private foo: Foo;`
 *
 * (1) is handled by `findConstructorParams` + `extractParamTypes`. (2)
 * needs its own scanner because the `@inject(TOKEN)` decorator sits on
 * a *property* declaration and therefore never appears inside the
 * constructor parameter list. Without this extractor, the architecture
 * map showed orphan controllers / services for any project that picked
 * field injection (the default in the CLI's generated useCase template).
 *
 * Returns the most useful identifier per field — the `@inject(TOKEN)`
 * argument (which is always a real DI binding key) and falls back to
 * the declared type when the token is missing.
 */
function extractFieldInjectionTypes(classBody: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  // `@inject(TOKEN) <visibility?> <readonly?> <name><?> : <Type>;|=`
  // Token is captured greedily to support `Symbol.for(...)` and
  // `SYMBOL_TYPES.Foo` style identifiers.
  const FIELD_INJECT_RE =
    /@inject\s*\(\s*([\w.$]+)\s*\)\s*(?:public\s+|private\s+|protected\s+)?(?:readonly\s+)?\w+\s*\??\s*:\s*([A-Za-z_$][\w.$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = FIELD_INJECT_RE.exec(classBody)) !== null) {
    const injectToken = match[1];
    const typeName = match[2];
    const candidate = injectToken || typeName;
    if (!candidate) continue;
    const head = candidate.split('.').pop() || candidate;
    if (PRIMITIVE_TYPES.has(head.toLowerCase())) continue;
    if (seen.has(head)) continue;
    seen.add(head);
    out.push(head);
  }
  return out;
}

/**
 * Capture the full balanced argument list of a decorator call.
 *
 * Given `content` and the index of the opening `(` (immediately after
 * the decorator name), returns the substring between `(` and the
 * matching `)`. Handles strings, template literals, and nested call
 * expressions so decorators like
 *
 *   @controller("/x", isAuthenticated, RoleGuard("admin"))
 *
 * round-trip cleanly. Returns `null` when the parens are unbalanced.
 */
function extractBalancedArgs(
  content: string,
  openParenIdx: number,
): string | null {
  if (content[openParenIdx] !== '(') return null;
  let depth = 1;
  let i = openParenIdx + 1;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const close = ch;
      i++;
      while (i < content.length) {
        if (content[i] === '\\') {
          i += 2;
          continue;
        }
        if (content[i] === close) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return content.slice(openParenIdx + 1, i - 1);
}

/**
 * Split a decorator argument list on top-level commas, respecting
 * strings and bracket / paren nesting. Used to peel off the path arg
 * (always the first entry) from the trailing middleware identifiers.
 */
function splitTopLevelArgs(args: string): string[] {
  const out: string[] = [];
  let buf = '';
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  for (let i = 0; i < args.length; i++) {
    const ch = args[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const close = ch;
      buf += ch;
      i++;
      while (i < args.length) {
        buf += args[i];
        if (args[i] === '\\' && i + 1 < args.length) {
          buf += args[i + 1];
          i += 2;
          continue;
        }
        if (args[i] === close) break;
        i++;
      }
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    if (ch === ',' && paren === 0 && bracket === 0 && brace === 0) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

/**
 * Extract identifier references from a decorator argument that is
 * supposed to be a middleware reference. Accepts plain identifiers
 * (`MyMiddleware`), dotted access (`Mw.User`), and call expressions
 * (`RoleGuard("admin")`) — the latter still resolves to a single
 * identifier ("RoleGuard"). Returns `null` when the arg is not an
 * identifier reference (e.g. a string token, an arrow function, an
 * object literal). Those forms are real but can't be plotted as an
 * architecture node from the static scan alone.
 */
function middlewareIdentifierFromArg(arg: string): string | null {
  const trimmed = arg.trim();
  if (!trimmed) return null;
  // Strip a trailing `(...)` so `RoleGuard("admin")` → `RoleGuard`.
  const match = trimmed.match(/^([A-Za-z_$][\w.$]*)/);
  if (!match) return null;
  const head = match[1].split('.').pop();
  if (!head) return null;
  // Skip JS reserved words and the path-style identifiers that aren't
  // class references (e.g. `'/path'` would already have failed the
  // regex; this catches `null`, `undefined`, `true`, `false`).
  if (head === 'null' || head === 'undefined' || head === 'true' || head === 'false') {
    return null;
  }
  return head;
}

function extractParamTypes(params: string): string[] {
  const out: string[] = [];
  // Anchor each iteration to consume exactly one parameter:
  //   1) Optional `@decorator(...)` prefix(es) — args may contain commas
  //      Capture group 1 isolates the *first* @inject(...) token so we
  //      can prefer it over the declared type when both are present.
  //   2) Optional access modifier (and `readonly`)
  //   3) Parameter name (non-capturing, we don't need it)
  //   4) `:` then the captured Type (allow `Foo`, `Ns.Foo`, `Foo<...>`)
  //   5) `?:` is allowed to support optional injection
  const PARAM_RE =
    /(?:@\w+\s*\(\s*([\w.$]+)?\s*\)\s*)*(?:(?:public|private|protected)\s+)?(?:readonly\s+)?\w+\s*\??\s*:\s*([A-Za-z_$][\w.$]*)/g;
  for (const match of params.matchAll(PARAM_RE)) {
    const injectToken = match[1];
    const typeName = match[2];

    const candidate = injectToken || typeName;
    if (!candidate) continue;

    const head = candidate.split('.').pop() || candidate;
    if (PRIMITIVE_TYPES.has(head.toLowerCase())) continue;
    out.push(head);
  }
  return out;
}

/**
 * Static route and structure scanner for ExpressoTS applications.
 *
 * Walks the project's TypeScript sources and extracts controllers,
 * services, providers, middleware, modules, routes, and the dependency
 * graph between them by parsing decorator metadata (`@controller`,
 * `@Get` and friends, `@provide`, `@inject`) without executing any user
 * code. The result feeds the Studio Routes, Architecture and API client
 * views.
 *
 * A complementary runtime scan is available via the static
 * `scanExpressApp()` helper, which inspects a live Express router stack
 * to pick up routes registered outside decorated controllers.
 *
 * @example
 * ```typescript
 * const scanner = new RouteScanner('./src');
 * const structure = await scanner.scan();
 * const routes = scanner.getRoutes();
 * ```
 */
export class RouteScanner {
  private srcPath: string;
  private controllers: ControllerInfo[] = [];
  private services: ServiceInfo[] = [];
  private providers: ServiceInfo[] = [];
  private middleware: MiddlewareInfo[] = [];
  private dependencies: DependencyInfo[] = [];
  /**
   * Class names of middleware discovered statically. Used to:
   *   1. Suppress the same class from being added to `services[]`
   *      (the legacy heuristic promoted any `@provide`-decorated class).
   *   2. Resolve middleware identifiers parsed out of `@controller`/
   *      `@Get` arguments to the matching scanner record.
   */
  private middlewareClassNames: Set<string> = new Set();
  /**
   * Bindings extracted from `@controller(path, ...mw)` and route
   * decorators (`@Get(path, ...mw)`). Each entry is the source of a
   * future `middleware → controller` edge.
   */
  private staticMiddlewareBindings: Array<{
    middlewareName: string;
    controllerName: string;
    scope: 'controller' | 'route';
    controllerMethod?: string;
  }> = [];
  /**
   * Interface → implementation lookup populated from `class X implements IY`.
   * Used by `buildDependencyGraph` to redirect edges that target an
   * interface name (e.g. `IUserService`) to the concrete class node
   * (`UserService`). Without this fallback the architecture map shows
   * an orphan source node and a dangling edge for every interface-typed
   * constructor parameter, which is the default ExpressoTS pattern.
   */
  private implementsMap: Map<string, string> = new Map();
  /**
   * Discovered `CreateModule(...)` declarations. Two-pass: we collect
   * raw items per module first, then expand nested module references
   * into their concrete class members so the UI can group nodes by
   * leaf module without re-doing the resolution.
   */
  private modules: ModuleInfo[] = [];
  private moduleRawItems: Map<string, { filePath: string; items: string[] }> =
    new Map();
  /**
   * DTO class name → sample JSON body (e.g. `{ name: "", age: 0 }`).
   * Built from class field declarations during the file pre-pass and
   * consumed when a controller method has an `@Body()` parameter so the
   * Studio API client can auto-fill a working request body.
   */
  private dtoSamples: Map<string, Record<string, unknown>> = new Map();

  /**
   * Create a scanner rooted at the given source directory.
   *
   * @param srcPath - Directory to scan for TypeScript sources. Resolved
   *   to an absolute path. Default: "./src".
   */
  constructor(srcPath: string = './src') {
    this.srcPath = path.resolve(srcPath);
  }

  /**
   * Scan the source tree and build the application structure.
   *
   * Resets all internal state, so repeated calls (e.g. on file-watcher
   * rescans) always reflect the current sources.
   *
   * @returns The discovered controllers, services, providers, middleware,
   *   dependency edges, and modules.
   */
  async scan(): Promise<AppStructure> {
    // Reset collections
    this.controllers = [];
    this.services = [];
    this.providers = [];
    this.middleware = [];
    this.middlewareClassNames.clear();
    this.staticMiddlewareBindings = [];
    this.dependencies = [];
    this.implementsMap.clear();
    this.dtoSamples.clear();
    this.modules = [];
    this.moduleRawItems.clear();

    // Find all TypeScript files
    const files = await this.findTypeScriptFiles();

    // First pass: harvest middleware class names so the main parse can
    // suppress them from the generic `@provide` → service bucket. This
    // matters because middleware classes are typically also decorated
    // with `@provide(...)` so they can be DI-resolved when added via
    // `Middleware.add(new MyMiddleware())`. Without this pre-pass the
    // architecture map would render every middleware as a "Service"
    // node and then flag it as orphan because nothing `@inject`s it.
    for (const file of files) {
      this.preScanForMiddlewareClasses(file);
    }

    // Parse each file
    for (const file of files) {
      await this.parseFile(file);
    }

    // Build dependency graph
    this.buildDependencyGraph();

    // Resolve nested module references after every file has been parsed
    // (modules can reference other modules declared in different files).
    this.resolveModules();

    return {
      controllers: this.controllers,
      services: this.services,
      providers: this.providers,
      middleware: this.middleware,
      dependencies: this.dependencies,
      modules: this.modules,
    };
  }

  /**
   * Cheap regex scan to find every class that extends `ExpressoMiddleware`.
   * Records the class name and creates a `MiddlewareInfo` placeholder
   * with `scope: 'unknown'`. The scope is upgraded later by
   * `buildDependencyGraph()` (when the class shows up in a controller
   * decorator) and by the agent's runtime merge step (for global
   * middleware added via `Middleware.add()`).
   */
  private preScanForMiddlewareClasses(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const re = /class\s+(\w+)(?:\s*<[^>]*>)?\s+extends\s+ExpressoMiddleware\b/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const name = match[1];
      if (this.middlewareClassNames.has(name)) continue;
      this.middlewareClassNames.add(name);
      this.middleware.push({
        name,
        filePath,
        dependencies: [],
        methods: [],
        scope: 'unknown',
      });
    }
  }

  /**
   * Recursively expand `moduleRawItems` into concrete class members.
   * A module item that references another module name is replaced with
   * that module's flattened members. Cycles are guarded with a visited
   * set so a self-referential module never blows the stack.
   */
  private resolveModules(): void {
    const moduleNames = new Set(this.moduleRawItems.keys());
    const memo = new Map<string, string[]>();

    const expand = (moduleName: string, visiting: Set<string>): string[] => {
      if (memo.has(moduleName)) return memo.get(moduleName)!;
      if (visiting.has(moduleName)) return []; // cycle
      visiting.add(moduleName);

      const raw = this.moduleRawItems.get(moduleName);
      if (!raw) {
        visiting.delete(moduleName);
        return [];
      }
      const out = new Set<string>();
      for (const item of raw.items) {
        if (moduleNames.has(item)) {
          for (const sub of expand(item, visiting)) out.add(sub);
        } else {
          out.add(item);
        }
      }
      visiting.delete(moduleName);
      const result = [...out];
      memo.set(moduleName, result);
      return result;
    };

    for (const [name, raw] of this.moduleRawItems) {
      this.modules.push({
        name,
        filePath: raw.filePath,
        members: expand(name, new Set()),
      });
    }
  }

  /**
   * Get all routes discovered by the last `scan()`.
   *
   * @returns Routes flattened across every discovered controller. Empty
   *   before the first scan.
   */
  getRoutes(): RouteInfo[] {
    return this.controllers.flatMap((c) => c.routes);
  }

  /** Find all TypeScript files in src directory */
  private async findTypeScriptFiles(): Promise<string[]> {
    if (!fs.existsSync(this.srcPath)) {
      console.warn(`Source path not found: ${this.srcPath}`);
      return [];
    }

    const pattern = path.join(this.srcPath, '**/*.{ts,js}').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
    });

    return files;
  }

  /** Parse a single file for routes and services */
  private async parseFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Record every `class X implements IY[, IZ]` so the dependency graph
    // can redirect interface-typed edges to the concrete class node.
    // We do this regardless of whether the class is a controller, service
    // or provider — interfaces can be implemented anywhere.
    const implementsRe =
      /class\s+(\w+)(?:\s+extends\s+[\w.<>,\s]+)?\s+implements\s+([\w.<>,\s]+?)\s*\{/g;
    let implMatch;
    while ((implMatch = implementsRe.exec(content)) !== null) {
      const className = implMatch[1];
      const ifaces = implMatch[2]
        .split(',')
        .map((s) => s.trim().replace(/<.*$/, '').split('.').pop()!)
        .filter(Boolean);
      for (const iface of ifaces) {
        // Only register if not already mapped — first hit wins, which
        // matches the typical "one impl per interface" convention.
        if (!this.implementsMap.has(iface)) {
          this.implementsMap.set(iface, className);
        }
      }
    }

    // Build DTO samples for every class / interface / type-alias whose
    // name matches the convention (`*Dto`, `*Request`, `*Payload`,
    // `*Input`, `*Body`, including upper-case `*DTO` etc). We register
    // each sample under its declared name *and* — when the name starts
    // with `I` (the interface-prefix convention) — under the
    // I-stripped name too, so a route typed `@body() x: IFooDto` finds
    // the sample built from `interface IFooDto` or class `FooDto`.
    const isDtoLike = (n: string) => /(Dto|Request|Payload|Input|Body)$/i.test(n);

    const registerSample = (declaredName: string, sample: Record<string, unknown>) => {
      if (Object.keys(sample).length === 0) return;
      this.dtoSamples.set(declaredName, sample);
      if (declaredName.startsWith('I') && declaredName.length > 1) {
        const stripped = declaredName.slice(1);
        if (!this.dtoSamples.has(stripped)) {
          this.dtoSamples.set(stripped, sample);
        }
      }
    };

    const fieldRe =
      /^[ \t]*(?:public\s+|private\s+|protected\s+)?(?:readonly\s+)?(\w+)\s*\??\s*:\s*([A-Za-z_$][\w.<>[\]|\s'"]*?)\s*[;=,]/gm;

    const buildSampleFromBody = (body: string): Record<string, unknown> => {
      const sample: Record<string, unknown> = {};
      fieldRe.lastIndex = 0;
      let fieldMatch;
      while ((fieldMatch = fieldRe.exec(body)) !== null) {
        const fieldName = fieldMatch[1];
        const typeName = fieldMatch[2];
        if (fieldName === 'constructor') continue;
        sample[fieldName] = sampleForType(typeName);
      }
      return sample;
    };

    // (a) Classes — same shape as before but with a permissive header.
    const classRe =
      /class\s+(\w+)(?:\s+extends\s+[\w.<>,\s]+)?(?:\s+implements\s+[\w.<>,\s]+)?\s*\{([\s\S]*?)\n\}/g;
    let classMatch;
    while ((classMatch = classRe.exec(content)) !== null) {
      const declaredName = classMatch[1];
      if (!isDtoLike(declaredName)) continue;
      registerSample(declaredName, buildSampleFromBody(classMatch[2]));
    }

    // (b) Interfaces — `interface IUserCreateRequestDTO { … }` with
    // optional `extends Foo, Bar`.
    const interfaceRe =
      /interface\s+(\w+)(?:\s+extends\s+[\w.<>,\s]+)?\s*\{([\s\S]*?)\n\}/g;
    let interfaceMatch;
    while ((interfaceMatch = interfaceRe.exec(content)) !== null) {
      const declaredName = interfaceMatch[1];
      if (!isDtoLike(declaredName)) continue;
      registerSample(declaredName, buildSampleFromBody(interfaceMatch[2]));
    }

    // (c) Type aliases — `type FooDto = { … }`. Generic + intersection
    // forms are out of scope; we only care about the inline-object case.
    const typeAliasRe =
      /type\s+(\w+)\s*=\s*\{([\s\S]*?)\n\}/g;
    let typeAliasMatch;
    while ((typeAliasMatch = typeAliasRe.exec(content)) !== null) {
      const declaredName = typeAliasMatch[1];
      if (!isDtoLike(declaredName)) continue;
      registerSample(declaredName, buildSampleFromBody(typeAliasMatch[2]));
    }

    // (d) Zod object schemas — `const FooSchema = z.object({ … })`.
    // Registered under the declared const name regardless of the *Dto
    // naming convention (Zod schemas are conventionally named `*Schema`),
    // so a route declared `@body(FooSchema)` resolves its sample here. The
    // runtime bridge (adapter `collectRouteSchemas`) supersedes this when
    // the app is actually running; this keeps coverage for static/offline
    // scans where no schema object exists.
    const zodConstRe = /(?:export\s+)?const\s+(\w+)\s*=\s*z\s*\.\s*object\s*\(\s*\{/g;
    let zodMatch;
    while ((zodMatch = zodConstRe.exec(content)) !== null) {
      const declaredName = zodMatch[1];
      const openBraceIdx = zodMatch.index + zodMatch[0].length - 1;
      const objectBody = matchBraces(content, openBraceIdx);
      if (!objectBody) continue;
      registerSample(declaredName, parseZodObjectFields(objectBody));
    }

    // Check if this is a controller
    const controllerMatch = content.match(/@controller\s*\(\s*['"`]([^'"`]+)['"`]/i);
    if (controllerMatch) {
      const controllerPath = controllerMatch[1];
      const controller = this.parseController(content, filePath, controllerPath, lines);
      if (controller) {
        this.controllers.push(controller);
      }
    }

    // Check if this is a service/provider. We require the file to
    // contain at least one `@provide(<Identifier>) ... class <X>` pair
    // so that arbitrary uses of `provide` (e.g. methods named `provide`,
    // doc-comments, mock objects in tests) don't get promoted to ghost
    // services. The pair is matched with a lookahead that allows the
    // typical `@provide(Foo) @scope(...) export class Foo` formatting.
    //
    // Classes we already classified as middleware (in the pre-pass) are
    // skipped so they don't end up as both a "Service" and a
    // "Middleware" node — `Middleware.add(new MyMw())` requires the
    // class to be DI-bound, so middleware is almost always also
    // `@provide`-decorated.
    const provideClassRe =
      /@provide\s*\(\s*([\w.$]+)?\s*\)[\s\S]{0,400}?\bclass\s+(\w+)/g;
    const provideMatches = [...content.matchAll(provideClassRe)];
    for (const match of provideMatches) {
      const declaredClass = match[2];
      if (this.middlewareClassNames.has(declaredClass)) {
        // Hydrate the middleware record with constructor / field
        // dependencies and method names. We piggy-back on
        // `parseService` because the extraction logic is identical
        // (DI deps come from the same decorators).
        const enriched = this.parseService(content, filePath, declaredClass);
        if (enriched) {
          const target = this.middleware.find((m) => m.name === declaredClass);
          if (target) {
            target.dependencies = enriched.dependencies;
            target.methods = enriched.methods;
          }
        }
        continue;
      }
      const service = this.parseService(content, filePath, declaredClass);
      if (!service) continue;
      // Determine if it's a service or provider based on naming
      if (
        filePath.includes('provider') ||
        service.name.toLowerCase().includes('provider')
      ) {
        this.providers.push(service);
      } else {
        this.services.push(service);
      }
    }

    // Detect `export const Foo = CreateModule([Bar, Baz])`. Anonymous
    // inline modules (e.g. inside `configContainer([CreateModule([...])])`)
    // are skipped — only named exports get a UI grouping. We capture the
    // bracket contents with a balanced-bracket walk so multi-line arrays
    // and nested `CreateModule(...)` calls aren't truncated.
    const moduleHeadRe =
      /(?:export\s+)?const\s+(\w+)\s*(?::\s*[\w<>,\s]+)?\s*=\s*CreateModule\s*\(\s*\[/g;
    let mhMatch: RegExpExecArray | null;
    while ((mhMatch = moduleHeadRe.exec(content)) !== null) {
      const moduleName = mhMatch[1];
      const arrayStart = mhMatch.index + mhMatch[0].length;
      let depth = 1;
      let i = arrayStart;
      for (; i < content.length && depth > 0; i++) {
        const ch = content[i];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
      }
      if (depth !== 0) continue; // malformed — skip
      const arrayBody = content.slice(arrayStart, i - 1);

      // Split on commas at depth 0 (so `CreateModule([…])` nested
      // expressions stay intact). Then trim whitespace / trailing
      // commas, and accept identifiers only.
      const items: string[] = [];
      let bracketDepth = 0;
      let parenDepth = 0;
      let buf = '';
      for (const ch of arrayBody) {
        if (ch === '[' || ch === '{') bracketDepth++;
        else if (ch === ']' || ch === '}') bracketDepth--;
        else if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        if (ch === ',' && bracketDepth === 0 && parenDepth === 0) {
          const id = buf.trim();
          if (/^[A-Za-z_$][\w.$]*$/.test(id)) items.push(id.split('.').pop()!);
          buf = '';
        } else {
          buf += ch;
        }
      }
      const tail = buf.trim();
      if (/^[A-Za-z_$][\w.$]*$/.test(tail)) items.push(tail.split('.').pop()!);

      if (items.length > 0) {
        this.moduleRawItems.set(moduleName, { filePath, items });
      }
    }
  }

  /** Parse controller from file content */
  private parseController(
    content: string,
    filePath: string,
    basePath: string,
    lines: string[]
  ): ControllerInfo | null {
    // Get class name
    const classMatch = content.match(/class\s+(\w+)/);
    if (!classMatch) return null;

    const className = classMatch[1];
    const routes: RouteInfo[] = [];
    const dependencies: string[] = [];

    // Extract controller-level middleware from `@controller(path, ...mw)`.
    // Walk the full balanced arg list so call-expression middleware
    // (`RoleGuard("admin")`) and multi-line decorators are handled.
    const ctrlDecoratorIdx = content.search(/@controller\s*\(/i);
    if (ctrlDecoratorIdx >= 0) {
      const openParen = content.indexOf('(', ctrlDecoratorIdx);
      const args = openParen >= 0 ? extractBalancedArgs(content, openParen) : null;
      if (args) {
        const parts = splitTopLevelArgs(args);
        // First entry is always the path string — skip it.
        for (const part of parts.slice(1)) {
          const ident = middlewareIdentifierFromArg(part);
          if (!ident) continue;
          this.staticMiddlewareBindings.push({
            middlewareName: ident,
            controllerName: className,
            scope: 'controller',
          });
        }
      }
    }

    // Extract constructor-style dependencies. Balanced-paren aware so
    // parameter decorators (@inject(MyService)) don't truncate the
    // parameter list at the wrong `)`.
    const params = findConstructorParams(content);
    if (params) {
      dependencies.push(...extractParamTypes(params));
    }

    // Also extract field-injection dependencies — the default pattern
    // produced by `expressots g controller`. Without this the
    // architecture map shows the controller as an isolated node even
    // though it's wired to a use case via `@inject(UseCase)`.
    const ctrlBodyRe = new RegExp(
      `class\\s+${className}\\b(?:\\s+extends\\s+[\\w.<>,\\s]+)?(?:\\s+implements\\s+[\\w.<>,\\s]+)?\\s*\\{([\\s\\S]*?)\\n\\}`,
    );
    const ctrlBody = content.match(ctrlBodyRe)?.[1] ?? '';
    if (ctrlBody) {
      for (const dep of extractFieldInjectionTypes(ctrlBody)) {
        if (!dependencies.includes(dep)) dependencies.push(dep);
      }
    }

    // Find HTTP method decorators. Each match advances a balanced-paren
    // method-signature scanner so handlers with parameter decorators
    // (`@body()`, `@param()`, `@inject()`, …) are still detected. We
    // ignore the original regex's captured path because it stops at
    // the first `)` — fine for `@Get('/x')` but breaks for
    // `@Get('/x', AuthMw, RoleGuard("admin"))`. Instead we walk the
    // full balanced arg list ourselves and split on top-level commas.
    const httpDecoratorRe =
      /@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(/gi;
    let match: RegExpExecArray | null;
    while ((match = httpDecoratorRe.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const openParen = match.index + match[0].length - 1;
      const args = extractBalancedArgs(content, openParen);
      const parts = args !== null ? splitTopLevelArgs(args) : [];

      // First arg is the path. May be quoted; strip the quotes.
      let routePath = '/';
      if (parts.length > 0) {
        const raw = parts[0].trim();
        const m = raw.match(/^['"`]([^'"`]*)['"`]$/);
        if (m) routePath = m[1] || '/';
      }
      const lineNumber = this.getLineNumber(content, match.index, lines);

      const sig = findNextMethodSignature(content, match.index);
      if (!sig) continue;

      const route: RouteInfo = {
        path: this.normalizePath(basePath, routePath),
        method: method.toUpperCase() as HttpMethod,
        controller: className,
        controllerMethod: sig.name,
        filePath,
        lineNumber,
      };

      // Trailing decorator args after the path are middleware refs.
      // We record bindings for every identifier-shaped arg so the
      // architecture map can draw a `middleware → controller` edge
      // labelled with the route. Non-identifier args (string registry
      // names, inline arrow functions) are silently skipped — the
      // adapter's runtime collector picks those up later.
      for (const part of parts.slice(1)) {
        const ident = middlewareIdentifierFromArg(part);
        if (!ident) continue;
        this.staticMiddlewareBindings.push({
          middlewareName: ident,
          controllerName: className,
          scope: 'route',
          controllerMethod: sig.name,
        });
      }

      // Detect the request-body parameter and any DTO / schema it names.
      // Handles every form the adapter exposes (decorators are
      // case-insensitive — `Body`/`body`):
      //   @body() x: DtoType                  → type only
      //   @body(Schema) x: DtoType            → schema arg + type
      //   @validatedBody(Schema) x: DtoType   → schema arg + type
      //   @Validate(Schema) @body() x: Type   → schema via @Validate
      // Captured groups for the body decorator:
      //   1 = optional schema identifier passed to the decorator
      //   2 = parameter name (informational)
      //   3 = parameter type (the DTO class / interface name)
      const bodyParamRe =
        /@(?:validatedBody|body)\s*\(\s*([A-Za-z_$][\w.$]*)?\s*(?:,[\s\S]*?)?\)\s*(\w+)\s*\??\s*:\s*([A-Za-z_$][\w.$]*)/i;
      const bodyMatch = sig.params.match(bodyParamRe);
      const validateMatch = sig.params.match(
        /@Validate\s*\(\s*([A-Za-z_$][\w.$]*)/,
      );

      if (bodyMatch || validateMatch) {
        const schemaArg = bodyMatch?.[1]
          ? bodyMatch[1].split('.').pop()
          : undefined;
        const paramType = bodyMatch?.[3]
          ? bodyMatch[3].split('.').pop()
          : undefined;
        const validateArg = validateMatch?.[1]
          ? validateMatch[1].split('.').pop()
          : undefined;

        // Display name: prefer an explicit schema/DTO over the param type.
        const displayName = schemaArg ?? validateArg ?? paramType;
        if (displayName) route.bodyDto = displayName;

        // Resolve a sample from the first candidate that has one. Each is
        // also tried with a leading `I` stripped (interface-prefix convention).
        const candidates = [schemaArg, validateArg, paramType].filter(
          (c): c is string => Boolean(c),
        );
        for (const name of candidates) {
          const sample =
            this.dtoSamples.get(name) ??
            (name.startsWith('I') ? this.dtoSamples.get(name.slice(1)) : undefined);
          if (sample) {
            route.bodySample = sample;
            break;
          }
        }
      }

      routes.push(route);
    }

    return {
      name: className,
      filePath,
      routes,
      dependencies,
    };
  }

  /**
   * Parse service from file content.
   *
   * `declaredClass` is the class name that the caller already verified
   * is paired with an `@provide()` decorator. We use it instead of the
   * first `class \w+` match to avoid mis-tagging unrelated classes (e.g.
   * a test fixture) as services when a single file has more than one.
   */
  private parseService(
    content: string,
    filePath: string,
    declaredClass?: string,
  ): ServiceInfo | null {
    let className: string | null = null;
    if (declaredClass) {
      // Confirm the requested class actually exists in the file before
      // we report it as a service. Belt-and-braces — the caller already
      // matched it against `@provide(...)`.
      const found = new RegExp(`class\\s+${declaredClass}\\b`).test(content);
      if (!found) return null;
      className = declaredClass;
    } else {
      const classMatch = content.match(/class\s+(\w+)/);
      if (!classMatch) return null;
      className = classMatch[1];
    }

    const dependencies: string[] = [];
    const methods: string[] = [];

    // Extract constructor dependencies (same parser as controllers so the
    // service-to-service / service-to-provider edges in the architecture map
    // match the actual TypeScript types instead of parameter names).
    const params = findConstructorParams(content);
    if (params) {
      dependencies.push(...extractParamTypes(params));
    }

    // Pull the specific class body once — used for both method
    // discovery and field-injection extraction.
    const classBodyRe = new RegExp(
      `class\\s+${className}\\b(?:\\s+extends\\s+[\\w.<>,\\s]+)?(?:\\s+implements\\s+[\\w.<>,\\s]+)?\\s*\\{([\\s\\S]*?)\\n\\}`,
    );
    const classBody = content.match(classBodyRe)?.[1] ?? '';

    // Field-injection dependencies — `@inject(Foo) private foo: Foo;`.
    // Required for any service that wires its collaborators via
    // property decorators instead of a constructor.
    if (classBody) {
      for (const dep of extractFieldInjectionTypes(classBody)) {
        if (!dependencies.includes(dep)) dependencies.push(dep);
      }
    }

    // Extract public methods. We scan the specific class body (not the
    // first `class { … }` we find, and not the whole file) and skip JS
    // control-flow keywords so statements like `if (x.is(y)) {` don't
    // get reported as methods (which produced bogus services like
    // "is" with 1 method on the architecture map).
    const KEYWORD_BLOCKLIST = new Set([
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'try',
      'catch',
      'finally',
      'return',
      'throw',
      'new',
      'await',
      'yield',
      'typeof',
      'instanceof',
      'in',
      'of',
      'function',
      'class',
      'this',
      'super',
      'is',
    ]);
    // Method declarations start at the beginning of a line (modulo
    // indentation). Anchoring to ^/`m` flag prevents matches inside
    // expression bodies.
    const methodMatches = classBody.matchAll(
      /^[ \t]*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*\{/gm,
    );
    const seenMethods = new Set<string>();
    for (const match of methodMatches) {
      const methodName = match[1];
      if (
        methodName === 'constructor' ||
        methodName.startsWith('_') ||
        KEYWORD_BLOCKLIST.has(methodName) ||
        seenMethods.has(methodName)
      ) {
        continue;
      }
      seenMethods.add(methodName);
      methods.push(methodName);
    }

    return {
      name: className,
      filePath,
      dependencies,
      methods,
    };
  }

  /** Build the dependency graph */
  private buildDependencyGraph(): void {
    // Set of node names that actually exist in the graph. Edges that
    // target a non-existent node are dangling and will be redirected
    // through `implementsMap` if possible.
    const nodeNames = new Set<string>();
    for (const c of this.controllers) nodeNames.add(c.name);
    for (const s of this.services) nodeNames.add(s.name);
    for (const p of this.providers) nodeNames.add(p.name);
    for (const m of this.middleware) nodeNames.add(m.name);

    // Resolve a raw dependency identifier (an @inject token or declared
    // type name) to the concrete class node when possible. This restores
    // edges for the common pattern where a controller depends on an
    // interface (`IUserService`) that's implemented by a concrete class
    // (`UserService`) registered as the provider.
    const resolveTarget = (raw: string): string => {
      if (nodeNames.has(raw)) return raw;
      const mapped = this.implementsMap.get(raw);
      if (mapped && nodeNames.has(mapped)) return mapped;
      return raw;
    };

    // Add controller -> service dependencies
    for (const controller of this.controllers) {
      for (const dep of controller.dependencies) {
        this.dependencies.push({
          source: controller.name,
          target: resolveTarget(dep),
          type: 'controller',
        });
      }
    }

    // Add service -> service/provider dependencies
    for (const service of [...this.services, ...this.providers]) {
      for (const dep of service.dependencies) {
        this.dependencies.push({
          source: service.name,
          target: resolveTarget(dep),
          type: service.name.toLowerCase().includes('provider')
            ? 'provider'
            : 'service',
        });
      }
    }

    // Add middleware -> controller edges from the static decorator
    // scan. Direction is middleware → controller because the
    // architecture map reads them as "this middleware protects /
    // wraps that controller", which matches the request flow.
    //
    // Bindings whose middleware identifier doesn't resolve to a known
    // class node are skipped silently. Common reasons:
    //   - imported from a third-party package the scanner doesn't
    //     reach (e.g. `helmet`, `cors`)
    //   - bound by string registry name (`use('auth')`) — the runtime
    //     collector will surface those instead.
    const seenMiddlewareEdge = new Set<string>();
    for (const binding of this.staticMiddlewareBindings) {
      const sourceName = binding.middlewareName;
      if (!nodeNames.has(sourceName)) continue;
      if (!nodeNames.has(binding.controllerName)) continue;
      const key = `${sourceName}->${binding.controllerName}@${binding.scope}`;
      if (seenMiddlewareEdge.has(key)) continue;
      seenMiddlewareEdge.add(key);

      this.dependencies.push({
        source: sourceName,
        target: binding.controllerName,
        type: 'middleware',
      });

      // Promote the middleware's scope based on how it's wired.
      // `controller` overrides `route` because a middleware applied at
      // both levels is most usefully described as controller-scoped.
      const mw = this.middleware.find((m) => m.name === sourceName);
      if (mw) {
        if (binding.scope === 'controller') {
          mw.scope = 'controller';
        } else if (mw.scope !== 'controller') {
          mw.scope = 'route';
        }
      }
    }
  }

  /** Get line number for a position in content */
  private getLineNumber(_content: string, position: number, lines: string[]): number {
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 for newline
      if (currentPos > position) {
        return i + 1;
      }
    }
    return lines.length;
  }

  /** Normalize and combine paths */
  private normalizePath(basePath: string, routePath: string): string {
    // Ensure basePath starts with /
    if (!basePath.startsWith('/')) {
      basePath = '/' + basePath;
    }
    // Handle empty routePath
    if (!routePath || routePath === '/') {
      return basePath;
    }
    // Ensure routePath starts with /
    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }
    // Combine paths, avoiding double slashes
    return (basePath + routePath).replace(/\/+/g, '/');
  }

  /**
   * Scan a live Express application's router stack for routes.
   *
   * Complements the static scan: picks up handlers registered ad-hoc via
   * `app.get(...)` outside decorated controllers. Compatible with both
   * Express 4 (`app._router`) and Express 5 (`app.router`). Only the
   * seven standard HTTP methods are reported, and catch-all paths are
   * skipped.
   *
   * @param app - The Express application instance to inspect.
   * @returns Routes found in the router stack, with `controller` and
   *   `controllerMethod` set to "Unknown" (runtime layers carry no class
   *   information). Empty when the app or its router is unavailable.
   */
  static scanExpressApp(app: any): RouteInfo[] {
    const routes: RouteInfo[] = [];

    // Express 5 renamed `app._router` to `app.router`. Fall back gracefully
    // so the agent stays compatible with both major versions.
    const router = app?._router ?? app?.router;
    if (!app || !router?.stack) {
      return routes;
    }

    // Standard HTTP-7. Anything outside this set (ACL, BIND, CHECKOUT,
    // M-SEARCH, PROPFIND, SUBSCRIBE, …) is a low-level WebDAV / IETF
    // extension verb. Express's underlying `methods` library exposes them
    // all by default, which made the API client's "Discovered routes"
    // chips list 30+ entries per `app.use(middleware)` layer. Filtering
    // here keeps the picker focused on what users actually expose.
    const STANDARD_METHODS = new Set<HttpMethod>([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
    ]);

    const extractRoutes = (stack: any[], basePath: string = '') => {
      for (const layer of stack) {
        if (layer.route) {
          const route = layer.route;
          // Skip catch-all paths registered as routes. Those are almost
          // always framework / middleware artefacts (e.g. `app.use(...)`
          // promoted to a route in some Express 5 builds), not user
          // endpoints worth surfacing in the API client.
          if (!route.path || route.path === '*' || route.path === '/*') {
            continue;
          }

          const methods = Object.keys(route.methods)
            .filter((m) => route.methods[m])
            .map((m) => m.toUpperCase() as HttpMethod)
            .filter((m) => STANDARD_METHODS.has(m));

          for (const method of methods) {
            routes.push({
              path: basePath + route.path,
              method,
              controller: 'Unknown',
              controllerMethod: 'Unknown',
            });
          }
        } else if (layer.name === 'router' && layer.handle?.stack) {
          // This is a nested router. Express 5 attaches the mount path
          // directly as `layer.path` (a literal string like `/api`), so
          // we prefer that. Older Express 4 layers only exposed
          // `layer.regexp`, which we still parse as a fallback.
          //
          // Both fields can legitimately be missing — e.g. when the
          // router is mounted at the root (`app.use(router)`), Express
          // 5 omits `regexp` entirely. Treating that as an empty
          // prefix is correct; trying to read `.source` blew up the
          // whole scan with "Cannot read properties of undefined".
          let routerPath = '';
          if (typeof layer.path === 'string') {
            routerPath = layer.path;
          } else if (layer.regexp?.source) {
            routerPath = layer.regexp.source
              .replace('\\/?(?=\\/|$)', '')
              .replace(/\\\//g, '/')
              .replace(/\^/g, '')
              .replace(/\$/g, '')
              .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
          }

          extractRoutes(layer.handle.stack, basePath + routerPath);
        }
      }
    };

    extractRoutes(router.stack);
    return routes;
  }
}
