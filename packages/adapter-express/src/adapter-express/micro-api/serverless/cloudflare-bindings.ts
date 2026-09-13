/**
 * Typed Cloudflare binding providers for the micro API.
 *
 * A Worker receives its bindings (KV namespaces, D1 databases, R2 buckets,
 * Queue producers) on the `env` object passed to every `fetch()`. Handlers
 * can read `req.cloudflare.env.MY_KV` directly, but that couples every route
 * to the binding name and loses the type. Binding tokens decouple the two:
 *
 * ```ts
 * interface Env { SETTINGS: KVNamespace }
 *
 * const bindings = cloudflareBindings<Env>();
 * const Settings = bindings.kv("SETTINGS");
 *
 * const app = micro<CloudflareRequest<Env>>();
 * app.get("/theme", async (req) => ({
 *   theme: await req.services.get(Settings).get("theme"),
 * }));
 * ```
 *
 * Tokens hold only a binding name and kind, so they are safe to create at
 * module scope. Values are resolved from the *current request's* `env` each
 * time `req.services.get()` is called; nothing is cached across requests,
 * which matters on Workers where module-scope state must not carry
 * per-request data.
 */

export type CloudflareBindingKind = "kv" | "d1" | "r2" | "queue";

const TOKEN_BRAND: unique symbol = Symbol.for(
  "@expressots/adapter-express/cloudflare-binding-token",
);

/**
 * Methods that identify each binding kind, taken from Cloudflare's runtime
 * interfaces. Kind detection is structural: a value counts as a KV namespace
 * because it has `getWithMetadata`, not because of its declared type. A
 * value that matches more than one kind is treated as ambiguous and matches
 * none, so an explicit `Env` type gives exact, unambiguous key checking.
 */
interface KindSignatures {
  kv: "getWithMetadata";
  d1: "prepare" | "batch" | "exec";
  r2: "head" | "createMultipartUpload";
  queue: "send" | "sendBatch";
}

type HasMethods<T, M extends PropertyKey> = [M] extends [keyof T]
  ? T[M] extends (...args: Array<never>) => unknown
    ? true
    : false
  : false;

type KindsOf<T> = {
  [K in CloudflareBindingKind]: HasMethods<T, KindSignatures[K]> extends true ? K : never;
}[CloudflareBindingKind];

type KeysOfKind<TEnv, K extends CloudflareBindingKind> = {
  [P in keyof TEnv]-?: [KindsOf<TEnv[P]>] extends [K]
    ? [K] extends [KindsOf<TEnv[P]>]
      ? P
      : never
    : never;
}[keyof TEnv] &
  string;

/**
 * Binding names accepted for a kind. With an explicit `Env` only keys whose
 * value structurally matches that kind are accepted; with a string-keyed env
 * (the default `CloudflareEnv`) any name is accepted, for applications whose
 * bindings are configured dynamically.
 */
export type CloudflareBindingName<TEnv, K extends CloudflareBindingKind> = string extends keyof TEnv
  ? string
  : KeysOfKind<TEnv, K>;

type ValueOf<TEnv, Name extends string> = Name extends keyof TEnv ? TEnv[Name] : unknown;

/**
 * A reference to one Worker binding. Carries the value type as a phantom
 * parameter so `services.get()` returns the exact binding type.
 */
export interface CloudflareBindingToken<T> {
  readonly [TOKEN_BRAND]: true;
  readonly kind: CloudflareBindingKind;
  readonly name: string;
  /** Phantom type carrier; never assigned at runtime. */
  readonly __value?: T;
}

/**
 * Per-request accessor for binding values, installed on `req.services` by
 * `cloudflareAdapter`.
 */
export interface CloudflareServices {
  /** Resolve a binding from the current request's environment. */
  get<T>(token: CloudflareBindingToken<T>): T;
  /** Whether the current request's environment carries this binding. */
  has(token: CloudflareBindingToken<unknown>): boolean;
}

/** Token factories for one `Env` shape. Create with `cloudflareBindings<Env>()`. */
export interface CloudflareBindings<TEnv extends object> {
  kv<Name extends CloudflareBindingName<TEnv, "kv">>(
    name: Name,
  ): CloudflareBindingToken<ValueOf<TEnv, Name>>;
  d1<Name extends CloudflareBindingName<TEnv, "d1">>(
    name: Name,
  ): CloudflareBindingToken<ValueOf<TEnv, Name>>;
  r2<Name extends CloudflareBindingName<TEnv, "r2">>(
    name: Name,
  ): CloudflareBindingToken<ValueOf<TEnv, Name>>;
  queue<Name extends CloudflareBindingName<TEnv, "queue">>(
    name: Name,
  ): CloudflareBindingToken<ValueOf<TEnv, Name>>;
}

/**
 * Thrown by `req.services.get()` when the current request's environment has
 * no binding under the token's name. Usually a `wrangler.toml` binding that
 * was renamed or not declared for this environment.
 */
export class CloudflareBindingNotFoundError extends Error {
  public readonly code = "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND";
  public readonly bindingName: string;
  public readonly bindingKind: CloudflareBindingKind;

  public constructor(token: CloudflareBindingToken<unknown>) {
    super(
      `Cloudflare ${token.kind} binding "${token.name}" is not present in this Worker's environment. ` +
        `Declare it in wrangler.toml under the matching section.`,
    );
    this.name = "CloudflareBindingNotFoundError";
    this.bindingName = token.name;
    this.bindingKind = token.kind;
  }
}

// One cache per kind: the same name can legitimately be a KV namespace in
// one app and a queue in another, and tokens compare by identity.
const tokenCache: Record<CloudflareBindingKind, Map<string, CloudflareBindingToken<unknown>>> = {
  kv: new Map(),
  d1: new Map(),
  r2: new Map(),
  queue: new Map(),
};

function token<T>(kind: CloudflareBindingKind, name: string): CloudflareBindingToken<T> {
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError(`Cloudflare ${kind} binding name must be a non-empty string`);
  }

  const cache = tokenCache[kind];
  const existing = cache.get(name);
  if (existing) {
    return existing as CloudflareBindingToken<T>;
  }

  const created: CloudflareBindingToken<T> = Object.freeze({
    [TOKEN_BRAND]: true as const,
    kind,
    name,
  });
  cache.set(name, created);
  return created;
}

/**
 * A token is valid only if it is the instance `cloudflareBindings()` minted
 * for that kind and name. Checking identity against the cache rather than
 * shape means a structural copy (`{ ...token }`) or a hand-built object is
 * rejected, so the only way to obtain a token is through the typed factory.
 */
function isBindingToken(value: unknown): value is CloudflareBindingToken<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CloudflareBindingToken<unknown>>;
  if (candidate[TOKEN_BRAND] !== true || typeof candidate.name !== "string") return false;
  if (!Object.prototype.hasOwnProperty.call(tokenCache, candidate.kind as string)) return false;
  return tokenCache[candidate.kind as CloudflareBindingKind].get(candidate.name) === value;
}

function assertBindingToken(value: unknown): asserts value is CloudflareBindingToken<unknown> {
  if (!isBindingToken(value)) {
    throw new TypeError(
      "req.services.get() expects a token created by cloudflareBindings(); " +
        "pass the token, not the binding name",
    );
  }
}

/**
 * Create token factories for an `Env` shape.
 *
 * Tokens are memoized by kind and name, so calling this in more than one
 * module (or inside a handler) returns the same frozen token objects.
 */
export function cloudflareBindings<
  TEnv extends object = Record<string, unknown>,
>(): CloudflareBindings<TEnv> {
  return {
    kv: (name) => token("kv", name),
    d1: (name) => token("d1", name),
    r2: (name) => token("r2", name),
    queue: (name) => token("queue", name),
  };
}

/**
 * Build the `req.services` accessor for one request's environment.
 *
 * Only own properties of `env` count as bindings: workerd hands the Worker a
 * plain object, so an inherited name such as `toString` is never a binding
 * and must not be handed to a handler as one.
 *
 * @internal Used by `cloudflareAdapter`; exported for tests.
 */
export function createCloudflareServices(env: object): CloudflareServices {
  const resolve = (candidate: unknown): { found: boolean; value: unknown } => {
    assertBindingToken(candidate);
    if (!Object.prototype.hasOwnProperty.call(env, candidate.name)) {
      return { found: false, value: undefined };
    }
    const value = (env as Record<string, unknown>)[candidate.name];
    return { found: value !== undefined, value };
  };

  return {
    get<T>(candidate: CloudflareBindingToken<T>): T {
      const { found, value } = resolve(candidate);
      if (!found) {
        throw new CloudflareBindingNotFoundError(candidate);
      }
      return value as T;
    },
    has(candidate: CloudflareBindingToken<unknown>): boolean {
      return resolve(candidate).found;
    },
  };
}
